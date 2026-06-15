import fs from 'fs';
import * as vscode from 'vscode';
import { getNonce } from '../configuration';
import { writeLog } from '../logger/logger';

// ---------------------------------------------------------------------------
// Shared webview HTML builder
// ---------------------------------------------------------------------------

/**
 * Builds the standard single-page HTML shell used by every fetch-client
 * webview panel and sidebar view.
 *
 * Includes a Content-Security-Policy that:
 *   – allows only the bundled script (identified by a per-load nonce)
 *   – allows styles from the extension's webview origin and inline styles
 *     (needed by some CSS-in-JS patterns inside the React bundle)
 *   – allows images / fonts served from the extension origin or data URIs
 */
export function buildWebviewHtml(
	webview: vscode.Webview,
	extensionUri: vscode.Uri,
	title: string
): string {
	const nonce = getNonce();
	const scriptUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'dist/fetch-client-ui.js')
	);
	const styleUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'dist/main.css')
	);

	// 'unsafe-eval' is required when webpack dev builds use eval-based source maps.
	// For production bundles this flag is a no-op security concern.
	const csp = [
		`default-src 'none'`,
		`style-src ${webview.cspSource} 'unsafe-inline'`,
		`script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval'`,
		// `worker-src ${webview.cspSource} blob: vscode-webview:`,
		`worker-src blob:`,
		`connect-src ${webview.cspSource}`,
		`img-src ${webview.cspSource} https: data:`,
		`font-src ${webview.cspSource} data:`,
	].join('; ');

	return `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta http-equiv="Content-Security-Policy" content="${csp}">
		<link href="${styleUri}" rel="stylesheet" type="text/css"/>
		<title>${title}</title>
	</head>
	<body>
		<noscript>You need to enable JavaScript to run this app.</noscript>
		<div id="root"></div>
		<script nonce="${nonce}" src="${scriptUri}"></script>
	</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Shared file-save helper
// ---------------------------------------------------------------------------

/**
 * Opens a Save dialog, writes `data` to the chosen path, and shows a
 * success / failure notification.  Calling code stays free of repetitive
 * try/catch + showErrorMessage boilerplate.
 */
export async function saveToFile(
	defaultUri: vscode.Uri,
	data: string | Uint8Array,
	logContext: string,
	saveDialogOptions?: Omit<vscode.SaveDialogOptions, 'defaultUri'>
): Promise<void> {
	const uri = await vscode.window.showSaveDialog({ defaultUri, ...saveDialogOptions });
	if (!uri) {
		return;
	}
	try {
		await fs.promises.writeFile(uri.fsPath, data);
		vscode.window.showInformationMessage(
			`Successfully saved to '${uri.fsPath}'.`,
			{ modal: true }
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		vscode.window.showErrorMessage(
			`Could not save to '${uri.fsPath}'. Error: ${msg}`,
			{ modal: true }
		);
		writeLog(`error::${logContext}::writeFile() ${msg}`);
	}
}
