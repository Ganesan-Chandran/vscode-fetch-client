import { randomUUID } from "crypto";
import {
	AgentMessage,
	ToolDefinition,
	LLMProviderError,
	IToolFailure,
	LLMErrorKind,
} from "../../../types/agent-contracts";
import type {
	ILLMProvider,
	LLMAssistantOutput,
	LLMToolRequest,
} from "../../../types/agent-dependencies";
import {} from "../../../types/agent-dependencies";
import type {
	IOllamaChatMessage,
	IOllamaChatRequest,
	IOllamaChatResponse,
	IOllamaToolCall,
	IOllamaToolDefinition,
} from "./ollama.types";

export interface OllamaProviderOptions {
	readonly baseUrl: string;
	readonly model: string;
	readonly fetch?: typeof fetch;
}

export class OllamaProvider implements ILLMProvider {
	private readonly fetchFn: typeof fetch;

	constructor(private readonly options: OllamaProviderOptions) {
		this.fetchFn = options.fetch ?? fetch;
	}

	async generateResponse(
		messages: readonly AgentMessage[],
		tools: readonly ToolDefinition[],
		signal?: AbortSignal,
	): Promise<LLMAssistantOutput> {
		// Map messages to Ollama's chat format and Map tools to Ollama's tool format
		const body: IOllamaChatRequest = {
			model: this.options.model,
			messages: messages.map(toOllamaMessage),
			stream: false,
			...(tools.length > 0 && { tools: tools.map(toOllamaTool) }),
		};

		// POST to `${baseUrl}/api/chat` with stream: false, passing `signal`.
		const response = await this.send(body, signal);
		const data = parseOllamaChatResponse(await this.readJson(response, signal));

		// Map the response to { role: "assistant", content, toolCalls? }.
		return {
			role: "assistant",
			content: data.message.content ?? "",
			toolCalls: toToolRequests(data.message.tool_calls),
		};
	}

	private async send(
		body: IOllamaChatRequest,
		signal?: AbortSignal,
	): Promise<Response> {
		let response: Response;
		try {
			const baseUrl = this.options.baseUrl.replace(/\/+$/, "");
			response = await this.fetchFn(`${baseUrl}/api/chat`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
				signal,
			});
		} catch (err) {
			throw toFetchError(err, signal);
		}

		if (!response.ok) {
			const kind = getHttpErrorKind(response.status);

			let detail = "";

			try {
				const body: unknown = await response.json();

				if (isRecord(body) && typeof body.error === "string") {
					detail = `: ${body.error}`;
				}
			} catch {
				// Preserve the HTTP status as the primary error.
			}

			throw new LLMProviderError(
				kind,
				`Ollama returned ${response.status} ${response.statusText}${detail}`,
			);
		}
		return response;
	}

	private async readJson(
		response: Response,
		signal?: AbortSignal,
	): Promise<IOllamaChatResponse> {
		try {
			return (await response.json()) as IOllamaChatResponse;
		} catch (err) {
			if (signal?.aborted) {
				throw new LLMProviderError("aborted", "Request aborted", {
					cause: err,
				});
			}
			throw new LLMProviderError(
				"invalid_response",
				"Ollama returned non-JSON body",
				{ cause: err },
			);
		}
	}
}

function getHttpErrorKind(status: number): LLMErrorKind {
	if (status === 429) {
		return "rate_limit";
	}
	return "unknown";
}

// --- pure mapping functions (easy to unit test, no network) ---
function toOllamaMessage(msg: AgentMessage): IOllamaChatMessage {
	switch (msg.role) {
		case "system":
		case "user":
			return { role: msg.role, content: msg.content };
		case "assistant":
			return {
				role: "assistant",
				content: msg.content,
				...(msg.toolCalls?.length && {
					tool_calls: msg.toolCalls.map(
						(c): IOllamaToolCall => ({
							function: { name: c.toolName, arguments: c.arguments },
						}),
					),
				}),
			};
		case "tool": {
			const r = msg.toolResult;
			const payload = r.success
				? r.data
				: { error: (r as IToolFailure).error.message };
			return { role: "tool", content: JSON.stringify(payload ?? null) };
		}
	}
}

function toOllamaTool(tool: ToolDefinition): IOllamaToolDefinition {
	return {
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.inputSchema,
		},
	};
}

function toToolRequests(
	calls: IOllamaToolCall[] | undefined,
): LLMToolRequest[] | undefined {
	if (!calls?.length) {
		return undefined;
	}
	return calls.map((call) => ({
		id: randomUUID(),
		toolName: call.function.name,
		arguments: call.function.arguments,
	}));
}

function toFetchError(err: unknown, signal?: AbortSignal): LLMProviderError {
	if (signal?.aborted || (err instanceof Error && err.name === "AbortError")) {
		return new LLMProviderError("aborted", "Request aborted", { cause: err });
	}

	return new LLMProviderError("network", "Could not reach Ollama", {
		cause: err,
	});
}

function fail(message: string): never {
	throw new LLMProviderError(
		"invalid_response",
		`Ollama response invalid: ${message}`,
	);
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateToolCall(call: unknown, index: number): void {
	const where = `message.tool_calls[${index}]`;
	if (!isRecord(call)) {
		fail(`${where} must be an object`);
	}

	const fn = call.function;
	if (!isRecord(fn)) {
		fail(`${where}.function must be an object`);
	}

	if (typeof fn.name !== "string" || fn.name.trim() === "") {
		fail(`${where}.function.name must be a non-empty string`);
	}

	if (!isRecord(fn.arguments)) {
		fail(`${where}.function.arguments must be an object`);
	}
}

export function parseOllamaChatResponse(data: unknown): IOllamaChatResponse {
	if (!isRecord(data)) {
		fail("body must be an object");
	}

	const message = data.message;
	if (!isRecord(message)) {
		fail("message must be an object");
	}

	if (message.role !== "assistant") {
		fail(`message.role must be "assistant"`);
	}

	if (message.content !== undefined && typeof message.content !== "string") {
		fail("message.content must be a string when present");
	}

	if (message.tool_calls !== undefined) {
		if (!Array.isArray(message.tool_calls)) {
			fail("message.tool_calls must be an array when present");
		}
		message.tool_calls.forEach((call, i) => validateToolCall(call, i));
	}

	// Validated above, so the cast is safe.
	return data as unknown as IOllamaChatResponse;
}
