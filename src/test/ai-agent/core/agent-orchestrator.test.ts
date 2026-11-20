import { describe, it, expect, beforeEach } from "vitest";
import { AgentOrchestrator } from "../../../fetch-client-ai-agent/core/agent-orchestrator";
import { RegistryToolExecutor } from "../../../fetch-client-ai-agent/core/tool-executor";
import type {
	AgentEvent,
	AgentMessage,
	AgentTask,
	AssistantMessage,
	RiskLevel,
	Tool,
	ToolCall,
	ToolContext,
	ToolResult,
} from "../../../fetch-client-ai-agent/types/agent-contracts";
import type {
	AgentDependencies,
	ApprovedToolCall,
	PolicyDecision,
	ToolExecutor,
} from "../../../fetch-client-ai-agent/types/agent-dependencies";
import { FakeProvider } from "../test-doubles/fake-provider";
import { InMemoryToolRegistry } from "../test-doubles/in-memory-registry";
import {
	ConfigurablePolicy,
	DenyAllPolicy,
} from "../test-doubles/deny-all-policy";
import { MemoryAgentState } from "../test-doubles/memory-state";
import { InMemoryApprovalGate } from "../test-doubles/in-memory-approval-gate";

// ============================================================================
// Helper Mock Executor for Unit Tests
// ============================================================================

class MockToolExecutor implements ToolExecutor {
	public readonly executedCalls: Array<{
		call: ApprovedToolCall;
		context: ToolContext;
	}> = [];
	private resultHandler: (
		call: ApprovedToolCall,
		context: ToolContext,
	) => Promise<ToolResult> | ToolResult = (call) => ({
		toolCallId: call.id,
		success: true,
		data: { result: "mock-success" },
	});

	setHandler(
		fn: (
			call: ApprovedToolCall,
			context: ToolContext,
		) => Promise<ToolResult> | ToolResult,
	): this {
		this.resultHandler = fn;
		return this;
	}

	async execute(
		call: ApprovedToolCall,
		context: ToolContext,
	): Promise<ToolResult> {
		this.executedCalls.push({ call, context });
		return this.resultHandler(call, context);
	}

	clear(): void {
		this.executedCalls.length = 0;
	}
}

// ============================================================================
// UNIT TESTS
// ============================================================================

