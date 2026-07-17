export type ExportFormat = "csv" | "html" | "json" | "xml" | "nunit";

export const SUPPORTED_EXPORT_FORMATS: readonly ExportFormat[] = [
	"csv",
	"html",
	"json",
	"xml",
	"nunit",
] as const;

export const PERF_EXPORT_FORMATS: ExportFormat[] = ["json", "csv"];

export const EXTENSION_BY_FORMAT: Record<ExportFormat, string> = {
	csv: "csv",
	html: "html",
	json: "json",
	xml: "xml",
	nunit: "xml",
};
