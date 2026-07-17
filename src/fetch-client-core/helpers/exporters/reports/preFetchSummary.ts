import { ExportPreFetchStep } from "../../../types/export.types";

function summarizeStep(step: ExportPreFetchStep, depth: number): string {
	const marker = depth > 0 ? `${">".repeat(depth)} ` : "";
	const label = `${marker}${step.name} (${step.status}, ${step.passed ? "Pass" : "Fail"})`;
	const childSummaries = step.children.map((c) => summarizeStep(c, depth + 1));
	return [label, ...childSummaries].join(" | ");
}

/** One-line, delimiter-safe summary of a pre-fetch chain - used by CSV and NUnit. */
export function summarizePreFetch(steps: ExportPreFetchStep[]): string {
	if (steps.length === 0) {
		return "";
	}
	return steps.map((s) => summarizeStep(s, 0)).join(" | ");
}
