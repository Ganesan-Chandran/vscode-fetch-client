import { RunResult } from "../utils/display";

export type ExportFormat = "csv" | "html" | "json" | "xml" | "nunit";

export const SUPPORTED_EXPORT_FORMATS: readonly ExportFormat[] = [
	"csv",
	"html",
	"json",
	"xml",
	"nunit",
] as const;

export function isSupportedExportFormat(value: string): value is ExportFormat {
	return (SUPPORTED_EXPORT_FORMATS as readonly string[]).includes(
		value.toLowerCase(),
	);
}

export function normalizeExportFormat(value: string): ExportFormat {
	return value.toLowerCase() as ExportFormat;
}

// - Report scope / context -

export type ExportScope = "request" | "collection" | "folder";

export interface ExportContext {
	scope: ExportScope;
	name: string;
}

// - Aggregate summary (HTTP-level pass/fail, matches the CLI's own run summary) -

export interface ExportSummary {
	totalRequests: number;
	passedRequests: number;
	failedRequests: number;
	totalDurationMs: number;
	totalTests: number;
	passedTests: number;
	failedTests: number;
	generatedAt: string;
}

// - Normalized per-request export model -
// This is the single shape every format (csv/html/json/xml/nunit) renders from.
// It deliberately excludes internal-only fields (responseType, isError) and
// derives everything a report needs (outcome, details, preFetch) up front.

export type ExportOutcome = "Passed" | "Failed" | "Error";

export interface ExportTestResult {
	name: string;
	passed: boolean;
	actualValue?: string;
}

export interface ExportPreFetchStep {
	name: string;
	status: number;
	passed: boolean;
	tests: ExportTestResult[];
	children: ExportPreFetchStep[];
}

export interface ExportRequestResult {
	name: string;
	method: string;
	url: string;
	status: number;
	statusText: string;
	durationMs: number;
	sizeBytes: number;
	/** HTTP-level outcome only (matches the CLI's run summary criteria). */
	outcome: ExportOutcome;
	/** Response/error body — present whenever outcome !== 'Passed'. */
	details?: string;
	tests: ExportTestResult[];
	preFetch: ExportPreFetchStep[];
}

export interface ExportReport {
	context: ExportContext;
	summary: ExportSummary;
	results: ExportRequestResult[];
}

// Re-export for callers building reports directly from raw run results.
export type { RunResult };
