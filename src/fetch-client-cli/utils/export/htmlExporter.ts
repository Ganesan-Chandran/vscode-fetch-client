import {
	ExportPreFetchStep,
	ExportReport,
	ExportRequestResult,
} from "../../types/export.types";

function escapeHtml(value: string | number | undefined | null): string {
	const str = value === undefined || value === null ? "" : String(value);
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function renderTestsRows(tests: ExportRequestResult["tests"]): string {
	if (tests.length === 0) {
		return '<tr><td colspan="3" class="muted">No tests</td></tr>';
	}

	return tests
		.map(
			(t) => `
			<tr>
				<td>${escapeHtml(t.name)}</td>
				<td><span class="badge ${t.passed ? "badge-pass" : "badge-fail"}">${t.passed ? "Pass" : "Fail"}</span></td>
				<td>${escapeHtml(t.actualValue ?? "")}</td>
			</tr>`,
		)
		.join("");
}

function renderPreFetchStep(step: ExportPreFetchStep): string {
	const childrenHtml =
		step.children.length > 0
			? `<ul class="prefetch-children">${step.children.map((c) => `<li>${renderPreFetchStep(c)}</li>`).join("")}</ul>`
			: "";

	return `<span class="prefetch-step"><span class="badge ${step.passed ? "badge-pass" : "badge-fail"}">${step.status}</span> ${escapeHtml(step.name)}</span>${childrenHtml}`;
}

function renderPreFetchSection(steps: ExportPreFetchStep[]): string {
	if (steps.length === 0) {
		return "";
	}

	return `
			<div class="prefetch">
				<h4>Pre-fetch requests</h4>
				<ul class="prefetch-list">
					${steps.map((s) => `<li>${renderPreFetchStep(s)}</li>`).join("")}
				</ul>
			</div>`;
}

function renderRequestCard(r: ExportRequestResult): string {
	const outcomeClass = r.outcome === "Passed" ? "badge-pass" : "badge-fail";

	return `
	<section class="card">
		<header class="card-header">
			<span class="method method-${escapeHtml(r.method.toLowerCase())}">${escapeHtml(r.method.toUpperCase())}</span>
			<span class="req-name">${escapeHtml(r.name)}</span>
			<span class="badge ${outcomeClass}">${r.outcome}</span>
		</header>
		<div class="card-body">
			<p class="url">${escapeHtml(r.url)}</p>
			<div class="meta">
				<span><strong>Status:</strong> ${r.status} ${escapeHtml(r.statusText)}</span>
				<span><strong>Duration:</strong> ${r.durationMs} ms</span>
				<span><strong>Size:</strong> ${r.sizeBytes} B</span>
			</div>
			${r.details ? `<p class="error">${escapeHtml(r.details)}</p>` : ""}
			${renderPreFetchSection(r.preFetch)}
			<table class="tests-table">
				<thead><tr><th>Test</th><th>Result</th><th>Actual value</th></tr></thead>
				<tbody>${renderTestsRows(r.tests)}</tbody>
			</table>
		</div>
	</section>`;
}

export function toHtml(report: ExportReport): string {
	const { context, summary } = report;
	const requestCards = report.results.map(renderRequestCard).join("\n");

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Fetch Client Report — ${escapeHtml(context.name)}</title>
<style>
	:root { color-scheme: light dark; }
	body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 2rem; background: #0f1115; color: #e6e6e6; }
	h1 { margin-bottom: 0.25rem; }
	.subtitle { color: #9aa0a6; margin-bottom: 1.5rem; }
	.summary { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
	.stat { background: #1b1e25; border-radius: 8px; padding: 1rem 1.5rem; min-width: 140px; }
	.stat .value { font-size: 1.6rem; font-weight: 700; }
	.stat .label { color: #9aa0a6; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.04em; }
	.card { background: #1b1e25; border-radius: 8px; margin-bottom: 1rem; overflow: hidden; }
	.card-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: #22262f; }
	.req-name { font-weight: 600; flex: 1; }
	.card-body { padding: 1rem; }
	.url { color: #7fd0ff; word-break: break-all; }
	.meta { display: flex; gap: 1.5rem; flex-wrap: wrap; margin: 0.5rem 0 1rem; color: #cfd3d9; }
	.error { color: #ff8080; background: #2a1414; padding: 0.5rem 0.75rem; border-radius: 6px; word-break: break-word; }
	.prefetch { margin: 0.75rem 0; }
	.prefetch h4 { margin: 0 0 0.4rem; font-size: 0.8rem; color: #9aa0a6; text-transform: uppercase; letter-spacing: 0.04em; }
	.prefetch-list, .prefetch-children { list-style: none; margin: 0.2rem 0; padding-left: 1rem; }
	.prefetch-list { padding-left: 0; }
	.prefetch-step { font-size: 0.85rem; }
	.tests-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
	.tests-table th, .tests-table td { text-align: left; padding: 0.4rem 0.5rem; border-bottom: 1px solid #2c313b; font-size: 0.9rem; }
	.muted { color: #7a7f87; }
	.badge { display: inline-block; padding: 0.15rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
	.badge-pass { background: #14361f; color: #4ade80; }
	.badge-fail { background: #3a1414; color: #f87171; }
	.method { font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.8rem; background: #2c313b; }
</style>
</head>
<body>
	<h1>Fetch Client Report</h1>
	<p class="subtitle">${escapeHtml(context.scope)}: ${escapeHtml(context.name)} — generated ${escapeHtml(summary.generatedAt)}</p>

	<div class="summary">
		<div class="stat"><div class="value">${summary.totalRequests}</div><div class="label">Requests</div></div>
		<div class="stat"><div class="value">${summary.passedRequests}</div><div class="label">Passed</div></div>
		<div class="stat"><div class="value">${summary.failedRequests}</div><div class="label">Failed</div></div>
		<div class="stat"><div class="value">${summary.totalDurationMs} ms</div><div class="label">Total duration</div></div>
		<div class="stat"><div class="value">${summary.passedTests}/${summary.totalTests}</div><div class="label">Tests passed</div></div>
	</div>

	${requestCards}
</body>
</html>
`;
}
