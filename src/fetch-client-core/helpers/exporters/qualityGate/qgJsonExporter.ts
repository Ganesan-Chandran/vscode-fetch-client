import { IQGReport } from "../../../types/qualityGate.types";

export function toQGJson(report: IQGReport): string {
	return JSON.stringify(report, null, "\t");
}
