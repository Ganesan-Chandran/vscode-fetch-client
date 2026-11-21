import type {
	IAgent,
	AgentEvent,
	AgentEventListener,
	AgentMessage,
	AgentStatus,
	IAgentTask,
	IApprovalRequest,
	IApprovalResponse,
	IAssistantMessage,
	RiskLevel,
	IToolCall,
	ToolCallStatus,
	IToolContext,
	ToolErrorCode,
	IToolFailure,
	IToolMessage,
	ToolResult,
	Unsubscribe,
	IUserMessage,
} from "../types/agent-contracts";

import type {
	IAgentDependencies,
	ApprovedToolCall,
} from "../types/agent-dependencies";

const MAX_STEPS = 20;
const TASK_FAILED_MESSAGE = "The task failed.";

type TaskOutcome = "completed" | "failed" | "cancelled";

// --------------------------------------------------------------------------
// Authorization marker
// --------------------------------------------------------------------------
function markApproved(call: IToolCall): ApprovedToolCall {
	return call as ApprovedToolCall;
}

// --------------------------------------------------------------------------
// Small helpers
// --------------------------------------------------------------------------

function newId(): string {
	return globalThis.crypto.randomUUID();
}

function failure(
	toolCallId: string,
	code: ToolErrorCode,
	message: string,
): IToolFailure {
	return {
		toolCallId,
		success: false,
		error: { code, message, retryable: false },
	};
}

// Returns a frozen copy with a different status. Used for event payloads,
// so the status shown to the UI never mutates the call being executed.
function withStatus(call: IToolCall, status: ToolCallStatus): IToolCall {
	return Object.freeze({ ...call, status });
}

// --------------------------------------------------------------------------
// Runtime validation
// --------------------------------------------------------------------------

// Checks that a value is representable as JSON.
// Rejects non-finite numbers, undefined, functions, symbols, class instances,
// and repeated object references. Repeated references are rejected even when
// they are not cycles. This is stricter than JSON, deliberately: shared
// references would let a mutation in one place change another.
function assertJsonValue(
	value: unknown,
	seen: WeakSet<object> = new WeakSet(),
): void {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "boolean"
	) {
		return;
	}

	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			throw new Error("Non-finite numbers are not valid JSON values.");
		}
		return;
	}

	if (typeof value !== "object") {
		throw new Error("Value is not JSON-compatible.");
	}

	if (seen.has(value)) {
		throw new Error("Repeated or circular object reference detected.");
	}
	seen.add(value);

	if (Array.isArray(value)) {
		for (const item of value) {
			assertJsonValue(item, seen);
		}
		return;
	}

	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) {
		throw new Error("Only plain objects are supported.");
	}

	if (Reflect.ownKeys(value).some((key) => typeof key !== "string")) {
		throw new Error("Symbol properties are not supported.");
	}

	for (const item of Object.values(value)) {
		assertJsonValue(item, seen);
	}
}

// Recursively freezes an object and all nested objects.
function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === "object") {
		Object.freeze(value);
		for (const child of Object.values(value)) {
			deepFreeze(child);
		}
	}
	return value;
}

// Builds the immutable snapshot used for policy, hashing, approval display
// and execution. This is the only place arguments are cloned and frozen.
function snapshotCall(call: IToolCall): IToolCall {
	assertJsonValue(call.arguments);

	const argumentsCopy = deepFreeze(
		structuredClone(call.arguments) as Record<string, unknown>,
	);

	return Object.freeze({
		id: call.id,
		toolName: call.toolName,
		arguments: argumentsCopy,
		status: call.status,
		requiresApproval: call.requiresApproval,
	});
}

