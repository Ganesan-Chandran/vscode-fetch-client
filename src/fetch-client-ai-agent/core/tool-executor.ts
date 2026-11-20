import type { ToolContext, ToolResult } from "../types/agent-contracts";
import type {
	ApprovedToolCall,
	ToolExecutor,
	ToolRegistry,
} from "../types/agent-dependencies";

export class RegistryToolExecutor implements ToolExecutor {
	constructor(private readonly registry: ToolRegistry) {}

	async execute(
		call: ApprovedToolCall,
		context: ToolContext,
	): Promise<ToolResult> {
		const tool = this.registry.lookup(call.toolName);
		if (!tool) {
			return {
				toolCallId: call.id,
				success: false,
				error: {
					code: "UNKNOWN_TOOL",
					message: `Unknown tool: ${call.toolName}`,
					retryable: false,
				},
			};
		}

		try {
			return await tool.execute(call.arguments, context);
		} catch (err) {
			return {
				toolCallId: call.id,
				success: false,
				error: {
					code: "TOOL_EXECUTION_FAILED",
					message: "The tool failed unexpectedly.",
					retryable: false,
				},
			};
		}
	}
}
