import { escapeHtml } from "../escapeHelpers";
import {
	IPerfConfig,
	IPerfEndpointMetrics,
	IPerfMetrics,
	IPerfResultPoint,
} from "../../types/perfTest.types";

function buildResponseTimeSvg(points: number[]): string {
	if (points.length === 0) {
		return `<p class="muted">No data</p>`;
	}

	const width = 700;
	const height = 160;
	const padding = 10;
	const max = Math.max(...points, 1);
	const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

	const coords = points.map((p, i) => {
		const x = padding + i * stepX;
		const y = height - padding - (p / max) * (height - padding * 2);
		return `${x.toFixed(1)},${y.toFixed(1)}`;
	});

	const path = coords.join(" ");

	return `
	<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" class="chart">
		<polyline points="${path}" fill="none" stroke="#7fd0ff" stroke-width="2" />
	</svg>`;
}

function renderBreakdownRows(breakdown: IPerfEndpointMetrics[]): string {
	if (breakdown.length === 0) {
		return `<tr><td colspan="8" class="muted">No breakdown available</td></tr>`;
	}

	return breakdown
		.map(
			(b) => `
			<tr>
				<td>${escapeHtml(b.requestName)}</td>
				<td><span class="method method-${escapeHtml(b.method.toLowerCase())}">${escapeHtml(b.method.toUpperCase())}</span></td>
				<td>${b.total}</td>
				<td>${b.failed}</td>
				<td>${b.errorRate.toFixed(1)}%</td>
				<td>${b.avg.toFixed(0)} ms</td>
				<td>${b.p95.toFixed(0)} ms</td>
				<td>${b.rps.toFixed(1)}</td>
			</tr>`,
		)
		.join("");
}

function renderRawRows(results: IPerfResultPoint[]): string {
	if (results.length === 0) {
		return `<tr><td colspan="8" class="muted">No results</td></tr>`;
	}

	return results
		.map(
			(r) => `
			<tr class="${r.isError ? "row-error" : ""}">
				<td>${r.wave}</td>
				<td>${r.vuIndex}</td>
				<td>${escapeHtml(r.requestName)}</td>
				<td><span class="method method-${escapeHtml(r.method.toLowerCase())}">${escapeHtml(r.method.toUpperCase())}</span></td>
				<td>${r.status} ${escapeHtml(r.statusText)}</td>
				<td>${r.duration} ms</td>
				<td>${r.timestamp} ms</td>
				<td>${r.isError ? '<span class="badge badge-fail">Error</span>' : '<span class="badge badge-pass">OK</span>'}</td>
			</tr>`,
		)
		.join("");
}

export function toPerfHtml(
	config: IPerfConfig,
	results: IPerfResultPoint[],
	metrics: IPerfMetrics,
	breakdown: IPerfEndpointMetrics[],
	testName: string,
): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Fetch Client Performance Report</title>
<style>
	:root { color-scheme: light dark; }
	body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 2rem; background: #0f1115; color: #e6e6e6; }
	h1 { margin-bottom: 0.25rem; }
	.subtitle { color: #9aa0a6; margin-bottom: 1.5rem; }
	.summary { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
	.stat { background: #1b1e25; border-radius: 8px; padding: 1rem 1.5rem; min-width: 140px; }
	.stat .value { font-size: 1.6rem; font-weight: 700; }
	.stat .label { color: #9aa0a6; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; }
	.section { margin-bottom: 2.5rem; }
	.section h2 { font-size: 1.1rem; color: #fff; }
	table { width: 100%; border-collapse: collapse; }
	th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #2c313b; font-size: 0.85rem; }
	.muted { color: #7a7f87; }
	.badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
	.badge-pass { background: #14361f; color: #4ade80; }
	.badge-fail { background: #3a1414; color: #f87171; }
	.method { font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.75rem; background: #2c313b; }
	.row-error { background: #241414; }
	.chart-container { background: #1b1e25; border-radius: 8px; padding: 1rem; }
	.chart { width: 100%; height: 160px; }
	.raw-scroll { max-height: 500px; overflow-y: auto; }
</style>
</head>
<body>
	<h1>Fetch Client Performance Report</h1>
	<p class="subtitle">${escapeHtml(testName)} — scope: ${escapeHtml(config.scope)}, load model: ${escapeHtml(config.loadModel)}</p>

	<div class="summary">
		<div class="stat"><div class="value">${metrics.total}</div><div class="label">Total</div></div>
		<div class="stat"><div class="value">${metrics.success}</div><div class="label">Success</div></div>
		<div class="stat"><div class="value">${metrics.failed}</div><div class="label">Failed</div></div>
		<div class="stat"><div class="value">${metrics.errorRate.toFixed(1)}%</div><div class="label">Error Rate</div></div>
		<div class="stat"><div class="value">${metrics.avg.toFixed(0)} ms</div><div class="label">Avg</div></div>
		<div class="stat"><div class="value">${metrics.p95.toFixed(0)} ms</div><div class="label">P95</div></div>
		<div class="stat"><div class="value">${metrics.p99.toFixed(0)} ms</div><div class="label">P99</div></div>
		<div class="stat"><div class="value">${metrics.rps.toFixed(1)}</div><div class="label">Req/s</div></div>
	</div>

	<div class="section">
		<h2>Response Time Trend</h2>
		<div class="chart-container">
			${buildResponseTimeSvg(results.map((r) => r.duration))}
		</div>
	</div>

	<div class="section">
		<h2>Endpoint Breakdown</h2>
		<table>
			<thead><tr><th>Request</th><th>Method</th><th>Total</th><th>Failed</th><th>Error Rate</th><th>Avg</th><th>P95</th><th>RPS</th></tr></thead>
			<tbody>${renderBreakdownRows(breakdown)}</tbody>
		</table>
	</div>

	<div class="section">
		<h2>Raw Results</h2>
		<div class="raw-scroll">
			<table>
				<thead><tr><th>Wave</th><th>VU</th><th>Request</th><th>Method</th><th>Status</th><th>Duration</th><th>Timestamp</th><th>Outcome</th></tr></thead>
				<tbody>${renderRawRows(results)}</tbody>
			</table>
		</div>
	</div>
</body>
</html>
`;
}
