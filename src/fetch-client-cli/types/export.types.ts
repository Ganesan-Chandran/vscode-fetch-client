import { DD_EXPORT_FORMATS, ExportFormat, PERF_EXPORT_FORMATS, SUPPORTED_EXPORT_FORMATS } from "../../fetch-client-core/consts/export.consts";

export function isSupportedPerfExportFormat(value: string): value is "json" | "csv" {
	return PERF_EXPORT_FORMATS.includes(value as ExportFormat);
}

export function isSupportedExportFormat(value: string): value is ExportFormat {
	return (SUPPORTED_EXPORT_FORMATS as readonly string[]).includes(
		value.toLowerCase(),
	);
}

export function normalizeExportFormat(value: string): ExportFormat {
	return value.toLowerCase() as ExportFormat;
}

export function isSupportedDataDrivenExportFormat(value: string): value is typeof DD_EXPORT_FORMATS[number] {
	return (DD_EXPORT_FORMATS as readonly string[]).includes(value);
}
