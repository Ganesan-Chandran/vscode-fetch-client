import { IJSONSchema } from "../../../types/agent-contracts";

export interface IOllamaChatMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: string;
	tool_calls?: IOllamaToolCall[];
}

export interface IOllamaToolDefinition {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: IJSONSchema;
	};
}

export interface IOllamaToolCall {
	function: {
		name: string;
		arguments: Record<string, unknown>;
	};
}

export interface IOllamaChatRequest {
	model: string;
	messages: IOllamaChatMessage[];
	tools?: IOllamaToolDefinition[];
	stream: false;
}

export interface IOllamaChatResponse {
	model: string;
	message: {
		role: "assistant";
		content: string;
		tool_calls?: IOllamaToolCall[];
	};
	done: boolean;
	done_reason?: string;
	prompt_eval_count?: number;
	eval_count?: number;
}

export interface IOllamaErrorResponse {
	error: string;
}
