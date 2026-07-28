import "./style.css";
import React, { useEffect, useRef, useState } from "react";
import {
	IQGReport,
	IQGDimensionResult,
	IQualityGateIssue,
	IQualityGateResult,
	QGVerdict,
} from "../../../fetch-client-core/types/qualityGate.types";
import { requestTypes } from "../../../fetch-client-core/consts/requestTypes.consts";
import vscode from "../Common/vscodeAPI";

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: QGVerdict }) {
	const cls =
		verdict === "PASS"
			? "qg-verdict-badge qg-pass"
			: verdict === "CONDITIONAL_PASS"
				? "qg-verdict-badge qg-conditional"
				: "qg-verdict-badge qg-fail";
	const label =
		verdict === "PASS"
			? "✅ PASS"
			: verdict === "CONDITIONAL_PASS"
				? "⚠️ CONDITIONAL PASS"
				: "❌ FAIL";
	return <span className={cls}>{label}</span>;
}

function ScoreRing({ score }: { score: number }) {
	const r = 30;
	const circ = 2 * Math.PI * r;
	const offset = circ - (score / 100) * circ;
	const color =
		score >= 85
			? "var(--qg-green)"
			: score >= 70
				? "var(--qg-orange)"
				: "var(--qg-red)";
	return (
		<svg className="qg-score-ring" viewBox="0 0 70 70" width="70" height="70">
			<circle
				cx="35"
				cy="35"
				r={r}
				fill="none"
				stroke="var(--qg-bg2)"
				strokeWidth="7"
			/>
			<circle
				cx="35"
				cy="35"
				r={r}
				fill="none"
				stroke={color}
				strokeWidth="7"
				strokeDasharray={circ}
				strokeDashoffset={offset}
				strokeLinecap="round"
				transform="rotate(-90 35 35)"
			/>
			<text
				x="35"
				y="35"
				textAnchor="middle"
				dominantBaseline="central"
				className="qg-ring-text"
				fill={color}
			>
				{score}
			</text>
		</svg>
	);
}

function ScoreBar({ score }: { score: number }) {
	const color =
		score >= 85
			? "var(--qg-green)"
			: score >= 70
				? "var(--qg-orange)"
				: "var(--qg-red)";
	return (
		<div className="qg-score-bar-track">
			<div
				className="qg-score-bar-fill"
				style={{ width: `${score}%`, background: color }}
			/>
		</div>
	);
}

function SeverityBadge({ severity }: { severity: string }) {
	const cls = `qg-severity-badge qg-sev-${severity.toLowerCase()}`;
	return <span className={cls}>{severity}</span>;
}

