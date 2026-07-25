import { createHash, randomBytes } from "crypto";
import * as vscode from "vscode";
import { replaceDataWithVariable } from "../fetch-client-core/helpers/variable.server.helper";
import { CodeChallengeMethod } from "../fetch-client-core/types/auth.types";

interface OAuthAuthorizationRequest {
	authorizationUrl: string;
	clientId: string;
	scope: string;
	audience?: string;
	resource?: string;
	usePkce: boolean;
	codeChallengeMethod?: CodeChallengeMethod;
	variableData?: Record<string, string>;
}

interface PendingAuthorization {
	webview: vscode.Webview;
	codeVerifier?: string;
	redirectUri: string;
}

/** Handles browser redirects for OAuth authorization-code requests. */
export class OAuthAuthorizationService implements vscode.UriHandler, vscode.Disposable {
	private readonly pending = new Map<string, PendingAuthorization>();

	constructor(private readonly context: vscode.ExtensionContext) { }

	async start(
		webview: vscode.Webview,
		request: OAuthAuthorizationRequest,
	): Promise<void> {
		try {
			const variables = request.variableData ?? {};
			const authorizationUrl = await replaceDataWithVariable(request.authorizationUrl, variables);
			const clientId = await replaceDataWithVariable(request.clientId, variables);
			if (!authorizationUrl || !clientId) {
				throw new Error("Authorization URL and Client ID are required.");
			}

			const callback = vscode.Uri.parse(
				`${vscode.env.uriScheme}://${this.context.extension.id}/oauth/callback`,
			);

			const externalUri = await vscode.env.asExternalUri(callback);
			const redirectUri = externalUri.toString();
			const state = randomBytes(32).toString("base64url");
			const url = new URL(authorizationUrl);
			url.searchParams.set("response_type", "code");
			url.searchParams.set("client_id", clientId);
			url.searchParams.set("redirect_uri", redirectUri);
			url.searchParams.set("state", state);
			let codeVerifier: string | undefined;
			if (request.usePkce) {
				codeVerifier = randomBytes(48).toString("base64url");
				const method = request.codeChallengeMethod ?? CodeChallengeMethod.S256;
				const codeChallenge = method === CodeChallengeMethod.S256
					? createHash("sha256").update(codeVerifier).digest("base64url")
					: codeVerifier;
				url.searchParams.set("code_challenge", codeChallenge);
				url.searchParams.set("code_challenge_method", method);
			}

			const scope = await replaceDataWithVariable(request.scope, variables);
			const audience = await replaceDataWithVariable(request.audience ?? "", variables);
			const resource = await replaceDataWithVariable(request.resource ?? "", variables);
			if (scope) {
				url.searchParams.set("scope", scope);
			}
			if (audience) {
				url.searchParams.set("audience", audience);
			}
			if (resource) {
				url.searchParams.set("resource", resource);
			}

			this.pending.set(state, { webview, codeVerifier, redirectUri });
			await webview.postMessage({ type: "oauthAuthorizationStarted", redirectUri });
			await vscode.env.openExternal(vscode.Uri.parse(url.toString()));
		} catch (error) {
			this.postError(webview, error);
		}
	}

	handleUri(uri: vscode.Uri): void {
		const state = uri.query ? new URLSearchParams(uri.query).get("state") : undefined;
		const pending = state ? this.pending.get(state) : undefined;
		if (!pending) {
			return;
		}
		this.pending.delete(state!);

		const params = new URLSearchParams(uri.query);
		const error = params.get("error");
		const code = params.get("code");
		if (error || !code) {
			this.postError(pending.webview, error ?? "The authorization server did not return a code.");
			return;
		}
		pending.webview.postMessage({
			type: "oauthAuthorizationCode",
			code,
			...(pending.codeVerifier && { codeVerifier: pending.codeVerifier }),
			redirectUri: pending.redirectUri,
		});
	}

	dispose(): void {
		this.pending.clear();
	}

	private postError(webview: vscode.Webview, error: unknown): void {
		const message = error instanceof Error ? error.message : String(error);
		webview.postMessage({ type: "oauthAuthorizationError", error: message });
	}
}
