import { describe, it, expect, vi } from "vitest";
import {
	OllamaProvider,
	parseOllamaChatResponse,
	OllamaProviderOptions,
} from "../../../../../fetch-client-ai-agent/adapters/llm/ollama/ollama-provider";
import {
	LLMProviderError,
	type AgentMessage,
	type ToolDefinition,
} from "../../../../../fetch-client-ai-agent/types/agent-contracts";

describe("OllamaProvider", () => {
	const defaultOptions: OllamaProviderOptions = {
		baseUrl: "http://localhost:11434",
		model: "llama3.2",
	};

	function createMockResponse(
		body: unknown,
		status = 200,
		statusText = "OK",
	): Response {
		return {
			ok: status >= 200 && status < 300,
			status,
			statusText,
			json: vi.fn().mockImplementation(async () => {
				if (typeof body === "string") {
					throw new SyntaxError("Unexpected token");
				}
				return body;
			}),
		} as unknown as Response;
	}

	describe("constructor", () => {
		it("initializes with provided options and custom fetch", () => {
			const mockFetch = vi.fn();
			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});
			expect(provider).toBeDefined();
		});

		it("falls back to global fetch when fetch option is not provided", () => {
			const provider = new OllamaProvider(defaultOptions);
			expect(provider).toBeDefined();
		});
	});

	describe("generateResponse", () => {
		it("sends chat request and parses assistant text response successfully", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				createMockResponse({
					model: "llama3.2",
					message: { role: "assistant", content: "Hello! How can I help you?" },
					done: true,
				}),
			);

			const provider = new OllamaProvider({
				baseUrl: "http://localhost:11434/",
				model: "llama3.2",
				fetch: mockFetch as unknown as typeof fetch,
			});

			const messages: AgentMessage[] = [
				{ id: "msg-1", timestamp: Date.now(), role: "user", content: "Hello" },
			];

			const result = await provider.generateResponse(messages, []);

			expect(mockFetch).toHaveBeenCalledTimes(1);
			const [url, init] = mockFetch.mock.calls[0];
			expect(url).toBe("http://localhost:11434/api/chat");
			expect(init.method).toBe("POST");
			expect(init.headers).toEqual({ "Content-Type": "application/json" });

			const parsedBody = JSON.parse(init.body);
			expect(parsedBody).toEqual({
				model: "llama3.2",
				messages: [{ role: "user", content: "Hello" }],
				stream: false,
			});
			expect(parsedBody.tools).toBeUndefined();

			expect(result).toEqual({
				role: "assistant",
				content: "Hello! How can I help you?",
				toolCalls: undefined,
			});
		});

		it("trims trailing slashes from baseUrl", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				createMockResponse({
					model: "llama3.2",
					message: { role: "assistant", content: "Hi" },
					done: true,
				}),
			);

			const provider = new OllamaProvider({
				baseUrl: "http://localhost:11434///",
				model: "llama3.2",
				fetch: mockFetch as unknown as typeof fetch,
			});

			await provider.generateResponse([], []);

			const [url] = mockFetch.mock.calls[0];
			expect(url).toBe("http://localhost:11434/api/chat");
		});

		it("forwards AbortSignal to fetchFn", async () => {
			const controller = new AbortController();
			const mockFetch = vi.fn().mockResolvedValue(
				createMockResponse({
					model: "llama3.2",
					message: { role: "assistant", content: "Response" },
					done: true,
				}),
			);

			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			await provider.generateResponse([], [], controller.signal);

			const [, init] = mockFetch.mock.calls[0];
			expect(init.signal).toBe(controller.signal);
		});

		it("maps all message roles correctly (system, user, assistant, tool)", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				createMockResponse({
					model: "llama3.2",
					message: { role: "assistant", content: "All good" },
					done: true,
				}),
			);

			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			const messages: AgentMessage[] = [
				{
					id: "1",
					timestamp: 100,
					role: "system",
					content: "You are a helpful assistant",
				},
				{ id: "2", timestamp: 101, role: "user", content: "Call get_user" },
				{
					id: "3",
					timestamp: 102,
					role: "assistant",
					content: "Calling tool...",
					toolCalls: [
						{
							id: "call-1",
							toolName: "get_user",
							arguments: { userId: "42" },
							status: "approved",
							requiresApproval: false,
						},
					],
				},
				{
					id: "4",
					timestamp: 103,
					role: "tool",
					toolResult: {
						toolCallId: "call-1",
						success: true,
						data: { name: "Alice", role: "admin" },
					},
				},
				{
					id: "5",
					timestamp: 104,
					role: "tool",
					toolResult: {
						toolCallId: "call-2",
						success: false,
						error: {
							code: "PERMISSION_DENIED",
							message: "Permission denied",
							retryable: false,
						},
					},
				},
				{
					id: "6",
					timestamp: 105,
					role: "tool",
					toolResult: {
						toolCallId: "call-3",
						success: true,
						data: undefined,
					},
				},
			];

			await provider.generateResponse(messages, []);

			const [, init] = mockFetch.mock.calls[0];
			const parsedBody = JSON.parse(init.body);
			expect(parsedBody.messages).toEqual([
				{ role: "system", content: "You are a helpful assistant" },
				{ role: "user", content: "Call get_user" },
				{
					role: "assistant",
					content: "Calling tool...",
					tool_calls: [
						{
							function: {
								name: "get_user",
								arguments: { userId: "42" },
							},
						},
					],
				},
				{
					role: "tool",
					content: JSON.stringify({ name: "Alice", role: "admin" }),
				},
				{
					role: "tool",
					content: JSON.stringify({ error: "Permission denied" }),
				},
				{
					role: "tool",
					content: "null",
				},
			]);
		});

		it("maps assistant message without tool calls correctly", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				createMockResponse({
					model: "llama3.2",
					message: { role: "assistant", content: "OK" },
					done: true,
				}),
			);

			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			const messages: AgentMessage[] = [
				{ id: "1", timestamp: 100, role: "assistant", content: "I am ready" },
			];

			await provider.generateResponse(messages, []);

			const [, init] = mockFetch.mock.calls[0];
			const parsedBody = JSON.parse(init.body);
			expect(parsedBody.messages[0]).toEqual({
				role: "assistant",
				content: "I am ready",
			});
			expect(parsedBody.messages[0].tool_calls).toBeUndefined();
		});

		it("maps tools definitions correctly when tools are provided", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				createMockResponse({
					model: "llama3.2",
					message: {
						role: "assistant",
						content: "",
						tool_calls: [
							{
								function: {
									name: "fetch_data",
									arguments: { endpoint: "/users" },
								},
							},
						],
					},
					done: true,
				}),
			);

			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			const tools: ToolDefinition[] = [
				{
					name: "fetch_data",
					description: "Fetches data from an API",
					inputSchema: {
						type: "object",
						properties: {
							endpoint: { type: "string", description: "API endpoint" },
						},
						required: ["endpoint"],
					},
					riskLevel: "read",
				},
			];

			const result = await provider.generateResponse([], tools);

			const [, init] = mockFetch.mock.calls[0];
			const parsedBody = JSON.parse(init.body);
			expect(parsedBody.tools).toEqual([
				{
					type: "function",
					function: {
						name: "fetch_data",
						description: "Fetches data from an API",
						parameters: {
							type: "object",
							properties: {
								endpoint: { type: "string", description: "API endpoint" },
							},
							required: ["endpoint"],
						},
					},
				},
			]);

			expect(result.role).toBe("assistant");
			expect(result.content).toBe("");
			expect(result.toolCalls).toHaveLength(1);
			expect(result.toolCalls?.[0]).toEqual({
				id: expect.any(String),
				toolName: "fetch_data",
				arguments: { endpoint: "/users" },
			});
		});

		it("handles response with tool_calls and no content by defaulting content to empty string", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				createMockResponse({
					model: "llama3.2",
					message: {
						role: "assistant",
						tool_calls: [
							{ function: { name: "search", arguments: { q: "vitest" } } },
						],
					},
					done: true,
				}),
			);

			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			const result = await provider.generateResponse([], []);
			expect(result.content).toBe("");
			expect(result.toolCalls).toHaveLength(1);
			expect(result.toolCalls?.[0].toolName).toBe("search");
		});

		it("handles response with undefined message content by defaulting to empty string", async () => {
			const mockFetch = vi.fn().mockResolvedValue(
				createMockResponse({
					model: "llama3.2",
					message: { role: "assistant" },
					done: true,
				}),
			);

			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			const result = await provider.generateResponse([], []);
			expect(result.content).toBe("");
			expect(result.toolCalls).toBeUndefined();
		});
	});

	describe("error handling", () => {
		it("throws LLMProviderError(aborted) when fetch throws AbortError", async () => {
			const abortError = new Error("The operation was aborted");
			abortError.name = "AbortError";

			const mockFetch = vi.fn().mockRejectedValue(abortError);
			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			await expect(provider.generateResponse([], [])).rejects.toThrow(
				LLMProviderError,
			);
			await expect(provider.generateResponse([], [])).rejects.toMatchObject({
				kind: "aborted",
				message: "Request aborted",
			});
		});

		it("throws LLMProviderError(aborted) when signal is aborted during fetch rejection", async () => {
			const controller = new AbortController();
			controller.abort();

			const mockFetch = vi
				.fn()
				.mockRejectedValue(new Error("Network connection dropped"));
			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			await expect(
				provider.generateResponse([], [], controller.signal),
			).rejects.toMatchObject({
				kind: "aborted",
				message: "Request aborted",
			});
		});

		it("throws LLMProviderError(network) when fetch throws general network error", async () => {
			const networkError = new Error("Failed to connect to localhost:11434");
			const mockFetch = vi.fn().mockRejectedValue(networkError);
			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			await expect(provider.generateResponse([], [])).rejects.toMatchObject({
				kind: "network",
				message: "Could not reach Ollama",
				cause: networkError,
			});
		});

		it("throws LLMProviderError(rate_limit) on HTTP 429 response with error detail", async () => {
			const mockFetch = vi
				.fn()
				.mockResolvedValue(
					createMockResponse(
						{ error: "rate limit exceeded" },
						429,
						"Too Many Requests",
					),
				);
			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			await expect(provider.generateResponse([], [])).rejects.toMatchObject({
				kind: "rate_limit",
				message: "Ollama returned 429 Too Many Requests: rate limit exceeded",
			});
		});

		it("throws LLMProviderError(unknown) on HTTP 500 without error body detail", async () => {
			const mockFetch = vi
				.fn()
				.mockResolvedValue(
					createMockResponse("non-json-body", 500, "Internal Server Error"),
				);
			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			await expect(provider.generateResponse([], [])).rejects.toMatchObject({
				kind: "unknown",
				message: "Ollama returned 500 Internal Server Error",
			});
		});

		it("throws LLMProviderError(unknown) on HTTP 404 with error body detail", async () => {
			const mockFetch = vi
				.fn()
				.mockResolvedValue(
					createMockResponse(
						{ error: "model 'unknown' not found" },
						404,
						"Not Found",
					),
				);
			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			await expect(provider.generateResponse([], [])).rejects.toMatchObject({
				kind: "unknown",
				message: "Ollama returned 404 Not Found: model 'unknown' not found",
			});
		});

		it("throws LLMProviderError(invalid_response) when response JSON parsing fails", async () => {
			const response = {
				ok: true,
				status: 200,
				statusText: "OK",
				json: vi
					.fn()
					.mockRejectedValue(
						new SyntaxError("Unexpected token < in JSON at position 0"),
					),
			} as unknown as Response;

			const mockFetch = vi.fn().mockResolvedValue(response);
			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			await expect(provider.generateResponse([], [])).rejects.toMatchObject({
				kind: "invalid_response",
				message: "Ollama returned non-JSON body",
			});
		});

		it("throws LLMProviderError(aborted) when response JSON parsing fails while signal is aborted", async () => {
			const controller = new AbortController();
			controller.abort();

			const response = {
				ok: true,
				status: 200,
				statusText: "OK",
				json: vi.fn().mockRejectedValue(new Error("Aborted read")),
			} as unknown as Response;

			const mockFetch = vi.fn().mockResolvedValue(response);
			const provider = new OllamaProvider({
				...defaultOptions,
				fetch: mockFetch as unknown as typeof fetch,
			});

			await expect(
				provider.generateResponse([], [], controller.signal),
			).rejects.toMatchObject({
				kind: "aborted",
				message: "Request aborted",
			});
		});
	});

	describe("parseOllamaChatResponse", () => {
		it("accepts a valid chat response with content only", () => {
			const raw = {
				model: "llama3.2",
				message: { role: "assistant", content: "Hello" },
				done: true,
			};
			expect(parseOllamaChatResponse(raw)).toEqual(raw);
		});

		it("accepts a valid chat response with tool_calls", () => {
			const raw = {
				model: "llama3.2",
				message: {
					role: "assistant",
					content: "",
					tool_calls: [
						{ function: { name: "search", arguments: { q: "vitest" } } },
					],
				},
				done: true,
			};
			expect(parseOllamaChatResponse(raw)).toEqual(raw);
		});

		it("fails when data is not an object", () => {
			expect(() => parseOllamaChatResponse(null)).toThrow(
				"Ollama response invalid: body must be an object",
			);
			expect(() => parseOllamaChatResponse("not an object")).toThrow(
				"Ollama response invalid: body must be an object",
			);
			expect(() => parseOllamaChatResponse([1, 2, 3])).toThrow(
				"Ollama response invalid: body must be an object",
			);
		});

		it("fails when message is not an object", () => {
			expect(() => parseOllamaChatResponse({ message: null })).toThrow(
				"Ollama response invalid: message must be an object",
			);
			expect(() => parseOllamaChatResponse({ message: "assistant" })).toThrow(
				"Ollama response invalid: message must be an object",
			);
		});

		it("fails when message.role is not assistant", () => {
			expect(() =>
				parseOllamaChatResponse({ message: { role: "user", content: "hi" } }),
			).toThrow('Ollama response invalid: message.role must be "assistant"');
		});

		it("fails when message.content is present but not a string", () => {
			expect(() =>
				parseOllamaChatResponse({
					message: { role: "assistant", content: 12345 },
				}),
			).toThrow(
				"Ollama response invalid: message.content must be a string when present",
			);
		});

		it("fails when message.tool_calls is not an array", () => {
			expect(() =>
				parseOllamaChatResponse({
					message: { role: "assistant", tool_calls: "not-an-array" },
				}),
			).toThrow(
				"Ollama response invalid: message.tool_calls must be an array when present",
			);
		});

		it("fails when tool_calls element is not an object", () => {
			expect(() =>
				parseOllamaChatResponse({
					message: { role: "assistant", tool_calls: [null] },
				}),
			).toThrow(
				"Ollama response invalid: message.tool_calls[0] must be an object",
			);
		});

		it("fails when tool_calls function is not an object", () => {
			expect(() =>
				parseOllamaChatResponse({
					message: { role: "assistant", tool_calls: [{ function: null }] },
				}),
			).toThrow(
				"Ollama response invalid: message.tool_calls[0].function must be an object",
			);
		});

		it("fails when tool_calls function.name is not a non-empty string", () => {
			for (const name of ["", "   ", 123]) {
				expect(() =>
					parseOllamaChatResponse({
						message: {
							role: "assistant",
							tool_calls: [{ function: { name, arguments: {} } }],
						},
					}),
				).toThrow(
					"Ollama response invalid: message.tool_calls[0].function.name must be a non-empty string",
				);
			}
		});

		it("fails when tool_calls function.arguments is not an object", () => {
			for (const args of [null, "invalid", [1, 2]]) {
				expect(() =>
					parseOllamaChatResponse({
						message: {
							role: "assistant",
							tool_calls: [{ function: { name: "test", arguments: args } }],
						},
					}),
				).toThrow(
					"Ollama response invalid: message.tool_calls[0].function.arguments must be an object",
				);
			}
		});
	});
});
