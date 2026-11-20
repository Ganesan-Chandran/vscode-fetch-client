import type { ToolCall } from "../../../fetch-client-ai-agent/types/agent-contracts";
import type {
	PolicyDecision,
	SecurityPolicy,
} from "../../../fetch-client-ai-agent/types/agent-dependencies";

export class DenyAllPolicy implements SecurityPolicy {
	constructor(
		private readonly reason: string = "This action is not permitted.",
	) {}

	async evaluate(_call: ToolCall): Promise<PolicyDecision> {
		return { action: "block", reason: this.reason };
	}
}

export class ConfigurablePolicy implements SecurityPolicy {
	private evaluator: (
		call: ToolCall,
	) => Promise<PolicyDecision> | PolicyDecision;

	constructor(defaultDecision: PolicyDecision = { action: "allow" }) {
		this.evaluator = () => defaultDecision;
	}

	setEvaluator(
		fn: (call: ToolCall) => Promise<PolicyDecision> | PolicyDecision,
	): this {
		this.evaluator = fn;
		return this;
	}

	async evaluate(call: ToolCall): Promise<PolicyDecision> {
		return this.evaluator(call);
	}
}
