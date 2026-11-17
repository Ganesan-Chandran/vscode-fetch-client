/**
 * Shared types and contracts for the typed HTTP client.
 */

export type Ok<T> = { ok: true; data: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(data: T): Ok<T> => ({ ok: true, data });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

/** Server answered, but with a non-2xx status (404, 500, ...). */
export interface HttpStatusError {
	kind: "http";
	status: number;
	statusText: string;
	/** Parsed JSON body if the server sent JSON, otherwise raw text. */
	body: unknown;
}

/** Request never got a response: DNS failure, connection refused/reset, offline. */
export interface NetworkError {
	kind: "network";
	message: string;
	cause?: unknown;
}

/** Our own timer fired before the response (headers + body) finished. */
export interface TimeoutError {
	kind: "timeout";
	timeoutMs: number;
}

/** The caller aborted via their own AbortSignal. */
export interface AbortedError {
	kind: "aborted";
}

/** Response was 2xx but the body was not valid JSON or failed validation. */
export interface ParseError {
	kind: "parse";
	message: string;
}

/** The outgoing request could not be prepared or serialized. */
export interface RequestError {
	kind: "request";
	message: string;
	cause?: unknown;
}

export type HttpClientError =
	| HttpStatusError
	| NetworkError
	| TimeoutError
	| AbortedError
	| ParseError
	| RequestError;

/** Explicit body types. Each one decides its own encoding and Content-Type. */
export type RequestBody =
	| { kind: "json"; data: unknown }
	| { kind: "text"; data: string; contentType?: string }
	| { kind: "form"; data: FormData };

export const jsonBody = (data: unknown): RequestBody => ({
	kind: "json",
	data,
});

export const textBody = (data: string, contentType?: string): RequestBody => ({
	kind: "text",
	data,
	...(contentType !== undefined ? { contentType } : {}),
});

export const formBody = (data: FormData): RequestBody => ({
	kind: "form",
	data,
});

export interface RequestOptions<T> {
	method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
	headers?: Record<string, string>;
	body?: RequestBody;
	/** Default 5000 ms. Must be positive, finite and <= MAX_TIMEOUT_MS. */
	timeoutMs?: number;
	/** Optional caller-controlled cancellation. */
	signal?: AbortSignal;
	/**
	 * Converts untyped JSON (`unknown`) into T.
	 * Throw to signal invalid data. Without it, JSON is cast to T
	 * without runtime validation.
	 */
	parse?: (raw: unknown) => T;
}

export const DEFAULT_TIMEOUT_MS = 5000;

/** setTimeout delays are limited to a signed 32-bit integer. */
export const MAX_TIMEOUT_MS = 2_147_483_647;
