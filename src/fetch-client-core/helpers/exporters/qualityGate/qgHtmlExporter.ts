import {
	IQGDimensionResult,
	IQGReport,
	IQualityGateIssue,
	IQualityGateResult,
	QGVerdict,
} from "../../../types/qualityGate.types";

function esc(s: string | number | undefined | null): string {
	const str = s === undefined || s === null ? "" : String(s);
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function severityColor(sev: string): string {
	switch (sev) {
		case "Critical":
			return "#e53935";
		case "High":
			return "#fb8c00";
		case "Medium":
			return "#fdd835";
		case "Low":
			return "#66bb6a";
		default:
			return "#90a4ae";
	}
}

function verdictColor(v: QGVerdict): string {
	switch (v) {
		case "PASS":
			return "#4caf50";
		case "CONDITIONAL_PASS":
			return "#ff9800";
		case "FAIL":
			return "#f44336";
		default:
			return "#90a4ae";
	}
}

function verdictLabel(v: QGVerdict): string {
	switch (v) {
		case "PASS":
			return "PASS";
		case "CONDITIONAL_PASS":
			return "CONDITIONAL PASS";
		case "FAIL":
			return "FAIL";
		default:
			return v;
	}
}

function scoreBarHtml(score: number): string {
	const pct = Math.min(100, Math.max(0, Math.round(score)));
	const color = score >= 85 ? "#4caf50" : score >= 70 ? "#ff9800" : "#f44336";
	return `<div style="background:#333;border-radius:4px;height:10px;width:120px;overflow:hidden">
    <div style="background:${color};border-radius:4px;height:10px;width:${pct}%"></div>
  </div>`;
}

function issueRowHtml(issue: IQualityGateIssue): string {
	const color = severityColor(issue.severity);
	return `<tr>
    <td style="padding:6px 10px;white-space:nowrap">
      <span style="background:${color};color:#fff;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:bold">${esc(issue.severity)}</span>
    </td>
    <td style="padding:6px 10px">${esc(issue.description)}<div style="font-size:10px;color:#667;font-family:monospace;margin-top:2px">${esc(issue.ruleId)}</div></td>
    <td style="padding:6px 10px;color:#ccc;font-size:12px">${esc(issue.impact)}</td>
    <td style="padding:6px 10px;font-size:12px">${esc(issue.recommendation)}</td>
    <td style="padding:6px 10px;font-size:11px;color:#aaa;font-family:monospace">${esc(issue.suggestedFix ?? "")}</td>
  </tr>`;
}

function suppressedNoteHtml(result: IQualityGateResult): string {
	const items = result.suppressedIssues ?? [];
	if (items.length === 0) {
		return "";
	}
	const rows = items
		.map(
			(i) =>
				`<li><code style="color:#8b949e">${esc(i.ruleId)}</code> — ${esc(i.description)}</li>`,
		)
		.join("");
	return `<details style="margin-top:10px;color:#8b949e;font-size:12px">
    <summary style="cursor:pointer">🔇 ${items.length} issue${items.length !== 1 ? "s" : ""} suppressed by config / @qg-disable</summary>
    <ul style="margin:6px 0 0 18px;padding:0">${rows}</ul>
  </details>`;
}

function dimensionSectionHtml(dim: IQGDimensionResult): string {
	const issueRows =
		dim.issues.length > 0
			? `<table style="width:100%;border-collapse:collapse;margin-top:8px;background:#1a1a2e;border-radius:6px;overflow:hidden">
        <thead>
          <tr style="background:#16213e">
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#aaa;width:90px">Severity</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#aaa">Description</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#aaa">Impact</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#aaa">Recommendation</th>
            <th style="padding:8px 10px;text-align:left;font-size:11px;color:#aaa">Suggested Fix</th>
          </tr>
        </thead>
        <tbody>${dim.issues.map(issueRowHtml).join("")}</tbody>
      </table>`
			: `<p style="color:#66bb6a;font-size:13px;margin:6px 0 0">✓ No issues found</p>`;

	const color =
		dim.score >= 85 ? "#4caf50" : dim.score >= 70 ? "#ff9800" : "#f44336";
	return `<details style="background:#0f3460;border-radius:8px;padding:12px 16px;margin-bottom:10px" open>
    <summary style="cursor:pointer;list-style:none;display:flex;align-items:center;gap:12px">
      <span style="font-size:14px;font-weight:600;flex:1">${esc(dim.dimension)}</span>
      <span style="font-size:13px;color:${color};font-weight:700;min-width:55px;text-align:right">${dim.score}/100</span>
      <span style="min-width:130px">${scoreBarHtml(dim.score)}</span>
      <span style="font-size:12px;color:#aaa;min-width:55px;text-align:right">${dim.issues.length} issue${dim.issues.length !== 1 ? "s" : ""}</span>
    </summary>
    <div style="margin-top:8px">${issueRows}</div>
  </details>`;
}

function requestResultHtml(result: IQualityGateResult): string {
	const vColor = verdictColor(result.verdict);
	const dimRows = result.dimensions
		.map(
			(d) =>
				`<tr>
          <td style="padding:5px 10px">${esc(d.dimension)}</td>
          <td style="padding:5px 10px;text-align:center;font-weight:600">${d.score}/100</td>
          <td style="padding:5px 10px">${scoreBarHtml(d.score)}</td>
          <td style="padding:5px 10px;text-align:center;color:#aaa">${d.issues.length}</td>
        </tr>`,
		)
		.join("");

	return `<div style="margin-bottom:28px;border:1px solid #1f4068;border-radius:10px;overflow:hidden">
    <div style="background:#16213e;padding:12px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="background:#0a3d62;color:#74b9ff;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700">${esc(result.method)}</span>
      <span style="font-size:13px;font-weight:600">${esc(result.requestName)}</span>
      <span style="font-size:11px;color:#aaa;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(result.url)}</span>
      <span style="background:${vColor};color:#fff;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:700">${verdictLabel(result.verdict)}</span>
      <span style="font-size:20px;font-weight:800;color:${vColor}">${result.overallScore}</span>
    </div>
    <div style="padding:12px 16px">
      <div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
        <span style="background:#e53935;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px">🔴 Critical: ${result.summary.critical}</span>
        <span style="background:#fb8c00;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px">🟠 High: ${result.summary.high}</span>
        <span style="background:#fdd835;color:#222;padding:2px 8px;border-radius:4px;font-size:12px">🟡 Medium: ${result.summary.medium}</span>
        <span style="background:#66bb6a;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px">🟢 Low: ${result.summary.low}</span>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
        <thead>
          <tr style="background:#1a1a2e">
            <th style="padding:6px 10px;text-align:left;font-size:11px;color:#aaa">Dimension</th>
            <th style="padding:6px 10px;text-align:center;font-size:11px;color:#aaa">Score</th>
            <th style="padding:6px 10px;text-align:left;font-size:11px;color:#aaa">Bar</th>
            <th style="padding:6px 10px;text-align:center;font-size:11px;color:#aaa">Issues</th>
          </tr>
        </thead>
        <tbody>${dimRows}</tbody>
      </table>
      ${result.dimensions.map(dimensionSectionHtml).join("")}
      ${suppressedNoteHtml(result)}
    </div>
  </div>`;
}

export function toQGHtml(report: IQGReport): string {
	const vColor = verdictColor(report.aggregateVerdict);
	const resultsHtml = report.results.map(requestResultHtml).join("");
	const ts = new Date(report.runAt).toLocaleString();

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>API Quality Gate Report — ${esc(report.name)}</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;padding:24px;background:#0d1117;color:#e6edf3;font-family:"Segoe UI",system-ui,sans-serif;font-size:14px}
    h1{margin:0 0 4px;font-size:22px}
    a{color:#58a6ff}
    details summary::-webkit-details-marker{display:none}
  </style>
</head>
<body>
  <h1>API Quality Gate Report</h1>
  <p style="color:#aaa;margin:0 0 20px;font-size:12px">Generated: ${esc(ts)}</p>

  <div style="background:#161b22;border-radius:10px;padding:18px 20px;margin-bottom:24px;display:flex;align-items:center;gap:20px;flex-wrap:wrap">
    <div>
      <div style="font-size:12px;color:#aaa;margin-bottom:2px">Collection / Scope</div>
      <div style="font-size:16px;font-weight:700">${esc(report.name)}</div>
    </div>
    <div style="flex:1"></div>
    <div style="text-align:center;min-width:80px">
      <div style="font-size:36px;font-weight:800;color:${vColor}">${report.aggregateScore}</div>
      <div style="font-size:11px;color:#aaa">Overall Score</div>
    </div>
    <div style="background:${vColor};color:#fff;padding:6px 16px;border-radius:6px;font-size:14px;font-weight:800">${verdictLabel(report.aggregateVerdict)}</div>
  </div>

  ${gateStatusBannerHtml(report)}

  <div>
    <h2 style="font-size:16px;margin:0 0 12px;color:#8b949e">Requests (${report.results.length})</h2>
    ${resultsHtml}
  </div>
</body>
</html>`;
}

function gateStatusBannerHtml(report: IQGReport): string {
	const gate = report.gateStatus;
	if (!gate) {
		return "";
	}
	const color = gate.passed ? "#4caf50" : "#f44336";
	const reasons = gate.reasons.length
		? `<ul style="margin:6px 0 0 18px;padding:0;font-size:12px;color:#ccc">${gate.reasons
				.map((r) => `<li>${esc(r)}</li>`)
				.join("")}</ul>`
		: "";
	return `<div style="border-left:4px solid ${color};background:#161b22;border-radius:6px;padding:10px 16px;margin-bottom:20px">
    <div style="font-weight:700;color:${color}">CI Gate: ${gate.passed ? "PASSED" : "FAILED"} (exit code ${gate.exitCode})</div>
    ${reasons}
  </div>`;
}