// Validates and snapshots untrusted LLM tool calls.
// LLM-supplied status and requiresApproval are ignored.
function validateToolCalls(calls: unknown): IToolCall[] {
	if (!Array.isArray(calls)) {
		throw new Error("Malformed tool calls.");
	}

	const ids = new Set<string>();

	return calls.map((raw): IToolCall => {
		if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
			throw new Error("Malformed tool call.");
		}

		const call = raw as Record<string, unknown>;
		const args = call.arguments;

		if (
			typeof call.id !== "string" ||
			call.id.trim().length === 0 ||
			typeof call.toolName !== "string" ||
			call.toolName.trim().length === 0 ||
			typeof args !== "object" ||
			args === null ||
			Array.isArray(args)
		) {
			throw new Error("Malformed tool call.");
		}

		if (ids.has(call.id)) {
			throw new Error("Duplicate tool call ID in one response.");
		}
		ids.add(call.id);

		return snapshotCall({
			id: call.id,
			toolName: call.toolName,
			arguments: args as Record<string, unknown>,
			status: "pending",
			requiresApproval: false,
		});
	});
}

// Validates the basic shape of an LLM assistant response.
function validateAssistantMessage(value: unknown): IAssistantMessage {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error("Malformed assistant response.");
	}

	const message = value as Record<string, unknown>;

	const id = message.id;
	const content = message.content;
	const timestamp = message.timestamp;
	const taskId = message.taskId;

	if (
		message.role !== "assistant" ||
		typeof id !== "string" ||
		typeof content !== "string" ||
		typeof timestamp !== "number" ||
		!Number.isFinite(timestamp)
	) {
		throw new Error("Malformed assistant response.");
	}

	if (taskId !== undefined && typeof taskId !== "string") {
		throw new Error("Malformed assistant task ID.");
	}

	return {
		id,
		role: "assistant",
		content,
		timestamp,
		...(typeof taskId === "string" ? { taskId } : {}),
		toolCalls: validateToolCalls(message.toolCalls ?? []),
	};
}

// --------------------------------------------------------------------------
// Hashing
// --------------------------------------------------------------------------

// Sorted-key JSON. Equivalent arguments produce the same string.
// This is a canonical string, not a cryptographic digest. Replace with
// SHA-256 when approvals are persisted.
function canonical(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map(canonical).join(",")}]`;
	}

	if (value !== null && typeof value === "object") {
		const record = value as Record<string, unknown>;
		const entries = Object.keys(record)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`);
		return `{${entries.join(",")}}`;
	}

	return JSON.stringify(value) ?? "null";
}

// Covers tool name and arguments only. Status is excluded on purpose.
function hashCall(call: IToolCall): string {
	return canonical({
		toolName: call.toolName,
		arguments: call.arguments,
	});
}

// --------------------------------------------------------------------------
// Agent Orchestrator
// --------------------------------------------------------------------------

export class AgentOrchestrator implements IAgent {
	private currentStatus: AgentStatus = "idle";

	private activeTask: IAgentTask | undefined;
	private activeAbort: AbortController | undefined;

	private readonly listeners = new Set<AgentEventListener>();

	// approvalId -> resolver for the paused run.
	// Keyed by an orchestrator-generated ID, never by the LLM's tool call ID.
	private readonly pending = new Map<
		string,
		(response: IApprovalResponse) => void
	>();

	constructor(private readonly deps: IAgentDependencies) {}

	get status(): AgentStatus {
		return this.currentStatus;
	}

	// ----------------------------------------------------------------------
	// Public Agent API
	// ----------------------------------------------------------------------

	async run(description: string): Promise<IAgentTask> {
		if (this.activeTask) {
			throw new Error("Agent is already running a task.");
		}

		const now = Date.now();

		const task: IAgentTask = {
			id: newId(),
			description,
			status: "running",
			createdAt: now,
			updatedAt: now,
		};

		const abort = new AbortController();
		this.activeTask = task;
		this.activeAbort = abort;

		this.emitTask(task);

		const userMessage: IUserMessage = {
			id: newId(),
			role: "user",
			content: description,
			timestamp: now,
			taskId: task.id,
		};

		const history: AgentMessage[] = [userMessage];
		this.emitMessage(userMessage);

		try {
			const answer = await this.loop(task, history, abort.signal);
			this.finish(task, "completed", { result: answer });
		} catch {
			if (abort.signal.aborted) {
				this.finish(task, "cancelled", {});
			} else {
				// The raw error is withheld. Log it through an injected logger later.
				this.emit({
					type: "error",
					error: { code: "TASK_FAILED", message: TASK_FAILED_MESSAGE },
				});
				this.finish(task, "failed", { error: TASK_FAILED_MESSAGE });
			}
		}

		return { ...task };
	}

