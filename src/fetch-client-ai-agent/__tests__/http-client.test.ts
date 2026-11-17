import { afterEach, describe, expect, it, vi } from "vitest";

import { describeError, get, jsonBody, post, request } from "../core/http";
import type { HttpClientError } from "../core/http";

function jsonResponse(
	data: unknown,
	init: ResponseInit = { status: 200 },
): Response {
	return new Response(JSON.stringify(data), {
		...init,
		headers: {
			"Content-Type": "application/json",
			...init.headers,
		},
	});
}

function waitForAbort(signal: AbortSignal): Promise<never> {
	return new Promise((_, reject) => {
		if (signal.aborted) {
			reject(new DOMException("The operation was aborted", "AbortError"));
			return;
		}

		signal.addEventListener(
			"abort",
			() => reject(new DOMException("The operation was aborted", "AbortError")),
			{ once: true },
		);
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("HTTP client", () => {
	it("returns parsed data for a successful JSON response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(jsonResponse({ id: 1, name: "Ada" })),
		);

		const result = await get<{ id: number; name: string }>(
			"https://example.test/users/1",
		);

		expect(result).toEqual({
			ok: true,
			data: { id: 1, name: "Ada" },
		});
	});

	it("returns an HTTP error and preserves a JSON error body", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					jsonResponse(
						{ message: "Not found" },
						{ status: 404, statusText: "Not Found" },
					),
				),
		);

		const result = await get("https://example.test/missing");

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toMatchObject({
				kind: "http",
				status: 404,
				statusText: "Not Found",
				body: { message: "Not found" },
			});
		}
	});

	it("preserves a plain-text HTTP error body", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response("upstream unavailable", {
					status: 503,
					statusText: "Service Unavailable",
				}),
			),
		);

		const result = await request("https://example.test/unavailable");

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toMatchObject({
				kind: "http",
				status: 503,
				body: "upstream unavailable",
			});
		}
	});

	it("returns a parse error when a successful response contains invalid JSON", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(new Response("{ invalid json", { status: 200 })),
		);

		const result = await get("https://example.test/invalid-json");

		expect(result).toEqual({
			ok: false,
			error: {
				kind: "parse",
				message: "Response body is not valid JSON",
			},
		});
	});

	it("returns a parse error when the caller's validator throws", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(jsonResponse({ id: "bad" })),
		);

		const result = await request<{ id: number }>("https://example.test/user", {
			parse: () => {
				throw new Error("id must be a number");
			},
		});

		expect(result).toEqual({
			ok: false,
			error: { kind: "parse", message: "id must be a number" },
		});
	});

	it("returns a network error when fetch rejects without cancellation", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
		);

		const result = await get("https://example.test/offline");

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.kind).toBe("network");
			expect(result.error.message).toBe("Failed to fetch");
		}
	});

	it("returns a timeout error when fetch does not complete in time", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
				return waitForAbort(init!.signal as AbortSignal);
			}),
		);

		const result = await request("https://example.test/slow", {
			timeoutMs: 15,
		});

		expect(result).toEqual({
			ok: false,
			error: { kind: "timeout", timeoutMs: 15 },
		});
	});

	it("returns a timeout error when reading the response body stalls", async () => {
		const response = {
			ok: true,
			status: 200,
			statusText: "OK",
			text: vi.fn(
				(_encoding?: string) =>
					new Promise<string>((_, reject) => {
						// Simulate a response body stream that rejects when its request is aborted.
						// The fetch mock captures the signal and wires it up below.
						activeSignal!.addEventListener(
							"abort",
							() => reject(new DOMException("Aborted", "AbortError")),
							{ once: true },
						);
					}),
			),
		} as unknown as Response;

		let activeSignal: AbortSignal;

		vi.stubGlobal(
			"fetch",
			vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
				activeSignal = init!.signal as AbortSignal;
				return Promise.resolve(response);
			}),
		);

		const result = await request("https://example.test/stalled-body", {
			timeoutMs: 15,
		});

		expect(result).toEqual({
			ok: false,
			error: { kind: "timeout", timeoutMs: 15 },
		});
	});

	it("returns aborted when the caller signal is already aborted", async () => {
		const controller = new AbortController();
		controller.abort();

		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const result = await get("https://example.test/cancelled", {
			signal: controller.signal,
		});

		expect(result).toEqual({
			ok: false,
			error: { kind: "aborted" },
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns aborted when the caller cancels an in-flight request", async () => {
		const controller = new AbortController();

		vi.stubGlobal(
			"fetch",
			vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
				return waitForAbort(init!.signal as AbortSignal);
			}),
		);

		const pending = get("https://example.test/cancel", {
			timeoutMs: 1000,
			signal: controller.signal,
		});

		controller.abort();

		const result = await pending;

		expect(result).toEqual({
			ok: false,
			error: { kind: "aborted" },
		});
	});

	it("returns success with undefined data for a 204 response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
		);

		const result = await get<void>("https://example.test/no-content");

		expect(result).toEqual({ ok: true, data: undefined });
	});

	it("rejects with RangeError for invalid timeout configuration", async () => {
		await expect(
			request("https://example.test", { timeoutMs: 0 }),
		).rejects.toBeInstanceOf(RangeError);

		await expect(
			request("https://example.test", { timeoutMs: -1 }),
		).rejects.toBeInstanceOf(RangeError);

		await expect(
			request("https://example.test", { timeoutMs: Number.POSITIVE_INFINITY }),
		).rejects.toBeInstanceOf(RangeError);
	});

	it("returns a request error when JSON serialization fails", async () => {
		const circular: { self?: unknown } = {};
		circular.self = circular;

		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const result = await post("https://example.test/data", jsonBody(circular));

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.kind).toBe("request");
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("sets JSON Content-Type and serializes a JSON body", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({ created: true }));
		vi.stubGlobal("fetch", fetchMock);

		await post("https://example.test/users", jsonBody({ name: "Ada" }));

		const init = fetchMock.mock.calls[0][1] as RequestInit;
		const headers = new Headers(init.headers);

		expect(headers.get("Content-Type")).toBe("application/json");
		expect(init.body).toBe(JSON.stringify({ name: "Ada" }));
	});

	it("does not set multipart Content-Type for FormData", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(jsonResponse({ uploaded: true }));
		vi.stubGlobal("fetch", fetchMock);

		const form = new FormData();
		form.append("name", "Ada");

		await post("https://example.test/upload", {
			kind: "form",
			data: form,
		});

		const init = fetchMock.mock.calls[0][1] as RequestInit;
		const headers = new Headers(init.headers);

		expect(headers.has("Content-Type")).toBe(false);
		expect(init.body).toBe(form);
	});

	it("formats each HTTP client error kind into a readable message", () => {
		const cases: Array<[HttpClientError, string]> = [
			[
				{
					kind: "http",
					status: 429,
					statusText: "Too Many Requests",
					body: null,
				},
				"HTTP 429 Too Many Requests",
			],
			[{ kind: "network", message: "offline" }, "Network error: offline"],
			[{ kind: "timeout", timeoutMs: 1000 }, "Timed out after 1000 ms"],
			[{ kind: "aborted" }, "Request was cancelled"],
			[
				{ kind: "parse", message: "invalid JSON" },
				"Bad response: invalid JSON",
			],
			[
				{ kind: "request", message: "cannot serialize" },
				"Request error: cannot serialize",
			],
		];

		for (const [error, expected] of cases) {
			expect(describeError(error)).toBe(expected);
		}
	});
});