function IssueRow({ issue }: { issue: IQualityGateIssue }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="qg-issue-row" onClick={() => setOpen(!open)}>
			<div className="qg-issue-header">
				<SeverityBadge severity={issue.severity} />
				<span className="qg-issue-desc">{issue.description}</span>
				<span className="qg-issue-chevron">{open ? "▾" : "▸"}</span>
			</div>
			{open && (
				<div className="qg-issue-detail">
					<div className="qg-issue-detail-row">
						<span className="qg-issue-label">Impact</span>
						<span>{issue.impact}</span>
					</div>
					<div className="qg-issue-detail-row">
						<span className="qg-issue-label">Recommendation</span>
						<span>{issue.recommendation}</span>
					</div>
					{issue.suggestedFix && (
						<div className="qg-issue-detail-row">
							<span className="qg-issue-label">Suggested Fix</span>
							<code className="qg-issue-fix">{issue.suggestedFix}</code>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function DimensionCard({ dim }: { dim: IQGDimensionResult }) {
	const [open, setOpen] = useState(false);
	const passedRules = dim.rules.filter(r => r.passed);
	const failedRules = dim.rules.filter(r => !r.passed);
	return (
		<div className="qg-dim-card">
			<div className="qg-dim-header" onClick={() => setOpen(!open)}>
				<span className="qg-dim-name">{dim.dimension}</span>
				<span className="qg-dim-score">{dim.score}/100</span>
				<div className="qg-dim-bar-wrap">
					<ScoreBar score={dim.score} />
				</div>
				<span className="qg-dim-issues">
					{dim.issues.length} issue{dim.issues.length !== 1 ? "s" : ""}
				</span>
				<span className="qg-dim-chevron">{open ? "▾" : "▸"}</span>
			</div>
			{open && dim.issues.length > 0 && (
				<div className="qg-dim-issues-list">
					{dim.issues.map((issue) => (
						<IssueRow key={issue.id} issue={issue} />
					))}
				</div>
			)}
			{open && (
				<div className="qg-rule-summary">
					<div className="qg-rule-section">
						<div className="qg-rule-title">
							✅ Passed Rules ({passedRules.length})
						</div>
						{passedRules.map(rule => (
							<div key={rule.ruleId} className="qg-rule-pass" >
								✓ {rule.name}
							</div>
						))}
					</div>

					<div className="qg-rule-section">
						<div className="qg-rule-title">
							❌ Failed Rules ({failedRules.length})
						</div>
						{failedRules.length === 0
							?
							<div className="qg-rule-none">
								None
							</div>
							: failedRules.map(rule => (
								<div key={rule.ruleId} className="qg-rule-fail">
									✗ {rule.name}
								</div>
							))
						}
					</div>
				</div>
			)}
		</div>
	);
}

function ResultPanel({ result }: { result: IQualityGateResult }) {
	const [open, setOpen] = useState(true);
	return (
		<div className="qg-result-panel">
			<div className="qg-result-header" onClick={() => setOpen(!open)}>
				<span className={`qg-method qg-method-${result.method.toLowerCase()}`}>
					{result.method}
				</span>
				<span className="qg-result-name">{result.requestName}</span>
				<span className="qg-result-url">{result.url}</span>
				<VerdictBadge verdict={result.verdict} />
				<span className="qg-result-score">{result.overallScore}/100</span>
				<span className="qg-result-chevron">{open ? "▾" : "▸"}</span>
			</div>
			{open && (
				<div className="qg-result-body">
					<div className="qg-summary-row">
						<span className="qg-sev-pill qg-sev-critical">
							Critical: {result.summary.critical}
						</span>
						<span className="qg-sev-pill qg-sev-high">
							High: {result.summary.high}
						</span>
						<span className="qg-sev-pill qg-sev-medium">
							Medium: {result.summary.medium}
						</span>
						<span className="qg-sev-pill qg-sev-low">
							Low: {result.summary.low}
						</span>
					</div>
					{result.dimensions.map((dim) => (
						<DimensionCard key={dim.dimension} dim={dim} />
					))}
					{result.suppressedIssues && result.suppressedIssues.length > 0 && (
						<div className="qg-suppressed-note">
							🔇 {result.suppressedIssues.length} issue
							{result.suppressedIssues.length !== 1 ? "s" : ""} suppressed by
							config / <code>@qg-disable</code>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Export toolbar ───────────────────────────────────────────────────────────

function ExportToolbar({ report, name }: { report: IQGReport; name: string }) {
	function onExport(format: "html" | "json" | "xml" | "csv") {
		vscode.postMessage({
			type: requestTypes.exportQualityGateReportRequest,
			format,
			data: report,
			name,
		});
	}
	return (
		<div className="qg-export-toolbar">
			<span className="qg-export-label">Export:</span>
			<button className="qg-export-btn" onClick={() => onExport("html")}>
				HTML
			</button>
			<button className="qg-export-btn" onClick={() => onExport("json")}>
				JSON
			</button>
			<button className="qg-export-btn" onClick={() => onExport("xml")}>
				XML
			</button>
			<button className="qg-export-btn" onClick={() => onExport("csv")}>
				CSV
			</button>
		</div>
	);
}

// ─── Main Quality Gate Panel ──────────────────────────────────────────────────

const QualityGate = () => {
	const [report, setReport] = useState<IQGReport | null>(null);
	const [loading, setLoading] = useState(false);
	const [scopeData, setScopeData] = useState<any>(null);
	const nameRef = useRef("Quality Gate");

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const msg = event.data;
			if (!msg) { return; }

			switch (msg.type) {
				case "qualityGateInit":
					setScopeData(msg.data);
					nameRef.current = msg.data?.name ?? "Quality Gate";
					break;
				case "qualityGateResult":
					setReport(msg.report as IQGReport);
					setLoading(false);
					break;
			}
		};
		window.addEventListener("message", handleMessage);

		// Request init data
		vscode.postMessage({ type: requestTypes.getQualityGateInitRequest });

		return () => window.removeEventListener("message", handleMessage);
	}, []);

	function onRun() {
		if (!scopeData) { return; }
		setLoading(true);
		setReport(null);
		vscode.postMessage({
			type: requestTypes.runQualityGateRequest,
			data: scopeData,
		});
	}

	const headerTitle = scopeData?.name ?? "Quality Gate";

	return (
		<div className="qg-root">
			{/* Header */}
			<div className="qg-header">
				<span className="qg-title">🔬 API Quality Gate</span>
				<span className="qg-subtitle">{headerTitle}</span>
				<button
					className="qg-run-btn"
					onClick={onRun}
					disabled={loading || !scopeData}
				>
					{loading ? "Running…" : "▶ Run Gate"}
				</button>
			</div>

			{/* Loading state */}
			{loading && (
				<div className="qg-loading">
					<div className="qg-spinner" />
					<span>Analysing API quality…</span>
				</div>
			)}

			{/* No report yet */}
			{!loading && !report && (
				<div className="qg-empty">
					<p>
						Click <strong>▶ Run Gate</strong> to analyse the requests in this
						scope.
					</p>
					<p className="qg-empty-hint">
						Evaluates 7 quality dimensions: Functional, Security, Performance,
						Design, Observability, Test Coverage, and Maintainability.
					</p>
				</div>
			)}

			{/* Report */}
			{report && !loading && (
				<>
					{/* Aggregate banner */}
					<div className="qg-aggregate-banner">
						<ScoreRing score={report.aggregateScore} />
						<div className="qg-aggregate-info">
							<div className="qg-aggregate-name">{report.name}</div>
							<div className="qg-badge-row">
								<VerdictBadge verdict={report.aggregateVerdict} />
								{report.gateStatus && (
									<span
										className={`qg-gate-badge ${report.gateStatus.passed ? "qg-gate-pass" : "qg-gate-fail"}`}
										title={report.gateStatus.reasons.join(" · ")}
									>
										CI Gate: {report.gateStatus.passed ? "PASSED" : "FAILED"}
									</span>
								)}
							</div>
							<div className="qg-aggregate-meta">
								{report.results.length} request
								{report.results.length !== 1 ? "s" : ""} · Score:{" "}
								{report.aggregateScore}/100
							</div>
						</div>
						<ExportToolbar report={report} name={headerTitle} />
					</div>

					{/* Per-request results */}
					<div className="qg-results">
						{report.results.map((r) => (
							<ResultPanel key={r.requestId} result={r} />
						))}
					</div>
				</>
			)}
		</div>
	);
};

export default QualityGate;
