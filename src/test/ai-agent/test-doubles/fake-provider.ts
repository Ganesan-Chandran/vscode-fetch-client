import type {
	AgentMessage,
	AssistantMessage,
	ToolDefinition,
} from "../../../fetch-client-ai-agent/types/agent-contracts";
import type { LLMProvider } from "../../../fetch-client-ai-agent/types/agent-dependencies";

export interface FakeProviderCall {
	readonly messages: readonly AgentMessage[];
	readonly tools: readonly ToolDefinition[];
	readonly signal?: AbortSignal;
}

export class FakeProvider implements LLMProvider {
	public readonly calls: FakeProviderCall[] = [];
	private readonly queue: unknown[] = [];
	private responder?: (
		messages: readonly AgentMessage[],
		tools: readonly ToolDefinition[],
		signal?: AbortSignal,
	) => Promise<unknown> | unknown;

	enqueueResponse(response: unknown): this {
		this.queue.push(response);
		return this;
	}

	enqueueTextResponse(
		content: string,
		id: string = globalThis.crypto.randomUUID(),
	): this {
		const assistantMsg: AssistantMessage = {
			id,
			role: "assistant",
			content,
			timestamp: Date.now(),
			toolCalls: [],
		};
		this.queue.push(assistantMsg);
		return this;
	}

	enqueueToolCallResponse(
		content: string,
		toolCalls: Array<{
			id: string;
			toolName: string;
			arguments: Record<string, unknown>;
		}>,
		id: string = globalThis.crypto.randomUUID(),
	): this {
		this.queue.push({
			id,
			role: "assistant",
			content,
			timestamp: Date.now(),
			toolCalls: toolCalls.map((tc) => ({
				id: tc.id,
				toolName: tc.toolName,
				arguments: tc.arguments,
				status: "pending",
				requiresApproval: false,
			})),
		});
		return this;
	}

	setResponder(
		responder: (
			messages: readonly AgentMessage[],
			tools: readonly ToolDefinition[],
			signal?: AbortSignal,
		) => Promise<unknown> | unknown,
	): this {
		this.responder = responder;
		return this;
	}

	async generateResponse(
		messages: readonly AgentMessage[],
		tools: readonly ToolDefinition[],
		signal?: AbortSignal,
	): Promise<AssistantMessage> {
		this.calls.push({ messages, tools, signal });

		if (signal?.aborted) {
			throw new Error("Aborted");
		}

		if (this.responder) {
			return (await this.responder(
				messages,
				tools,
				signal,
			)) as AssistantMessage;
		}

		if (this.queue.length === 0) {
			throw new Error("FakeProvider has no queued responses");
		}

		const next = this.queue.shift();
		return next as AssistantMessage;
	}

	clear(): void {
		this.calls.length = 0;
		this.queue.length = 0;
		this.responder = undefined;
	}
}
