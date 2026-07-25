import { escapeXml } from "../escapeHelpers";
import { IDataDrivenConfig, IDataDrivenResult, IDataDrivenRowResult } from "./dataDriven.types";

function isRowPassed(r: IDataDrivenRowResult): boolean {
	return !r.isError && (r.testTotal === 0 || r.testPassed === r.testTotal);
}

function renderRow(r: IDataDrivenRowResult): string {
	const errorXml = r.error ? `\n    <error>${escapeXml(r.error)}</error>` : "";
	return `  <row rowIndex="${r.rowIndex}" requestName="${escapeXml(r.requestName)}" method="${escapeXml(r.method ?? "")}" url="${escapeXml(r.url ?? "")}" status="${r.status}" statusText="${escapeXml(r.statusText ?? "")}" durationMs="${r.duration}" testsPassed="${r.testPassed}" testsTotal="${r.testTotal}" result="${isRowPassed(r) ? "Passed" : "Failed"}">${errorXml}\n  </row>`;
}

export function toDataDrivenXml(
	config: IDataDrivenConfig,
	result: IDataDrivenResult,
	testName: string,
): string {
	const rowsXml = result.rows.map(renderRow).join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<dataDrivenReport name="${escapeXml(testName)}" fileFormat="${escapeXml(config.fileFormat)}" stopOnRowFailure="${!!config.stopOnRowFailure}">
  <summary totalRows="${result.totalRows}" totalRequests="${result.totalRequests}" passedRequests="${result.passedRequests}" failedRequests="${result.failedRequests}" startTime="${escapeXml(result.startTime)}" endTime="${escapeXml(result.endTime)}" />
${rowsXml}
</dataDrivenReport>
`;
}
