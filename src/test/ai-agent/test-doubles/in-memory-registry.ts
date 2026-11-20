import type {
	Tool,
	ToolDefinition,
} from "../../../fetch-client-ai-agent/types/agent-contracts";
import type { ToolRegistry } from "../../../fetch-client-ai-agent/types/agent-dependencies";

export class InMemoryToolRegistry implements ToolRegistry {
	private readonly tools = new Map<string, Tool>();

	register(tool: Tool): this {
		this.tools.set(tool.definition.name, tool);
		return this;
	}

	lookup(name: string): Tool | undefined {
		return this.tools.get(name);
	}

	definitions(): readonly ToolDefinition[] {
		return Array.from(this.tools.values()).map((t) => t.definition);
	}

	clear(): void {
		this.tools.clear();
	}
}
