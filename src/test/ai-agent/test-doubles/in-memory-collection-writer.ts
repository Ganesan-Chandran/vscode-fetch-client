import type {
	ApprovedChanges,
	CollectionWriter,
} from "../../../fetch-client-ai-agent/types/agent-dependencies";

export class InMemoryCollectionWriter implements CollectionWriter {
	public readonly saved: ApprovedChanges[] = [];

	async save(changes: ApprovedChanges): Promise<void> {
		this.saved.push(changes);
	}

	clear(): void {
		this.saved.length = 0;
	}
}
