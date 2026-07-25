import {
	computeMetrics,
	computeEndpointBreakdown,
	exportPerfJson,
	exportPerfCSV,
	exportPerfHtml,
	exportPerfXml,
} from "../../../fetch-client-core/utils/performanceTestService/perfHelper";
import { ExportFormat } from "../../../fetch-client-core/consts/export.consts";
import { IPerfConfig, IPerfResultPoint, IPerfMetrics, IPerfEndpointMetrics } from "../../../fetch-client-core/types/perfTest.types";
import { printPerfSummary } from "../display";
import { writeConsoleLog } from "../logger";
import { writeReportFile } from "../export/report";

export interface PerfFinalizeOptions {
	exportFormat?: ExportFormat;
	exportPath?: string;
}

function buildPerfExportContent(
	format: ExportFormat,
	config: IPerfConfig,
	results: IPerfResultPoint[],
	metrics: IPerfMetrics,
	breakdown: IPerfEndpointMetrics[],
	testName: string,
): string {
	switch (format) {
		case "csv":
			return exportPerfCSV(metrics, breakdown, testName);
		case "html":
			return exportPerfHtml(config, results, metrics, breakdown, testName);
		case "xml":
			return exportPerfXml(config, results, metrics, breakdown, testName);
		case "json":
			return JSON.stringify(exportPerfJson(config, results, metrics, breakdown, testName), null, 2);
		default: {
			throw new Error(`Unsupported perf export format: ${format}`);
		}
	}
}

export async function finalizePerfTest(
	testName: string,
	config: IPerfConfig,
	results: IPerfResultPoint[],
	elapsedSec: number,
	status: "Completed" | "Cancelled",
	opts: PerfFinalizeOptions,
): Promise<void> {
	const metrics: IPerfMetrics = computeMetrics(results, elapsedSec);
	const breakdown: IPerfEndpointMetrics[] = computeEndpointBreakdown(results, elapsedSec);

	printPerfSummary(metrics, breakdown, status);

	if (!opts.exportFormat) {
		return;
	}

	if (results.length === 0) {
		writeConsoleLog("Nothing to export - no requests were run.");
		return;
	}

	const content = buildPerfExportContent(
		opts.exportFormat,
		config,
		results,
		metrics,
		breakdown,
		testName,
	);

	const filePath = await writeReportFile(
		content,
		opts.exportFormat,
		{ scope: "perf", name: testName, format: opts.exportFormat },
		opts.exportPath,
	);

	writeConsoleLog(`Report exported to: ${filePath}`);
}
