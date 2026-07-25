import { escapeHtml } from "../escapeHelpers";
import { IDataDrivenConfig, IDataDrivenResult, IDataDrivenRowResult } from "./dataDriven.types";

function isRowPassed(r: IDataDrivenRowResult): boolean {
	return !r.isError && (r.testTotal === 0 || r.testPassed === r.testTotal);
}

function renderRows(rows: IDataDrivenRowResult[]): string {
	if (rows.length === 0) {
		return `<tr><td colspan="8" class="muted">No rows</td></tr>`;
	}

	return rows
		.map((r) => {
			const passed = isRowPassed(r);
			return `
			<tr class="${passed ? "" : "row-error"}">
				<td>${r.rowIndex}</td>
				<td>${escapeHtml(r.requestName)}</td>
				<td><span class="method method-${escapeHtml((r.method ?? "").toLowerCase())}">${escapeHtml((r.method ?? "").toUpperCase())}</span></td>
				<td>${r.status || "ERR"} ${escapeHtml(r.statusText)}</td>
				<td>${r.duration} ms</td>
				<td>${r.testTotal > 0 ? `${r.testPassed}/${r.testTotal}` : "-"}</td>
				<td><span class="badge ${passed ? "badge-pass" : "badge-fail"}">${passed ? "Pass" : "Fail"}</span></td>
				<td class="error">${r.error ? escapeHtml(r.error) : ""}</td>
			</tr>`;
		})
		.join("");
}

export function toDataDrivenHtml(
	config: IDataDrivenConfig,
	result: IDataDrivenResult,
	testName: string,
): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Fetch Client Data-Driven Report</title>
<style>
	:root { color-scheme: light dark; }
	body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 2rem; background: #0f1115; color: #e6e6e6; }
	h1 { margin-bottom: 0.25rem; }
	.subtitle { color: #9aa0a6; margin-bottom: 1.5rem; }
	.summary { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
	.stat { background: #1b1e25; border-radius: 8px; padding: 1rem 1.5rem; min-width: 140px; }
	.stat .value { font-size: 1.6rem; font-weight: 700; }
	.stat .label { color: #9aa0a6; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; }
	table { width: 100%; border-collapse: collapse; }
	th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #2c313b; font-size: 0.85rem; }
	.muted { color: #7a7f87; }
	.error { color: #ff8080; }
	.badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
	.badge-pass { background: #14361f; color: #4ade80; }
	.badge-fail { background: #3a1414; color: #f87171; }
	.method { font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; background: #2c313b; }
	.row-error { background: #241414; }
</style>
</head>
<body>
	<h1>Fetch Client Data-Driven Report</h1>
	<p class="subtitle">${escapeHtml(testName)} — format: ${escapeHtml(config.fileFormat)}${config.stopOnRowFailure ? ", stop-on-failure" : ""}</p>

	<div class="summary">
		<div class="stat"><div class="value">${result.totalRows}</div><div class="label">Rows</div></div>
		<div class="stat"><div class="value">${result.totalRequests}</div><div class="label">Requests</div></div>
		<div class="stat"><div class="value">${result.passedRequests}</div><div class="label">Passed</div></div>
		<div class="stat"><div class="value">${result.failedRequests}</div><div class="label">Failed</div></div>
	</div>

	<table>
		<thead><tr><th>Row</th><th>Request</th><th>Method</th><th>Status</th><th>Duration</th><th>Tests</th><th>Result</th><th>Error</th></tr></thead>
		<tbody>${renderRows(result.rows)}</tbody>
	</table>
</body>
</html>
`;
}