describe("AgentOrchestrator - Unit Tests", () => {
	let provider: FakeProvider;
	let registry: InMemoryToolRegistry;
	let executor: MockToolExecutor;
	let policy: ConfigurablePolicy;
	let approvals: InMemoryApprovalGate;
	let state: MemoryAgentState;
	let deps: AgentDependencies;
	let orchestrator: AgentOrchestrator;

	beforeEach(() => {
		provider = new FakeProvider();
		registry = new InMemoryToolRegistry();
		executor = new MockToolExecutor();
		policy = new ConfigurablePolicy({ action: "allow" });
		approvals = new InMemoryApprovalGate();
		state = new MemoryAgentState();

		deps = {
			provider,
			registry,
			executor,
			policy,
			approvals,
			state,
		};

		orchestrator = new AgentOrchestrator(deps);
	});

	describe("Initial State & Event Subscription", () => {
		it("initializes with status 'idle'", () => {
			expect(orchestrator.status).toBe("idle");
		});

		it("subscribes to events and receives emitted events", async () => {
			const events: AgentEvent[] = [];
			const unsubscribe = orchestrator.onEvent((e) => events.push(e));

			provider.enqueueTextResponse("Task finished.");
			await orchestrator.run("Hello");

			expect(events.length).toBeGreaterThan(0);
			expect(events.some((e) => e.type === "status_changed")).toBe(true);
			expect(events.some((e) => e.type === "task_updated")).toBe(true);
			expect(events.some((e) => e.type === "message_added")).toBe(true);

			unsubscribe();
			const countAfterUnsubscribe = events.length;
			provider.enqueueTextResponse("Second task");
			await orchestrator.run("Hello again");
			expect(events.length).toBe(countAfterUnsubscribe);
		});

		it("continues normally if an event listener throws an exception", async () => {
			orchestrator.onEvent(() => {
				throw new Error("Faulty listener");
			});

			provider.enqueueTextResponse("Success regardless");
			const task = await orchestrator.run("Test listener resilience");

			expect(task.status).toBe("completed");
			expect(task.result).toBe("Success regardless");
			expect(orchestrator.status).toBe("idle");
		});
	});

	describe("Concurrency & Reentrancy Guard", () => {
		it("throws an error when starting a task while another is active", async () => {
			provider.setResponder(async () => {
				// Simulate delayed LLM response
				await new Promise((r) => setTimeout(r, 50));
				return {
					id: "msg-1",
					role: "assistant",
					content: "Done",
					timestamp: Date.now(),
				};
			});

			const task1Promise = orchestrator.run("Task 1");

			await expect(orchestrator.run("Task 2")).rejects.toThrow(
				"Agent is already running a task.",
			);

			await task1Promise;
			expect(orchestrator.status).toBe("idle");
		});
	});

	describe("Simple Task Execution (No Tool Calls)", () => {
		it("executes a single-turn prompt and completes successfully", async () => {
			const events: AgentEvent[] = [];
			orchestrator.onEvent((e) => events.push(e));

			provider.enqueueTextResponse("Here is the answer.");

			const task = await orchestrator.run("What is 2+2?");

			expect(task.status).toBe("completed");
			expect(task.result).toBe("Here is the answer.");
			expect(task.description).toBe("What is 2+2?");
			expect(task.completedAt).toBeDefined();
			expect(orchestrator.status).toBe("idle");

			// Verify event sequence:
			// 1. task_updated (running)
			// 2. message_added (user message)
			// 3. status_changed (thinking)
			// 4. message_added (assistant message)
			// 5. task_updated (completed)
			// 6. status_changed (idle)
			const eventTypes = events.map((e) => e.type);
			expect(eventTypes).toEqual([
				"task_updated",
				"message_added",
				"status_changed",
				"message_added",
				"task_updated",
				"status_changed",
			]);

			const userEvent = events[1];
			if (userEvent.type === "message_added") {
				expect(userEvent.message.role).toBe("user");
				expect((userEvent.message as any).content).toBe("What is 2+2?");
			}

			const assistantEvent = events[3];
			if (assistantEvent.type === "message_added") {
				expect(assistantEvent.message.role).toBe("assistant");
				expect((assistantEvent.message as any).content).toBe(
					"Here is the answer.",
				);
			}
		});

		it("passes cloned messages and definitions to provider so provider cannot mutate internal state", async () => {
			registry.register({
				definition: {
					name: "test_tool",
					description: "A test tool",
					riskLevel: "read",
					inputSchema: { type: "object", properties: {} },
				},
				execute: async () => ({ toolCallId: "1", success: true, data: {} }),
			});

			provider.setResponder(async (messages, tools) => {
				// Attempt to mutate parameters
				(messages as any[]).push({ role: "fake" });
				(tools as any[]).length = 0;
				return {
					id: "msg-1",
					role: "assistant",
					content: "Safe",
					timestamp: Date.now(),
				};
			});

			const task = await orchestrator.run("Safety check");
			expect(task.status).toBe("completed");
			expect(registry.definitions()).toHaveLength(1);
		});
	});

	describe("LLM Response Validation & Error Handling", () => {
		it("fails task when LLM returns a non-object", async () => {
			provider.enqueueResponse("invalid string response");

			const events: AgentEvent[] = [];
			orchestrator.onEvent((e) => events.push(e));

			const task = await orchestrator.run("Run invalid");

			expect(task.status).toBe("failed");
			expect(task.error).toBe("The task failed.");
			expect(orchestrator.status).toBe("idle");
			expect(
				events.some(
					(e) => e.type === "error" && e.error.code === "TASK_FAILED",
				),
			).toBe(true);
		});

		it("fails task when assistant message has invalid role or missing properties", async () => {
			provider.enqueueResponse({
				role: "user", // wrong role
				content: "hello",
				id: "123",
				timestamp: Date.now(),
			});

			const task = await orchestrator.run("Bad role");
			expect(task.status).toBe("failed");
			expect(task.error).toBe("The task failed.");
		});

		it("fails task when timestamp is non-finite", async () => {
			provider.enqueueResponse({
				role: "assistant",
				content: "hello",
				id: "123",
				timestamp: Number.POSITIVE_INFINITY,
			});

			const task = await orchestrator.run("Infinite timestamp");
			expect(task.status).toBe("failed");
		});

		it("fails task when toolCalls is not an array", async () => {
			provider.enqueueResponse({
				role: "assistant",
				content: "hello",
				id: "123",
				timestamp: Date.now(),
				toolCalls: "not-an-array",
			});

			const task = await orchestrator.run("Bad toolCalls type");
			expect(task.status).toBe("failed");
		});

		it("fails task when tool call ID is empty or whitespace", async () => {
			provider.enqueueResponse({
				role: "assistant",
				content: "hello",
				id: "123",
				timestamp: Date.now(),
				toolCalls: [{ id: "   ", toolName: "tool1", arguments: {} }],
			});

			const task = await orchestrator.run("Empty call id");
			expect(task.status).toBe("failed");
		});

		it("fails task when tool call has duplicate IDs in the same response", async () => {
			provider.enqueueResponse({
				role: "assistant",
				content: "hello",
				id: "123",
				timestamp: Date.now(),
				toolCalls: [
					{ id: "call-1", toolName: "tool1", arguments: {} },
					{ id: "call-1", toolName: "tool2", arguments: {} },
				],
			});

			const task = await orchestrator.run("Duplicate call id");
			expect(task.status).toBe("failed");
		});

		it("fails task when tool call arguments contain non-finite numbers", async () => {
			provider.enqueueResponse({
				role: "assistant",
				content: "hello",
				id: "123",
				timestamp: Date.now(),
				toolCalls: [
					{ id: "call-1", toolName: "tool1", arguments: { val: Number.NaN } },
				],
			});

			const task = await orchestrator.run("NaN argument");
			expect(task.status).toBe("failed");
		});

		it("fails task when tool call arguments contain circular or repeated object references", async () => {
			const shared = { key: "val" };
			provider.enqueueResponse({
				role: "assistant",
				content: "hello",
				id: "123",
				timestamp: Date.now(),
				toolCalls: [
					{
						id: "call-1",
						toolName: "tool1",
						arguments: { a: shared, b: shared },
					},
				],
			});

			const task = await orchestrator.run("Repeated object reference");
			expect(task.status).toBe("failed");
		});

		it("fails task when tool call arguments contain symbol keys or non-plain prototypes", async () => {
			provider.enqueueResponse({
				role: "assistant",
				content: "hello",
				id: "123",
				timestamp: Date.now(),
				toolCalls: [
					{ id: "call-1", toolName: "tool1", arguments: { date: new Date() } },
				],
			});

			const task = await orchestrator.run("Non-plain object argument");
			expect(task.status).toBe("failed");
		});
	});

	describe("Step Limit Enforcement", () => {
		it("fails task when execution exceeds MAX_STEPS (20 steps)", async () => {
			// Always return a tool call without ever returning a pure text response
			provider.setResponder(async () => ({
				id: globalThis.crypto.randomUUID(),
				role: "assistant",
				content: "Running tool",
				timestamp: Date.now(),
				toolCalls: [
					{
						id: globalThis.crypto.randomUUID(),
						toolName: "test_tool",
						arguments: { step: 1 },
					},
				],
			}));

			const task = await orchestrator.run("Infinite loop test");

			expect(task.status).toBe("failed");
			expect(task.error).toBe("The task failed.");
			expect(provider.calls.length).toBe(20);
			expect(executor.executedCalls.length).toBe(20);
			expect(orchestrator.status).toBe("idle");
		});
	});

	describe("Tool Execution & Policy Actions", () => {
		beforeEach(() => {
			registry.register({
				definition: {
					name: "compute",
					description: "Perform computation",
					riskLevel: "read",
					inputSchema: { type: "object", properties: {} },
				},
				execute: async () => ({ toolCallId: "c1", success: true, data: 42 }),
			});
		});

		it("dispatches to executor when policy returns 'allow'", async () => {
			policy.setEvaluator(() => ({ action: "allow" }));

			provider.enqueueToolCallResponse("Let me compute", [
				{ id: "call-compute", toolName: "compute", arguments: { x: 10 } },
			]);
			provider.enqueueTextResponse("The answer is 42");

			const events: AgentEvent[] = [];
			orchestrator.onEvent((e) => events.push(e));

			const task = await orchestrator.run("Compute something");

			expect(task.status).toBe("completed");
			expect(task.result).toBe("The answer is 42");
			expect(executor.executedCalls.length).toBe(1);
			expect(executor.executedCalls[0].call.toolName).toBe("compute");
			expect(executor.executedCalls[0].call.arguments).toEqual({ x: 10 });
			expect(executor.executedCalls[0].context.taskId).toBe(task.id);

			expect(events.some((e) => e.type === "tool_call_started")).toBe(true);
			expect(events.some((e) => e.type === "tool_call_finished")).toBe(true);
		});

		it("blocks execution without calling executor when policy returns 'block'", async () => {
			policy.setEvaluator(() => ({
				action: "block",
				reason: "Blocked by security policy",
			}));

			provider.enqueueToolCallResponse("Calling tool", [
				{ id: "call-blocked", toolName: "compute", arguments: {} },
			]);
			provider.enqueueTextResponse("I was unable to run the tool.");

			const events: AgentEvent[] = [];
			orchestrator.onEvent((e) => events.push(e));

			const task = await orchestrator.run("Try blocked tool");

			expect(task.status).toBe("completed");
			expect(executor.executedCalls.length).toBe(0);

			const finishedEvent = events.find((e) => e.type === "tool_call_finished");
			expect(finishedEvent).toBeDefined();
			if (finishedEvent && finishedEvent.type === "tool_call_finished") {
				expect(finishedEvent.result.success).toBe(false);
				if (!finishedEvent.result.success) {
					expect(finishedEvent.result.error.code).toBe("PERMISSION_DENIED");
					expect(finishedEvent.result.error.message).toBe(
						"This action is not permitted.",
					);
				}
			}

			// Verify the ToolMessage sent to the provider indicates PERMISSION_DENIED
			const secondCallMessages = provider.calls[1].messages;
			const toolMessage = secondCallMessages[secondCallMessages.length - 1];
			expect(toolMessage.role).toBe("tool");
			if (toolMessage.role === "tool") {
				expect(toolMessage.toolResult.success).toBe(false);
			}
		});

		it("records warning in state and still executes tool when policy returns 'warn'", async () => {
			policy.setEvaluator(() => ({
				action: "warn",
				reason: "Use with caution",
			}));

			provider.enqueueToolCallResponse("Calling with warning", [
				{ id: "call-warn", toolName: "compute", arguments: { flag: true } },
			]);
			provider.enqueueTextResponse("Computation done");

			const task = await orchestrator.run("Run warning");

			expect(task.status).toBe("completed");
			expect(executor.executedCalls.length).toBe(1);

			// State should have warning recorded: warning:taskId:uuid
			const entries = state.entries();
			const warningEntry = entries.find(([k]) =>
				k.startsWith(`warning:${task.id}:`),
			);
			expect(warningEntry).toBeDefined();
			expect(warningEntry![1]).toEqual({
				toolCallId: "call-warn",
				reason: "Use with caution",
			});
		});

		it("waits for approval when policy returns 'approve' and executes upon user approval", async () => {
			registry.register({
				definition: {
					name: "delete_db",
					description: "Deletes DB",
					riskLevel: "destructive",
					inputSchema: { type: "object", properties: {} },
				},
				execute: async () => ({
					toolCallId: "c2",
					success: true,
					data: "deleted",
				}),
			});

			policy.setEvaluator(() => ({
				action: "approve",
				reason: "Destructive database operation",
			}));

			provider.enqueueToolCallResponse("Deleting database", [
				{
					id: "call-del",
					toolName: "delete_db",
					arguments: { target: "prod" },
				},
			]);
			provider.enqueueTextResponse("Database deletion complete");

			let approvalId = "";
			let approvalRiskLevel: RiskLevel | undefined;

			orchestrator.onEvent((event) => {
				if (event.type === "approval_requested") {
					approvalId = event.request.id;
					approvalRiskLevel = event.request.riskLevel;

					// Respond to approval
					setTimeout(() => {
						orchestrator.respondToApproval({
							requestId: approvalId,
							decision: "approve",
							respondedAt: Date.now(),
						});
					}, 10);
				}
			});

			const task = await orchestrator.run("Delete prod DB");

			expect(task.status).toBe("completed");
			expect(approvalRiskLevel).toBe("destructive");
			expect(executor.executedCalls.length).toBe(1);
			expect(executor.executedCalls[0].call.toolName).toBe("delete_db");
		});

		it("defaults riskLevel in approval request to 'write' if tool is not destructive or not found", async () => {
			policy.setEvaluator(() => ({
				action: "approve",
				reason: "Approval needed",
			}));

			provider.enqueueToolCallResponse("Call tool", [
				{ id: "call-1", toolName: "compute", arguments: {} },
			]);
			provider.enqueueTextResponse("Done");

			let riskLevel: string | undefined;
			orchestrator.onEvent((event) => {
				if (event.type === "approval_requested") {
					riskLevel = event.request.riskLevel;
					orchestrator.respondToApproval({
						requestId: event.request.id,
						decision: "approve",
						respondedAt: Date.now(),
					});
				}
			});

			await orchestrator.run("Test risk level fallback");
			expect(riskLevel).toBe("write");
		});

		it("returns REJECTED_BY_USER failure and skips executor when user rejects approval", async () => {
			policy.setEvaluator(() => ({
				action: "approve",
				reason: "Approval needed",
			}));

			provider.enqueueToolCallResponse("Call tool", [
				{ id: "call-1", toolName: "compute", arguments: {} },
			]);
			provider.enqueueTextResponse("Handled rejection");

			orchestrator.onEvent((event) => {
				if (event.type === "approval_requested") {
					orchestrator.respondToApproval({
						requestId: event.request.id,
						decision: "reject",
						reason: "User denied permission",
						respondedAt: Date.now(),
					});
				}
			});

			const task = await orchestrator.run("Test approval rejection");

			expect(task.status).toBe("completed");
			expect(executor.executedCalls.length).toBe(0);

			const secondCallMessages = provider.calls[1].messages;
			const toolMessage = secondCallMessages[secondCallMessages.length - 1];
			if (toolMessage.role === "tool") {
				expect(toolMessage.toolResult.success).toBe(false);
				if (!toolMessage.toolResult.success) {
					expect(toolMessage.toolResult.error.code).toBe("REJECTED_BY_USER");
					expect(toolMessage.toolResult.error.message).toBe(
						"The user rejected this action.",
					);
				}
			}
		});

		it("fails with PERMISSION_DENIED if approval verification hash check fails", async () => {
			policy.setEvaluator(() => ({
				action: "approve",
				reason: "Approval needed",
			}));

			// Mock approval gate where verify returns false
			approvals.verify = async () => false;

			provider.enqueueToolCallResponse("Call tool", [
				{ id: "call-1", toolName: "compute", arguments: {} },
			]);
			provider.enqueueTextResponse("Approval hash mismatch");

			orchestrator.onEvent((event) => {
				if (event.type === "approval_requested") {
					orchestrator.respondToApproval({
						requestId: event.request.id,
						decision: "approve",
						respondedAt: Date.now(),
					});
				}
			});

			const task = await orchestrator.run("Test verification failure");

			expect(task.status).toBe("completed");
			expect(executor.executedCalls.length).toBe(0);

			const secondCallMessages = provider.calls[1].messages;
			const toolMessage = secondCallMessages[secondCallMessages.length - 1];
			if (toolMessage.role === "tool") {
				expect(toolMessage.toolResult.success).toBe(false);
				if (!toolMessage.toolResult.success) {
					expect(toolMessage.toolResult.error.code).toBe("PERMISSION_DENIED");
					expect(toolMessage.toolResult.error.message).toBe(
						"The approval no longer matches this action.",
					);
				}
			}
		});

		it("emits UNKNOWN_APPROVAL error when responding to an invalid or unknown approval request", () => {
			const events: AgentEvent[] = [];
			orchestrator.onEvent((e) => events.push(e));

			orchestrator.respondToApproval({
				requestId: "non-existent-id",
				decision: "approve",
				respondedAt: Date.now(),
			});

			const err = events.find((e) => e.type === "error");
			expect(err).toBeDefined();
			if (err && err.type === "error") {
				expect(err.error.code).toBe("UNKNOWN_APPROVAL");
				expect(err.error.message).toBe(
					"No pending approval matches this request.",
				);
			}
		});
	});

	describe("Cancellation Handling", () => {
		it("ignores cancel if taskId does not match the active task", async () => {
			provider.setResponder(async () => {
				orchestrator.cancel("different-task-id");
				return {
					id: "msg-1",
					role: "assistant",
					content: "Completed successfully",
					timestamp: Date.now(),
				};
			});

			const task = await orchestrator.run("Test invalid cancel");
			expect(task.status).toBe("completed");
			expect(task.result).toBe("Completed successfully");
		});

		it("cancels task while provider is generating response", async () => {
			let runningTaskId = "";

			orchestrator.onEvent((e) => {
				if (e.type === "task_updated" && e.task.status === "running") {
					runningTaskId = e.task.id;
				}
			});

			provider.setResponder(async (_msgs, _tools, signal) => {
				orchestrator.cancel(runningTaskId);
				if (signal?.aborted) {
					throw new Error("Aborted");
				}
				return {
					id: "1",
					role: "assistant",
					content: "Never returned",
					timestamp: Date.now(),
				};
			});

			const task = await orchestrator.run("Cancel during LLM");

			expect(task.status).toBe("cancelled");
			expect(task.completedAt).toBeDefined();
			expect(orchestrator.status).toBe("idle");
		});

		it("cancels task while waiting for user approval and unblocks pending approvals", async () => {
			policy.setEvaluator(() => ({
				action: "approve",
				reason: "Needs approval",
			}));

			provider.enqueueToolCallResponse("Call tool", [
				{ id: "call-1", toolName: "tool1", arguments: {} },
			]);

			let taskId = "";
			orchestrator.onEvent((e) => {
				if (e.type === "task_updated" && e.task.status === "running") {
					taskId = e.task.id;
				}
				if (e.type === "approval_requested") {
					// Cancel the task instead of answering approval
					setTimeout(() => {
						orchestrator.cancel(taskId);
					}, 10);
				}
			});

			const task = await orchestrator.run("Cancel during approval");

			expect(task.status).toBe("cancelled");
			expect(task.completedAt).toBeDefined();
			expect(orchestrator.status).toBe("idle");
			expect(executor.executedCalls.length).toBe(0);
		});
	});
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("AgentOrchestrator - Integration Tests", () => {
	let provider: FakeProvider;
	let registry: InMemoryToolRegistry;
	let executor: RegistryToolExecutor;
	let policy: ConfigurablePolicy;
	let approvals: InMemoryApprovalGate;
	let state: MemoryAgentState;
	let orchestrator: AgentOrchestrator;

	// In-memory collection of data for realistic tools
	let database: Map<string, string>;

	beforeEach(() => {
		provider = new FakeProvider();
		registry = new InMemoryToolRegistry();
		executor = new RegistryToolExecutor(registry);
		policy = new ConfigurablePolicy({ action: "allow" });
		approvals = new InMemoryApprovalGate();
		state = new MemoryAgentState();
		database = new Map<string, string>();

		// Real Tool 1: Calculator (Read-only, allowed)
		const calculatorTool: Tool = {
			definition: {
				name: "calculator",
				description: "Performs basic arithmetic",
				riskLevel: "read",
				inputSchema: {
					type: "object",
					properties: {
						a: { type: "number" },
						b: { type: "number" },
						op: { type: "string" },
					},
					required: ["a", "b", "op"],
				},
			},
			execute: async (args) => {
				const { a, b, op } = args as { a: number; b: number; op: string };
				let val: number;
				if (op === "add") val = a + b;
				else if (op === "multiply") val = a * b;
				else throw new Error(`Unknown operator: ${op}`);
				return {
					toolCallId: "calc-res",
					success: true,
					data: { result: val },
				};
			},
		};

		// Real Tool 2: Create Record (Write, requires approval)
		const createRecordTool: Tool = {
			definition: {
				name: "create_record",
				description: "Creates a record in the database",
				riskLevel: "write",
				inputSchema: {
					type: "object",
					properties: {
						id: { type: "string" },
						value: { type: "string" },
					},
					required: ["id", "value"],
				},
			},
			execute: async (args) => {
				const { id, value } = args as { id: string; value: string };
				database.set(id, value);
				return {
					toolCallId: "create-res",
					success: true,
					data: { id, created: true },
				};
			},
		};

		// Real Tool 3: Dangerous Drop (Destructive, blocked)
		const dropDatabaseTool: Tool = {
			definition: {
				name: "drop_database",
				description: "Drops the entire database",
				riskLevel: "destructive",
				inputSchema: { type: "object", properties: {} },
			},
			execute: async () => {
				database.clear();
				return {
					toolCallId: "drop-res",
					success: true,
					data: { dropped: true },
				};
			},
		};

		// Real Tool 4: Faulty Tool (Throws error)
		const faultyTool: Tool = {
			definition: {
				name: "faulty_tool",
				description: "Throws an unexpected error",
				riskLevel: "read",
				inputSchema: { type: "object", properties: {} },
			},
			execute: async () => {
				throw new Error("Crash in tool execution");
			},
		};

		registry.register(calculatorTool);
		registry.register(createRecordTool);
		registry.register(dropDatabaseTool);
		registry.register(faultyTool);

		// Realistic Security Policy
		policy.setEvaluator((call: ToolCall): PolicyDecision => {
			if (call.toolName === "drop_database") {
				return {
					action: "block",
					reason: "Dropping the database is forbidden.",
				};
			}
			if (call.toolName === "create_record") {
				return {
					action: "approve",
					reason: "Record creation requires user authorization.",
				};
			}
			return { action: "allow" };
		});

		orchestrator = new AgentOrchestrator({
			provider,
			registry,
			executor,
			policy,
			approvals,
			state,
		});
	});

	it("integrates end-to-end multi-turn conversation with real tool execution", async () => {
		// Turn 1: User asks computation -> LLM requests calculator tool
		provider.enqueueToolCallResponse("Calculating sum", [
			{
				id: "call-calc-1",
				toolName: "calculator",
				arguments: { a: 15, b: 27, op: "add" },
			},
		]);

		// Turn 2: LLM receives tool result and provides final text answer
		provider.enqueueTextResponse("The sum of 15 and 27 is 42.");

		const task = await orchestrator.run("Calculate 15 + 27");

		expect(task.status).toBe("completed");
		expect(task.result).toBe("The sum of 15 and 27 is 42.");
		expect(provider.calls.length).toBe(2);

		// Verify the ToolMessage in history contains actual tool output
		const turn2Messages = provider.calls[1].messages;
		const toolMsg = turn2Messages.find((m) => m.role === "tool");
		expect(toolMsg).toBeDefined();
		if (toolMsg && toolMsg.role === "tool") {
			expect(toolMsg.toolResult.success).toBe(true);
			if (toolMsg.toolResult.success) {
				expect(toolMsg.toolResult.data).toEqual({ result: 42 });
			}
		}
	});

	it("integrates approval flow with real RegistryToolExecutor and state mutation", async () => {
		// Turn 1: LLM calls create_record
		provider.enqueueToolCallResponse("Creating record", [
			{
				id: "call-cr-1",
				toolName: "create_record",
				arguments: { id: "item-100", value: "Widget A" },
			},
		]);
		// Turn 2: LLM summarizes result
		provider.enqueueTextResponse(
			"Created record item-100 with value Widget A.",
		);

		orchestrator.onEvent((event) => {
			if (event.type === "approval_requested") {
				expect(event.request.summary).toContain("create_record");
				expect(event.request.summary).toContain("Widget A");
				orchestrator.respondToApproval({
					requestId: event.request.id,
					decision: "approve",
					respondedAt: Date.now(),
				});
			}
		});

		const task = await orchestrator.run("Create record item-100");

		expect(task.status).toBe("completed");
		expect(task.result).toBe("Created record item-100 with value Widget A.");
		expect(database.get("item-100")).toBe("Widget A");
	});

	it("integrates blocked tool flow where RegistryToolExecutor is skipped", async () => {
		database.set("persisted", "important-data");

		// Turn 1: LLM requests drop_database
		provider.enqueueToolCallResponse("Dropping DB", [
			{
				id: "call-drop-1",
				toolName: "drop_database",
				arguments: {},
			},
		]);
		// Turn 2: LLM receives permission denied and reports back
		provider.enqueueTextResponse(
			"I cannot drop the database because policy prevented it.",
		);

		const task = await orchestrator.run("Drop DB");

		expect(task.status).toBe("completed");
		expect(task.result).toBe(
			"I cannot drop the database because policy prevented it.",
		);
		// Database was not cleared
		expect(database.get("persisted")).toBe("important-data");

		const turn2Messages = provider.calls[1].messages;
		const toolMsg = turn2Messages.find((m) => m.role === "tool");
		if (toolMsg && toolMsg.role === "tool") {
			expect(toolMsg.toolResult.success).toBe(false);
			if (!toolMsg.toolResult.success) {
				expect(toolMsg.toolResult.error.code).toBe("PERMISSION_DENIED");
			}
		}
	});

	it("integrates tool throwing error: RegistryToolExecutor converts to TOOL_EXECUTION_FAILED", async () => {
		provider.enqueueToolCallResponse("Calling faulty", [
			{
				id: "call-faulty-1",
				toolName: "faulty_tool",
				arguments: {},
			},
		]);
		provider.enqueueTextResponse("The tool encountered an internal error.");

		const task = await orchestrator.run("Run faulty tool");

		expect(task.status).toBe("completed");
		expect(task.result).toBe("The tool encountered an internal error.");

		const turn2Messages = provider.calls[1].messages;
		const toolMsg = turn2Messages.find((m) => m.role === "tool");
		if (toolMsg && toolMsg.role === "tool") {
			expect(toolMsg.toolResult.success).toBe(false);
			if (!toolMsg.toolResult.success) {
				expect(toolMsg.toolResult.error.code).toBe("TOOL_EXECUTION_FAILED");
				expect(toolMsg.toolResult.error.message).toBe(
					"The tool failed unexpectedly.",
				);
			}
		}
	});

	it("integrates calling an unregistered tool: RegistryToolExecutor returns UNKNOWN_TOOL", async () => {
		provider.enqueueToolCallResponse("Calling missing tool", [
			{
				id: "call-unknown-1",
				toolName: "non_existent_tool",
				arguments: {},
			},
		]);
		provider.enqueueTextResponse("I could not find that tool.");

		const task = await orchestrator.run("Run unknown tool");

		expect(task.status).toBe("completed");
		expect(task.result).toBe("I could not find that tool.");

		const turn2Messages = provider.calls[1].messages;
		const toolMsg = turn2Messages.find((m) => m.role === "tool");
		if (toolMsg && toolMsg.role === "tool") {
			expect(toolMsg.toolResult.success).toBe(false);
			if (!toolMsg.toolResult.success) {
				expect(toolMsg.toolResult.error.code).toBe("UNKNOWN_TOOL");
				expect(toolMsg.toolResult.error.message).toBe(
					"Unknown tool: non_existent_tool",
				);
			}
		}
	});

	it("integrates long-running cancellable tool with AbortSignal", async () => {
		let wasAborted = false;

		const longRunningTool: Tool = {
			definition: {
				name: "long_running",
				description: "Simulates work that checks abort signal",
				riskLevel: "read",
				inputSchema: { type: "object", properties: {} },
			},
			execute: async (_args, context) => {
				return new Promise<ToolResult>((resolve) => {
					context.signal?.addEventListener("abort", () => {
						wasAborted = true;
						resolve({
							toolCallId: "call-long",
							success: false,
							error: {
								code: "TIMEOUT",
								message: "Tool aborted",
								retryable: false,
							},
						});
					});
				});
			},
		};

		registry.register(longRunningTool);

		provider.enqueueToolCallResponse("Starting work", [
			{
				id: "call-long",
				toolName: "long_running",
				arguments: {},
			},
		]);

		let taskId = "";
		orchestrator.onEvent((event) => {
			if (event.type === "tool_call_started") {
				// Cancel task mid execution
				setTimeout(() => {
					orchestrator.cancel(taskId);
				}, 10);
			}
			if (event.type === "task_updated" && event.task.status === "running") {
				taskId = event.task.id;
			}
		});

		const task = await orchestrator.run("Do long work");

		expect(task.status).toBe("cancelled");
		expect(wasAborted).toBe(true);
		expect(orchestrator.status).toBe("idle");
	});
});
