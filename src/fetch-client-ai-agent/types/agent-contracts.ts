/**
 * Agent contracts for the Fetch Client AI Agent.
 *
 * Conventions:
 *  - Timestamps are Unix epoch milliseconds (Date.now()).
 *  - IDs are opaque strings (UUID v4 or ULID; pick one and stay consistent).
 *  - Properties without `?` are mandatory; properties with `?` are optional.
 */

/* ========================================================================== */
/* Shared primitives                                                          */
/* ========================================================================== */

/** Unix epoch time in milliseconds. */
export type Timestamp = number;

/** How dangerous a tool is. Drives the approval policy. */
export type RiskLevel = "read" | "write" | "destructive";

/* ========================================================================== */
/* AgentStatus / TaskStatus                                                   */
/* ========================================================================== */

/**
 * AgentStatus: the live execution state of the agent itself.
 * Describes what the agent is doing right now, not how a task ended.
 */
export type AgentStatus =
	| "idle" // nothing running
	| "thinking" // waiting for / processing LLM output
	| "executing" // running a tool
	| "waiting_for_approval"; // paused until the user approves or rejects

/**
 * TaskStatus: the lifecycle state of one AgentTask.
 * Includes terminal states (completed / failed / cancelled).
 */
export type TaskStatus =
	| "pending"
	| "running"
	| "waiting_for_approval"
	| "completed"
	| "failed"
	| "cancelled";

/* ========================================================================== */
/* LLM                                                                   */
/* ========================================================================== */
export type LLMErrorKind =
	| "network"
	| "timeout"
	| "rate_limit"
	| "aborted"
	| "invalid_response"
	| "unknown";

export class LLMProviderError extends Error {
	readonly kind: LLMErrorKind;
	readonly cause?: unknown;

	constructor(
		kind: LLMErrorKind,
		message: string,
		options?: { cause?: unknown },
	) {
		super(message);
		this.name = "LLMProviderError";
		this.kind = kind;
		this.cause = options?.cause;
	}
}

/* ========================================================================== */
/* ToolCall                                                                   */
/* ========================================================================== */

/** Lifecycle state of a single tool invocation. */
export type ToolCallStatus =
	| "pending"
	| "awaiting_approval"
	| "approved"
	| "rejected"
	| "running"
	| "succeeded"
	| "failed";

/**
 * ToolCall: a request, produced by the LLM, to execute a named tool.
 * Arguments are untrusted LLM output and must be validated before execution.
 */
export interface IToolCall {
	/** Unique id; ToolResult.toolCallId points back to it. */
	id: string;
	/** Must match a registered ToolDefinition.name. */
	toolName: string;
	/** Raw arguments; validate against the tool's inputSchema. */
	arguments: Record<string, unknown>;
	/** Current lifecycle state of this call. */
	status: ToolCallStatus;
	/** True if the user must approve before the tool runs. */
	requiresApproval: boolean;
}

/* ========================================================================== */
/* ToolResult                                                                 */
/* ========================================================================== */

/** Machine-readable failure categories so the agent can decide what to do next. */
export type ToolErrorCode =
	| "INVALID_ARGUMENTS"
	| "TIMEOUT"
	| "NETWORK"
	| "PERMISSION_DENIED"
	| "REJECTED_BY_USER"
	| "UNKNOWN_TOOL" // toolName is not in the registry
	| "TOOL_EXECUTION_FAILED" // tool threw an unexpected exception
	| "UNKNOWN"; // not classified; should be rare

/** ToolError: structured failure information for a tool execution. */
export interface IToolError {
	code: ToolErrorCode;
	/** Human-readable message (also safe to show to the LLM). */
	message: string;
	/** True if retrying the same call could succeed. */
	retryable: boolean;
}

/** Fields shared by every tool result. */
interface IToolResultBase {
	/** Id of the ToolCall this result answers. */
	toolCallId: string;
	/** Execution time in milliseconds. */
	durationMs?: number;
}

/** Successful execution. `data` is mandatory here; `error` cannot exist. */
export interface IToolSuccess extends IToolResultBase {
	success: true;
	data: unknown;
}

/** Failed execution. `error` is mandatory here; `data` cannot exist. */
export interface IToolFailure extends IToolResultBase {
	success: false;
	error: IToolError;
}

/**
 * ToolResult: the outcome of a ToolCall.
 * Discriminated on `success`, so invalid combinations do not compile.
 */
export type ToolResult = IToolSuccess | IToolFailure;

/* ========================================================================== */
/* AgentMessage                                                               */
/* ========================================================================== */

/** Fields shared by every message. */
interface IAgentMessageBase {
	id: string;
	timestamp: Timestamp;
	/** Task this message belongs to, if any. */
	taskId?: string;
}

/** Text typed by the user. */
export interface IUserMessage extends IAgentMessageBase {
	role: "user";
	content: string;
}

/** Instructions injected by the application (system prompt, context). */
export interface ISystemMessage extends IAgentMessageBase {
	role: "system";
	content: string;
}

/** Output from the LLM: text, optionally with tool requests. */
export interface IAssistantMessage extends IAgentMessageBase {
	role: "assistant";
	content: string;
	toolCalls?: IToolCall[];
}

