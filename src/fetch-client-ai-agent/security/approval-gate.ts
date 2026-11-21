// The gate owns the approval record and the version comparison.
// Callers never compare hashes themselves.
export interface ApprovalGate {
	// Called by the UI when the user approves a specific proposal version.
	grant(proposalId: string, proposalHash: string): Promise<void>;

	// Returns true only if the stored approval matches the current hash.
	// A changed proposal produces a different hash, so the old approval fails.
	verify(proposalId: string, currentHash: string): Promise<boolean>;
}
