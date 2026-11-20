import type { AgentState } from "../../../fetch-client-ai-agent/types/agent-dependencies";

export class MemoryAgentState implements AgentState {
	private readonly data = new Map<string, unknown>();

	get(key: string): unknown {
		return this.data.get(key);
	}

	set(key: string, value: unknown): void {
		this.data.set(key, value);
	}

	has(key: string): boolean {
		return this.data.has(key);
	}

	entries(): [string, unknown][] {
		return Array.from(this.data.entries());
	}

	clear(): void {
		this.data.clear();
	}
}
