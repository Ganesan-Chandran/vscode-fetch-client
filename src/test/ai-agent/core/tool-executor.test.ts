import { describe, it, expect, vi } from "vitest";
import { RegistryToolExecutor } from "../../../fetch-client-ai-agent/core/tool-executor";
import { InMemoryToolRegistry } from "../test-doubles/in-memory-registry";
import type { ApprovedToolCall } from "../../../fetch-client-ai-agent/types/agent-dependencies";
import type {
	IJSONSchema,
	ITool,
	IToolContext,
} from "../../../fetch-client-ai-agent/types/agent-contracts";

const ctx: IToolContext = { taskId: "task-1" };

const echoSchema: IJSONSchema = {
	type: "object",
	properties: { text: { type: "string" } },
	required: ["text"],
	additionalProperties: false,
};

function makeEchoTool(execute: ITool["execute"]): ITool {
	return {
		definition: {
			name: "echo",
			description: "Echo text back",
			inputSchema: echoSchema,
			riskLevel: "read",
		},
		execute,
	};
}

function approvedCall(
	overrides: Partial<{
		id: string;
		toolName: string;
		arguments: Record<string, unknown>;
	}> = {},
): ApprovedToolCall {
	return {
		id: "call-1",
		toolName: "echo",
		arguments: { text: "hi" },
		status: "approved",
		requiresApproval: false,
		...overrides,
	} as ApprovedToolCall; // brand is compile-time only
}

describe("RegistryToolExecutor", () => {
	it("returns success for valid input", async () => {
		const execute = vi.fn<ITool["execute"]>(async (args) => ({
			toolCallId: "call-1",
			success: true,
			data: args,
		}));
		const registry = new InMemoryToolRegistry().register(makeEchoTool(execute));
		const executor = new RegistryToolExecutor(registry);

		const result = await executor.execute(approvedCall(), ctx);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({ text: "hi" });
		}
		expect(execute).toHaveBeenCalledTimes(1);
	});

	it("returns INVALID_ARGUMENTS and never runs the tool for invalid input", async () => {
		const execute = vi.fn<ITool["execute"]>(async (args) => ({
			toolCallId: "call-1",
			success: true,
			data: args,
		}));
		const registry = new InMemoryToolRegistry().register(makeEchoTool(execute));
		const executor = new RegistryToolExecutor(registry);

		const result = await executor.execute(
			approvedCall({ arguments: { text: 42 } }),
			ctx,
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.code).toBe("INVALID_ARGUMENTS");
			expect(result.error.retryable).toBe(false);
		}
		expect(execute).not.toHaveBeenCalled();
	});

	it("converts a thrown error into TOOL_EXECUTION_FAILED without leaking details", async () => {
		const execute = vi.fn<ITool["execute"]>(async () => {
			throw new Error("boom at /secret/path");
		});
		const registry = new InMemoryToolRegistry().register(makeEchoTool(execute));
		const executor = new RegistryToolExecutor(registry);

		const result = await executor.execute(approvedCall(), ctx);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.code).toBe("TOOL_EXECUTION_FAILED");
			expect(result.error.message).not.toContain("boom");
			expect(result.error.message).not.toContain("/secret/path");
		}
	});

	it("returns UNKNOWN_TOOL for an unregistered tool name", async () => {
		const executor = new RegistryToolExecutor(new InMemoryToolRegistry());

		const result = await executor.execute(
			approvedCall({ toolName: "missing" }),
			ctx,
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.code).toBe("UNKNOWN_TOOL");
			expect(result.toolCallId).toBe("call-1");
		}
	});
});
