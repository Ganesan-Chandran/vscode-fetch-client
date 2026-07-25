import { buildSummary } from "../../../../fetch-client-core/helpers/exporters/reports/reportBuilder";
import { ExportContext, ExportReport, ExportScope } from "../../../../fetch-client-core/types/export.types";
import { IReponseModel } from "../../../../fetch-client-core/types/response.types";
import { IRequestModel } from "../../../../fetch-client-core/types/request.types";
import { IVariable } from "../../../../fetch-client-core/types/sidebar.types";
import { RunResult } from "../../../../fetch-client-core/types/cli.types";
import { toCsv } from "../../../../fetch-client-core/helpers/exporters/reports/csvExporter";
import { toExportRequestResults } from "../../../../fetch-client-core/helpers/exporters/reports/transform";
import { toJson } from "../../../../fetch-client-core/helpers/exporters/reports/jsonExporter";
import { toHtml } from "../../../../fetch-client-core/helpers/exporters/reports/htmlExporter";
import { toXml } from "../../../../fetch-client-core/helpers/exporters/reports/xmlExporter";
import { toNUnit } from "../../../../fetch-client-core/helpers/exporters/reports/nunitExporter";

export function uiResponsesToRunResults(
	req: IRequestModel[],
	selectedReq: boolean[],
	responses: IReponseModel[],
): RunResult[] {
	const results: RunResult[] = [];

	req.forEach((request, index) => {
		if (!selectedReq[index]) {
			return;
		}

		const response = responses?.[index];

		results.push({
			id: request.id,
			name: request.name,
			method: request.method.toUpperCase(),
			url: request.url,

			status: response?.response?.status ?? 0,
			statusText: response?.response?.statusText ?? "",

			duration: response?.response?.isError
				? 0
				: (response?.response?.duration ?? 0),

			size: response?.response?.size
				? Number(response.response.size)
				: 0,

			isError: response?.response?.isError ?? true,

			responseData:
				response?.response?.responseData ??
				response?.response?.statusText ??
				"",

			testResults: response?.testResults ?? [],

			preFetchResponses: response?.preFetchResponse ?? [],
		});
	});

	return results;
}

export function exportJson(
	req: IRequestModel[],
	selectedReq: boolean[],
	res: IReponseModel[][],
	sourceType: ExportScope,
	sourceColName: string,
	_selectedVariable: IVariable,
	totalIterations: number,
): any {

	let iteration: ExportReport[] = buildData(req, selectedReq, res, sourceType, sourceColName, totalIterations);
	return JSON.parse(toJson(iteration));
}

export function exportCSV(
	req: IRequestModel[],
	selectedReq: boolean[],
	res: IReponseModel[][],
	sourceType: ExportScope,
	sourceColName: string,
	_selectedVariable: IVariable,
	totalIterations: number,
): string {

	let iteration: ExportReport[] = buildData(req, selectedReq, res, sourceType, sourceColName, totalIterations);
	return toCsv(iteration);
}

export function exportHTML(
	req: IRequestModel[],
	selectedReq: boolean[],
	res: IReponseModel[][],
	sourceType: ExportScope,
	sourceColName: string,
	_selectedVariable: IVariable,
	totalIterations: number,
): string {

	let iteration: ExportReport[] = buildData(req, selectedReq, res, sourceType, sourceColName, totalIterations);
	return toHtml(iteration);
}

export function exportXML(
	req: IRequestModel[],
	selectedReq: boolean[],
	res: IReponseModel[][],
	sourceType: ExportScope,
	sourceColName: string,
	_selectedVariable: IVariable,
	totalIterations: number,
): string {

	let iteration: ExportReport[] = buildData(req, selectedReq, res, sourceType, sourceColName, totalIterations);
	return toXml(iteration);
}

export function exportNunit(
	req: IRequestModel[],
	selectedReq: boolean[],
	res: IReponseModel[][],
	sourceType: ExportScope,
	sourceColName: string,
	_selectedVariable: IVariable,
	totalIterations: number,
): string {

	let iteration: ExportReport[] = buildData(req, selectedReq, res, sourceType, sourceColName, totalIterations);
	return toNUnit(iteration);
}

function buildData(
	req: IRequestModel[],
	selectedReq: boolean[],
	res: IReponseModel[][],
	sourceType: ExportScope,
	sourceColName: string,
	totalIterations: number
): ExportReport[] {
	let iteration: ExportReport[] = [];

	for (let i = 0; i < totalIterations; i++) {
		const runResults = uiResponsesToRunResults(req, selectedReq, res[i]);
		const summary = buildSummary(runResults);
		const results = toExportRequestResults(runResults);
		const context: ExportContext = {
			scope: sourceType,
			name: sourceColName
		};
		iteration.push({
			"context": context,
			"summary": summary,
			"results": results
		});
	}

	return iteration;
}
