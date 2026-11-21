import Ajv, { type ValidateFunction } from "ajv";
import type { ITool, IToolContext, ToolResult } from "../types/agent-contracts";
import type {
	ApprovedToolCall,
	IToolExecutor,
	IToolRegistry,
} from "../types/agent-dependencies";

export class RegistryToolExecutor implements IToolExecutor {
	private readonly ajv = new Ajv({ allErrors: false });
	private readonly validators = new Map<string, ValidateFunction>();

	constructor(private readonly registry: IToolRegistry) {}

	async execute(
		call: ApprovedToolCall,
		context: IToolContext,
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

		const validate = this.validatorFor(tool);
		if (!validate(call.arguments)) {
			return {
				toolCallId: call.id,
				success: false,
				error: {
					code: "INVALID_ARGUMENTS",
					message: "Tool arguments do not match the schema.",
					retryable: false,
				},
			};
		}

		try {
			return await tool.execute(call.arguments, context);
		} catch {
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

	private validatorFor(tool: ITool): ValidateFunction {
		let validate = this.validators.get(tool.definition.name);
		if (!validate) {
			validate = this.ajv.compile(tool.definition.inputSchema);
			this.validators.set(tool.definition.name, validate);
		}
		return validate;
	}
}
