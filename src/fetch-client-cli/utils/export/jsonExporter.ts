import { ExportReport } from "../../types/export.types";

export function toJson(report: ExportReport): string {
	return JSON.stringify(report, null, 2);
}