/** A tool's output fed back to the LLM. */
export interface IToolMessage extends IAgentMessageBase {
	role: "tool";
	toolResult: ToolResult;
}

/**
 * AgentMessage: one entry in the conversation between user, agent and tools.
 * Discriminated on `role`.
 */
export type AgentMessage =
	| IUserMessage
	| ISystemMessage
	| IAssistantMessage
	| IToolMessage;

/* ========================================================================== */
/* AgentTask                                                                  */
/* ========================================================================== */

/**
 * AgentTask: a unit of work assigned to the agent (e.g. "Create a collection
 * for the GitHub API and test every endpoint").
 */
export interface IAgentTask {
	id: string;
	/** What the user asked for. */
	description: string;
	status: TaskStatus;
	createdAt: Timestamp;
	/** Last state change. */
	updatedAt?: Timestamp;
	/** Set when status becomes completed / failed / cancelled. */
	completedAt?: Timestamp;
	/** Final summary, when completed. */
	result?: string;
	/** Failure reason, when failed. */
	error?: string;
	/** Present when this is a subtask of another task. */
	parentTaskId?: string;
}

/* ========================================================================== */
/* ToolDefinition / Tool                                                      */
/* ========================================================================== */

/** Primitive JSON Schema types used for tool parameters. */
export type JSONSchemaType =
	| "string"
	| "number"
	| "integer"
	| "boolean"
	| "object"
	| "array";

/** Schema for a single tool parameter. */
export interface IJSONSchemaProperty {
	type: JSONSchemaType;
	description?: string;
	enum?: readonly string[];
	items?: IJSONSchemaProperty;
}

/** JSON Schema describing a tool's arguments. */
export interface IJSONSchema {
	type: "object";
	properties: Record<string, IJSONSchemaProperty>;
	required?: string[];
	additionalProperties?: boolean;
}

/**
 * ToolDefinition: what the LLM sees about a tool (name, purpose, parameters)
 * plus the risk level used by the approval policy.
 */
export interface ToolDefinition {
	name: string;
	/** Explains to the LLM when and how to use the tool. */
	description: string;
	inputSchema: IJSONSchema;
	riskLevel: RiskLevel;
	/** Overrides the default policy derived from riskLevel. */
	requiresApproval?: boolean;
}

/** Runtime information given to a tool when it executes. */
export interface IToolContext {
	taskId: string;
	/** Aborts long-running work when the user cancels. */
	signal?: AbortSignal;
	/** Workspace folder, if one is open. */
	workspacePath?: string;
}

/**
 * Tool: an executable capability. Pairs a ToolDefinition with its
 * implementation. Implementations must validate args before use.
 */
export interface ITool {
	definition: ToolDefinition;
	execute(
		args: Record<string, unknown>,
		context: IToolContext,
	): Promise<ToolResult>;
}

/* ========================================================================== */
/* Approval                                                                   */
/* ========================================================================== */

/** ApprovalRequest: asks the user to allow a specific tool call. */
export interface IApprovalRequest {
	id: string;
	toolCallId: string;
	/** Human-readable, e.g. "DELETE https://api.example.com/users/42". */
	summary: string;
	/** Only risky tools need approval. */
	riskLevel: Exclude<RiskLevel, "read">;
	createdAt: Timestamp;
}

/** ApprovalResponse: the user's answer to an ApprovalRequest. */
export interface IApprovalResponse {
	requestId: string;
	decision: "approve" | "reject";
	/** Optional explanation, forwarded to the LLM on rejection. */
	reason?: string;
	respondedAt: Timestamp;
}

/* ========================================================================== */
/* AgentEvent                                                                 */
/* ========================================================================== */

/** Payload for errors surfaced to the UI. */
export interface IAgentErrorInfo {
	code: string;
	message: string;
}

/**
 * AgentEvent: everything the agent emits so the webview/UI can render
 * progress without calling into agent internals. Discriminated on `type`.
 */
export type AgentEvent =
	| { type: "status_changed"; status: AgentStatus }
	| { type: "task_updated"; task: IAgentTask }
	| { type: "message_added"; message: AgentMessage }
	| { type: "message_delta"; messageId: string; delta: string }
	| { type: "tool_call_started"; toolCall: IToolCall }
	| { type: "tool_call_finished"; result: ToolResult }
	| { type: "approval_requested"; request: IApprovalRequest }
	| { type: "error"; error: IAgentErrorInfo };

/* ========================================================================== */
/* Agent                                                                      */
/* ========================================================================== */

/** Call to stop listening to events. */
export type Unsubscribe = () => void;

/** Receives every AgentEvent. */
export type AgentEventListener = (event: AgentEvent) => void;

/**
 * Agent: the public API of the agent runtime. The UI only talks to this
 * interface: start tasks, cancel them, answer approvals, observe events.
 */
export interface IAgent {
	readonly status: AgentStatus;
	run(description: string): Promise<IAgentTask>;
	cancel(taskId: string): void;
	respondToApproval(response: IApprovalResponse): void;
	onEvent(listener: AgentEventListener): Unsubscribe;
}
