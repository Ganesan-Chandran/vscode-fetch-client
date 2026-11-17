import type {
	Agent,
	AgentEvent,
	AgentEventListener,
	AgentMessage,
	AgentStatus,
	AgentTask,
	ApprovalRequest,
	ApprovalResponse,
	AssistantMessage,
	JSONSchema,
	SystemMessage,
	Tool,
	ToolCall,
	ToolContext,
	ToolDefinition,
	ToolError,
	ToolFailure,
	ToolMessage,
	ToolResult,
	ToolSuccess,
	UserMessage,
	TaskStatus,
} from "../../../src/fetch-client-ai-agent/types/agent-contracts";

const now = 1_760_000_000_000;

/* AgentStatus / TaskStatus */
export const sampleAgentStatus: AgentStatus = "waiting_for_approval";
export const sampleTaskStatus: TaskStatus = "running";

/* ToolCall */
export const sampleToolCall: ToolCall = {
	id: "call_001",
	toolName: "send_request",
	arguments: { method: "DELETE", url: "https://api.example.com/users/42" },
	status: "awaiting_approval",
	requiresApproval: true,
};

/* ToolError + ToolResult variants */
export const sampleToolError: ToolError = {
	code: "TIMEOUT",
	message: "Request timed out after 30000ms",
	retryable: true,
};

export const sampleToolSuccess: ToolSuccess = {
	toolCallId: "call_001",
	success: true,
	data: { status: 204, headers: {}, body: null },
	durationMs: 182,
};

export const sampleToolFailure: ToolFailure = {
	toolCallId: "call_002",
	success: false,
	error: sampleToolError,
	durationMs: 30000,
};

export const sampleToolResult: ToolResult = sampleToolSuccess;

/* AgentMessage variants */
export const sampleUserMessage: UserMessage = {
	id: "msg_001",
	role: "user",
	content: "Delete user 42 on the staging API",
	timestamp: now,
	taskId: "task_001",
};

export const sampleSystemMessage: SystemMessage = {
	id: "msg_000",
	role: "system",
	content: "You are an API testing assistant inside Fetch Client.",
	timestamp: now - 1000,
};

export const sampleAssistantMessage: AssistantMessage = {
	id: "msg_002",
	role: "assistant",
	content: "I'll send a DELETE request to remove user 42.",
	toolCalls: [sampleToolCall],
	timestamp: now + 500,
	taskId: "task_001",
};

export const sampleToolMessage: ToolMessage = {
	id: "msg_003",
	role: "tool",
	toolResult: sampleToolSuccess,
	timestamp: now + 900,
	taskId: "task_001",
};

export const sampleAgentMessage: AgentMessage = sampleUserMessage;

/* AgentTask */
export const sampleTask: AgentTask = {
	id: "task_001",
	description: "Delete user 42 on the staging API",
	status: "running",
	createdAt: now,
	updatedAt: now + 500,
};

/* ToolDefinition, JSONSchema, Tool, ToolContext */
export const sampleSchema: JSONSchema = {
	type: "object",
	properties: {
		method: {
			type: "string",
			enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
			description: "HTTP method",
		},
		url: { type: "string", description: "Absolute URL" },
	},
	required: ["method", "url"],
	additionalProperties: false,
};

export const sampleToolDefinition: ToolDefinition = {
	name: "send_request",
	description: "Sends an HTTP request and returns status, headers and body.",
	inputSchema: sampleSchema,
	riskLevel: "write",
};

export const sampleToolContext: ToolContext = {
	taskId: "task_001",
	workspacePath: "/home/user/project",
};

export const sampleTool: Tool = {
	definition: sampleToolDefinition,
	async execute(_args, context): Promise<ToolResult> {
		return {
			toolCallId: `call_for_${context.taskId}`,
			success: true,
			data: { status: 200 },
		};
	},
};

/* Approval */
export const sampleApprovalRequest: ApprovalRequest = {
	id: "appr_001",
	toolCallId: "call_001",
	summary: "DELETE https://api.example.com/users/42",
	riskLevel: "destructive",
	createdAt: now + 600,
};

export const sampleApprovalResponse: ApprovalResponse = {
	requestId: "appr_001",
	decision: "approve",
	respondedAt: now + 5000,
};

/* AgentEvent */
export const sampleEvent: AgentEvent = {
	type: "approval_requested",
	request: sampleApprovalRequest,
};

/* Agent (minimal stub) */
const listeners = new Set<AgentEventListener>();

export const sampleAgent: Agent = {
	status: "idle",
	async run(description) {
		return { ...sampleTask, description };
	},
	cancel(_taskId) {},
	respondToApproval(_response) {},
	onEvent(listener) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
};
