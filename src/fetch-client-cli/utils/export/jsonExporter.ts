import { ExportReport } from "../../types/export.types";

/** Verbatim structured dump of the report — the source of truth other formats derive from. */
export function toJson(report: ExportReport): string {
	return JSON.stringify(report, null, 2);
}
