import type {
	AgentMessage,
	AssistantMessage,
	Tool,
	ToolCall,
	ToolContext,
	ToolDefinition,
	ToolResult,
} from "./agent-contracts";
import type { ApprovalGate } from "../security/approval-gate";

// 1. LLM Provider
// Contract:
//  - Honors `signal` by forwarding it to the underlying HTTP request.
//  - Serializes only `id`, `toolName` and `arguments` from tool calls.
//    Internal fields such as `status` are not part of the wire format.
//  - Must not mutate `messages` or `tools`.
export interface LLMProvider {
	generateResponse(
		messages: readonly AgentMessage[],
		tools: readonly ToolDefinition[],
		signal?: AbortSignal,
	): Promise<AssistantMessage>;
}

// 2. Tool Registry
// lookup: returns the executable tool, keyed by definition name.
// definitions: returns the tool descriptions exposed to the LLM.
export interface ToolRegistry {
	lookup(name: string): Tool | undefined;
	definitions(): readonly ToolDefinition[];
}

// 3. Security Policy
// Evaluated for every tool call. Must consider both riskLevel and
// requiresApproval from the registry definition. requiresApproval can add
// approval to a tool; it must never remove approval from a write or
// destructive tool.
export type PolicyDecision =
	| { action: "allow" }
	| { action: "warn"; reason: string }
	| { action: "approve"; reason: string }
	| { action: "block"; reason: string };

export interface SecurityPolicy {
	evaluate(call: ToolCall): Promise<PolicyDecision>;
}

// 4. Agent State
// Currently used only for warning records.
// Conversation history is held by the orchestrator, not persisted here.
export interface AgentState {
	get(key: string): unknown;
	set(key: string, value: unknown): void;
}

// 5. Collection Writer
// Accepts only changes that have passed the approval gate.
export interface CollectionOperation {
	readonly op: "create" | "update";
	readonly path: string;
	readonly value: unknown;
}

export interface ApprovedChanges {
	readonly proposalId: string;
	readonly proposalHash: string;
	readonly collectionId: string;
	readonly operations: readonly CollectionOperation[];
}

export interface CollectionWriter {
	save(changes: ApprovedChanges): Promise<void>;
}

// 6. Approved Tool Call
// Exported so the declaration can be emitted. Compile-time marker only.
// Authorization is enforced by the orchestrator's control flow, not by this brand.
export declare const approvedToolCallBrand: unique symbol;

export type ApprovedToolCall = ToolCall & {
	readonly [approvedToolCallBrand]: true;
};

// 7. Tool Executor
// Dispatches an already-authorized call. Makes no policy or approval decisions.
export interface ToolExecutor {
	execute(call: ApprovedToolCall, context: ToolContext): Promise<ToolResult>;
}

// 8. Agent Dependencies
// Provided once by the composition root.
export interface AgentDependencies {
	readonly provider: LLMProvider;
	readonly registry: ToolRegistry;
	readonly executor: ToolExecutor;
	readonly policy: SecurityPolicy;
	readonly approvals: ApprovalGate;
	readonly state: AgentState;
}
