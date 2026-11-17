/**
 * Typed HTTP client with timeout and explicit error handling.
 *
 * Runtime failures are returned as Result<T, HttpClientError>.
 * Invalid timeout configuration is a programmer error and rejects
 * the returned Promise with RangeError.
 *
 * Response bodies are currently buffered fully in memory. A configurable
 * maxResponseBytes limit can be added as a future enhancement.
 */

import {
	err,
	ok,
	DEFAULT_TIMEOUT_MS,
	MAX_TIMEOUT_MS,
	type HttpClientError,
	type RequestBody,
	type RequestOptions,
	type Result,
} from "./http-client.types";

export async function request<T>(
	url: string,
	options: RequestOptions<T> = {},
): Promise<Result<T, HttpClientError>> {
	const {
		method = "GET",
		headers = {},
		body,
		timeoutMs = DEFAULT_TIMEOUT_MS,
		signal: callerSignal,
		parse,
	} = options;

	// Invalid timeout is a programmer/configuration error.
	if (
		!Number.isFinite(timeoutMs) ||
		timeoutMs <= 0 ||
		timeoutMs > MAX_TIMEOUT_MS
	) {
		throw new RangeError(
			`timeoutMs must be a positive finite number <= ${MAX_TIMEOUT_MS}, got ${timeoutMs}`,
		);
	}

	// Do not create a timer or start a request if already cancelled.
	if (callerSignal?.aborted) {
		return err({ kind: "aborted" });
	}

	const controller = new AbortController();
	let timedOut = false;

	const timer = setTimeout(() => {
		timedOut = true;
		controller.abort();
	}, timeoutMs);

	const onCallerAbort = () => controller.abort();

	callerSignal?.addEventListener("abort", onCallerAbort, { once: true });

	// Defensive recheck after listener registration.
	if (callerSignal?.aborted) {
		controller.abort();
	}

	const toAbortOrNetwork = (cause: unknown) => {
		if (timedOut) {
			return err<HttpClientError>({ kind: "timeout", timeoutMs });
		}

		if (controller.signal.aborted) {
			return err<HttpClientError>({ kind: "aborted" });
		}

		return err<HttpClientError>({
			kind: "network",
			message: cause instanceof Error ? cause.message : String(cause),
			cause,
		});
	};

	try {
		let requestParts: {
			headers: Headers;
			payload: BodyInit | undefined;
		};

		try {
			requestParts = buildRequest(headers, body);
		} catch (cause) {
			return err({
				kind: "request",
				message:
					cause instanceof Error ? cause.message : "Unable to prepare request",
				cause,
			});
		}

		let response: Response;

		try {
			response = await fetch(url, {
				method,
				headers: requestParts.headers,
				body: requestParts.payload,
				signal: controller.signal,
			});
		} catch (cause) {
			return toAbortOrNetwork(cause);
		}

		// Keep the timeout active while reading the response body.
		let text: string;

		try {
			text = await response.text();
		} catch (cause) {
			return toAbortOrNetwork(cause);
		}

		if (!response.ok) {
			return err({
				kind: "http",
				status: response.status,
				statusText: response.statusText,
				body: tryJson(text),
			});
		}

		let raw: unknown;

		if (text === "") {
			raw = undefined;
		} else {
			try {
				raw = JSON.parse(text);
			} catch {
				return err({
					kind: "parse",
					message: "Response body is not valid JSON",
				});
			}
		}

		if (!parse) {
			return ok(raw as T);
		}

		try {
			return ok(parse(raw));
		} catch (cause) {
			return err({
				kind: "parse",
				message: cause instanceof Error ? cause.message : "Validation failed",
			});
		}
	} finally {
		clearTimeout(timer);
		callerSignal?.removeEventListener("abort", onCallerAbort);
	}
}

/** Encodes the request body and deliberately manages Content-Type. */
function buildRequest(
	userHeaders: Record<string, string>,
	body: RequestBody | undefined,
): { headers: Headers; payload: BodyInit | undefined } {
	const headers = new Headers(userHeaders);

	if (!headers.has("Accept")) {
		headers.set("Accept", "application/json");
	}

	if (body === undefined) {
		return { headers, payload: undefined };
	}

	switch (body.kind) {
		case "json": {
			const payload = JSON.stringify(body.data);

			if (payload === undefined) {
				throw new TypeError("JSON request body is not serializable");
			}

			if (!headers.has("Content-Type")) {
				headers.set("Content-Type", "application/json");
			}

			return { headers, payload };
		}

		case "text":
			if (body.contentType) {
				headers.set("Content-Type", body.contentType);
			} else if (!headers.has("Content-Type")) {
				headers.set("Content-Type", "text/plain;charset=UTF-8");
			}

			return { headers, payload: body.data };

		case "form":
			// Fetch must generate the multipart boundary itself.
			headers.delete("Content-Type");
			return { headers, payload: body.data };
	}
}

function tryJson(text: string): unknown {
	if (text === "") {
		return undefined;
	}

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

export const get = <T>(
	url: string,
	options?: Omit<RequestOptions<T>, "method" | "body">,
) => request<T>(url, { ...options, method: "GET" });

export const post = <T>(
	url: string,
	body: RequestBody,
	options?: Omit<RequestOptions<T>, "method" | "body">,
) => request<T>(url, { ...options, method: "POST", body });

export function describeError(error: HttpClientError): string {
	switch (error.kind) {
		case "http":
			return `HTTP ${error.status} ${error.statusText}`;

		case "network":
			return `Network error: ${error.message}`;

		case "timeout":
			return `Timed out after ${error.timeoutMs} ms`;

		case "aborted":
			return "Request was cancelled";

		case "parse":
			return `Bad response: ${error.message}`;

		case "request":
			return `Request error: ${error.message}`;
	}
}