	cancel(taskId: string): void {
		if (this.activeTask?.id !== taskId) {
			return;
		}

		this.activeAbort?.abort();

		// Unblock any run paused on approval. Each resolves as a rejection,
		// and the loop's abort check then ends the task as cancelled.
		for (const [requestId, resolve] of this.pending) {
			this.pending.delete(requestId);
			resolve({
				requestId,
				decision: "reject",
				reason: "Task cancelled.",
				respondedAt: Date.now(),
			});
		}
	}

	respondToApproval(response: IApprovalResponse): void {
		const resolve = this.pending.get(response.requestId);

		if (!resolve) {
			this.emit({
				type: "error",
				error: {
					code: "UNKNOWN_APPROVAL",
					message: "No pending approval matches this request.",
				},
			});
			return;
		}

		this.pending.delete(response.requestId);
		resolve(response);
	}

	onEvent(listener: AgentEventListener): Unsubscribe {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	// ----------------------------------------------------------------------
	// Main loop
	// ----------------------------------------------------------------------

	private async loop(
		task: IAgentTask,
		history: AgentMessage[],
		signal: AbortSignal,
	): Promise<string> {
		for (let step = 0; step < MAX_STEPS; step++) {
			this.throwIfAborted(signal);
			this.setStatus("thinking");

			// The provider receives copies. It cannot mutate internal history.
			const rawReply: unknown = await this.deps.provider.generateResponse(
				structuredClone(history),
				structuredClone([...this.deps.registry.definitions()]),
				signal,
			);

			// Cancellation wins even if the provider returned a response.
			this.throwIfAborted(signal);

			const reply = validateAssistantMessage(rawReply);
			history.push(reply);
			this.emitMessage(reply);

			const calls = reply.toolCalls ?? [];
			if (calls.length === 0) {
				return reply.content;
			}

			for (const call of calls) {
				this.throwIfAborted(signal);

				const result = await this.handleCall(task, call, signal);

				const toolMessage: IToolMessage = {
					id: newId(),
					role: "tool",
					toolResult: result,
					timestamp: Date.now(),
					taskId: task.id,
				};

				history.push(toolMessage);
				this.emitMessage(toolMessage);
			}
		}

		throw new Error("Agent step limit reached.");
	}

	// ----------------------------------------------------------------------
	// Tool call handling
	// ----------------------------------------------------------------------

	// `call` is already an immutable snapshot from validateToolCalls.
	// Policy, approval, hashing and execution all use this same object.
	private async handleCall(
		task: IAgentTask,
		call: IToolCall,
		signal: AbortSignal,
	): Promise<ToolResult> {
		this.throwIfAborted(signal);

		const decision = await this.deps.policy.evaluate(call);
		this.throwIfAborted(signal);

		let result: ToolResult;

		switch (decision.action) {
			case "block": {
				result = failure(
					call.id,
					"PERMISSION_DENIED",
					"This action is not permitted.",
				);
				break;
			}

			case "approve": {
				const approvalId = newId();
				const expectedHash = hashCall(call);

				const response = await this.waitForApproval(
					task,
					call,
					approvalId,
					decision.reason,
				);

				this.setStatus("thinking");
				this.setTaskStatus(task, "running");

				// Approval and cancellation can race. Cancellation wins.
				this.throwIfAborted(signal);

				if (response.decision !== "approve") {
					result = failure(
						call.id,
						"REJECTED_BY_USER",
						"The user rejected this action.",
					);
					break;
				}

				// Record the user's decision for the exact hash that was shown.
				await this.deps.approvals.grant(approvalId, expectedHash);

				// Consistency check: the snapshot must still match what the
				// user approved. Because the snapshot is frozen, this should
				// always pass. Keep it as a guard against regressions.
				if (!(await this.deps.approvals.verify(approvalId, hashCall(call)))) {
					result = failure(
						call.id,
						"PERMISSION_DENIED",
						"The approval no longer matches this action.",
					);
					break;
				}

				this.throwIfAborted(signal);

				result = await this.dispatch(task, call, signal);
				break;
			}

			case "warn": {
				this.deps.state.set(`warning:${task.id}:${newId()}`, {
					toolCallId: call.id,
					reason: decision.reason,
				});

				result = await this.dispatch(task, call, signal);
				break;
			}

			case "allow": {
				result = await this.dispatch(task, call, signal);
				break;
			}
		}

		this.emit({
			type: "tool_call_finished",
			result: structuredClone(result),
		});

		return result;
	}

	// ----------------------------------------------------------------------
	// Dispatch
	// ----------------------------------------------------------------------

	private async dispatch(
		task: IAgentTask,
		call: IToolCall,
		signal: AbortSignal,
	): Promise<ToolResult> {
		this.throwIfAborted(signal);

		this.setStatus("executing");

		this.emit({
			type: "tool_call_started",
			toolCall: withStatus(call, "running"),
		});

		const context: IToolContext = {
			taskId: task.id,
			signal,
		};

		return this.deps.executor.execute(markApproved(call), context);
	}

	// ----------------------------------------------------------------------
	// Approval
	// ----------------------------------------------------------------------

	// The approval request shows the full arguments that will be executed,
	// so the user approves the actual call and not a label.
	private waitForApproval(
		task: IAgentTask,
		call: IToolCall,
		approvalId: string,
		policyReason: string,
	): Promise<IApprovalResponse> {
		const request: IApprovalRequest = {
			id: approvalId,
			toolCallId: call.id,
			summary: `${call.toolName}: ${policyReason}\n\n${JSON.stringify(
				call.arguments,
				null,
				2,
			)}`,
			riskLevel: this.riskOf(call),
			createdAt: Date.now(),
		};

		this.setTaskStatus(task, "waiting_for_approval");
		this.setStatus("waiting_for_approval");

		return new Promise((resolve) => {
			this.pending.set(approvalId, resolve);
			this.emit({
				type: "approval_requested",
				request: { ...request },
			});
		});
	}

	// Unknown tools default to the stricter level.
	private riskOf(call: IToolCall): Exclude<RiskLevel, "read"> {
		const risk = this.deps.registry
			.definitions()
			.find((definition) => definition.name === call.toolName)?.riskLevel;

		return risk === "destructive" ? "destructive" : "write";
	}

	// ----------------------------------------------------------------------
	// Lifecycle helpers
	// ----------------------------------------------------------------------

	private finish(
		task: IAgentTask,
		outcome: TaskOutcome,
		details: { result?: string; error?: string },
	): void {
		const now = Date.now();

		task.status = outcome;
		task.updatedAt = now;
		task.completedAt = now;
		Object.assign(task, details);

		this.activeTask = undefined;
		this.activeAbort = undefined;

		this.emitTask(task);
		this.setStatus("idle");
	}

	private setTaskStatus(task: IAgentTask, status: IAgentTask["status"]): void {
		task.status = status;
		task.updatedAt = Date.now();
		this.emitTask(task);
	}

	private setStatus(status: AgentStatus): void {
		if (this.currentStatus === status) {
			return;
		}

		this.currentStatus = status;
		this.emit({ type: "status_changed", status });
	}

	private throwIfAborted(signal: AbortSignal): void {
		if (signal.aborted) {
			throw new Error("Task cancelled.");
		}
	}

	// ----------------------------------------------------------------------
	// Event emission
	// ----------------------------------------------------------------------

	// Listeners receive copies. A listener cannot change the task, a message,
	// or the call being executed.
	private emitTask(task: IAgentTask): void {
		this.emit({ type: "task_updated", task: { ...task } });
	}

	private emitMessage(message: AgentMessage): void {
		this.emit({ type: "message_added", message: structuredClone(message) });
	}

	// A throwing listener must not stop the agent.
	private emit(event: AgentEvent): void {
		for (const listener of this.listeners) {
			try {
				listener(event);
			} catch {
				// Ignored for now. Route through an injected logger later.
			}
		}
	}
}
