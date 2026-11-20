import type { ApprovalGate } from "../../../fetch-client-ai-agent/security/approval-gate";

export class InMemoryApprovalGate implements ApprovalGate {
	private readonly grantedHashes = new Map<string, string>();

	async grant(proposalId: string, proposalHash: string): Promise<void> {
		this.grantedHashes.set(proposalId, proposalHash);
	}

	async verify(proposalId: string, currentHash: string): Promise<boolean> {
		return this.grantedHashes.get(proposalId) === currentHash;
	}

	clear(): void {
		this.grantedHashes.clear();
	}
}
