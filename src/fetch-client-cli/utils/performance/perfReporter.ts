import { computeMetrics, computeEndpointBreakdown, exportPerfJson, exportPerfCSV } from "../../../fetch-client-core/utils/performanceTestService/perfHelper";
import { IPerfConfig, IPerfResultPoint, IPerfMetrics, IPerfEndpointMetrics } from "../../../fetch-client-core/types/perfTest.types";
import { printPerfSummary } from "../display";
import { writeReportFile } from "../export/report";
import { writeConsoleLog } from "../logger";
import { ExportFormat } from "../../types/export.types";

export interface PerfFinalizeOptions {
	exportFormat?: ExportFormat;
	exportPath?: string;
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

	const content =
		opts.exportFormat === "csv"
			? exportPerfCSV(metrics, breakdown, testName)
			: JSON.stringify(exportPerfJson(config, results, metrics, breakdown, testName));

	const filePath = await writeReportFile(
		content,
		opts.exportFormat,
		{ scope: "perf", name: testName, format: opts.exportFormat },
		opts.exportPath,
	);

	writeConsoleLog(`Report exported to: ${filePath}`);
}
