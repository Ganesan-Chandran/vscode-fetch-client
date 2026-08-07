import "./style.css";
import React, { useEffect, useRef, useState } from "react";
import {
	IQGReport,
	IQGDimensionResult,
	IQGRuleMeta,
	IQualityGateIssue,
	IQualityGateResult,
	QGDimension,
	QGVerdict,
} from "../../../fetch-client-core/types/qualityGate.types";
import { IRequestModel } from "../../../fetch-client-core/types/request.types";
import {
	requestTypes,
	responseTypes,
} from "../../../fetch-client-core/consts/requestTypes.consts";
import PanelLayout from "../Common/Layout/panelLayout";
import vscode from "../Common/vscodeAPI";

const QG_DIMENSION_ORDER: QGDimension[] = [
	"Functional",
	"Security",
	"Performance",
	"Design",
	"Observability",
	"TestCoverage",
	"Maintainability",
];

const DIMENSION_LABELS: Record<QGDimension, string> = {
	Functional: "Functional",
	Security: "Security",
	Performance: "Performance",
	Design: "Design",
	Observability: "Observability",
	TestCoverage: "Test Coverage",
	Maintainability: "Maintainability",
};

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
	const passedRules = dim.rules.filter((r) => r.passed);
	const failedRules = dim.rules.filter((r) => !r.passed);
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
						{passedRules.map((rule) => (
							<div key={rule.ruleId} className="qg-rule-pass">
								✓ {rule.name}
							</div>
						))}
					</div>

					<div className="qg-rule-section">
						<div className="qg-rule-title">
							❌ Failed Rules ({failedRules.length})
						</div>
						{failedRules.length === 0 ? (
							<div className="qg-rule-none">None</div>
						) : (
							failedRules.map((rule) => (
								<div key={rule.ruleId} className="qg-rule-fail">
									✗ {rule.name}
								</div>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function ResultPanel({ result }: { result: IQualityGateResult }) {
	const [open, setOpen] = useState(false);
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
							{result.suppressedIssues.length !== 1 ? "s" : ""} would have
							failed but suppressed by an inline <code>@qg-disable</code> tag in
							the request's Notes
						</div>
					)}
				</div>
			)}
		</div>
	);
}

// ─── Rules tab ────────────────────────────────────────────────────────────────

function expandDisabled(raw: string[], allRules: IQGRuleMeta[]): Set<string> {
	const lowerRaw = raw.map((r) => r.toLowerCase());
	const set = new Set<string>();
	if (lowerRaw.includes("*")) {
		allRules.forEach((r) => set.add(r.ruleId));
		return set;
	}
	for (const r of allRules) {
		if (
			lowerRaw.includes(r.dimension.toLowerCase()) ||
			lowerRaw.includes(r.ruleId)
		) {
			set.add(r.ruleId);
		}
	}
	return set;
}

function RulesTab() {
	const [rules, setRules] = useState<IQGRuleMeta[]>([]);
	const [disabled, setDisabled] = useState<Set<string>>(new Set());
	const [loading, setLoading] = useState(true);
	const [collapsed, setCollapsed] = useState<Set<QGDimension>>(new Set());

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const msg = event.data;
			if (!msg || msg.type !== responseTypes.getQGRulesResponse) {
				return;
			}
			const allRules = msg.rules as IQGRuleMeta[];
			setRules(allRules);
			setDisabled(expandDisabled(msg.disabledRules ?? [], allRules));
			setLoading(false);
		};
		window.addEventListener("message", handleMessage);
		vscode.postMessage({ type: requestTypes.getQGRulesRequest });
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	function persist(next: Set<string>) {
		setDisabled(next);
		vscode.postMessage({
			type: requestTypes.saveQGRuleSelectionRequest,
			data: { disabledRules: Array.from(next) },
		});
	}

	function toggleRule(ruleId: string) {
		const next = new Set(disabled);
		if (next.has(ruleId)) {
			next.delete(ruleId);
		} else {
			next.add(ruleId);
		}
		persist(next);
	}

	function setSectionAll(dimension: QGDimension, enabled: boolean) {
		const next = new Set(disabled);
		rules
			.filter((r) => r.dimension === dimension)
			.forEach((r) => {
				if (enabled) {
					next.delete(r.ruleId);
				} else {
					next.add(r.ruleId);
				}
			});
		persist(next);
	}

	function toggleCollapsed(dimension: QGDimension) {
		const next = new Set(collapsed);
		if (next.has(dimension)) {
			next.delete(dimension);
		} else {
			next.add(dimension);
		}
		setCollapsed(next);
	}

	if (loading) {
		return (
			<div className="qg-loading">
				<div className="qg-spinner" />
				<span>Loading rules…</span>
			</div>
		);
	}

	return (
		<div className="qg-rules-tab">
			{QG_DIMENSION_ORDER.map((dimension) => {
				const sectionRules = rules.filter((r) => r.dimension === dimension);
				if (sectionRules.length === 0) {
					return null;
				}
				const enabledCount = sectionRules.filter(
					(r) => !disabled.has(r.ruleId),
				).length;
				const isCollapsed = collapsed.has(dimension);
				return (
					<div className="qg-rules-section" key={dimension}>
						<div
							className="qg-rules-section-header"
							onClick={() => toggleCollapsed(dimension)}
						>
							<span className="qg-rules-section-chevron">
								{isCollapsed ? "▸" : "▾"}
							</span>
							<span className="qg-rules-section-title">
								{DIMENSION_LABELS[dimension]}
							</span>
							<span className="qg-rules-section-count">
								{enabledCount}/{sectionRules.length} selected
							</span>
							<div className="qg-rules-section-actions">
								<button
									className="qg-rules-select-btn"
									onClick={(e) => {
										e.stopPropagation();
										setSectionAll(dimension, true);
									}}
								>
									Select All
								</button>
								<button
									className="qg-rules-select-btn"
									onClick={(e) => {
										e.stopPropagation();
										setSectionAll(dimension, false);
									}}
								>
									Deselect All
								</button>
							</div>
						</div>
						{!isCollapsed && (
							<div className="qg-rules-list">
								{sectionRules.map((r) => (
									<label className="qg-rule-item" key={r.ruleId}>
										<input
											type="checkbox"
											checked={!disabled.has(r.ruleId)}
											onChange={() => toggleRule(r.ruleId)}
										/>
										<div className="qg-rule-item-text">
											<span className="qg-rule-item-name">{r.name}</span>
											<span className="qg-rule-item-desc">{r.description}</span>
										</div>
										<SeverityBadge severity={r.defaultSeverity} />
									</label>
								))}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}

// ─── Requests tab ─────────────────────────────────────────────────────────────

interface IRequestsTabProps {
	scopeData: any;
	requests: IRequestModel[];
	setRequests: (r: IRequestModel[]) => void;
	selectedIds: Set<string>;
	setSelectedIds: (s: Set<string>) => void;
}

function RequestsTab({
	scopeData,
	requests,
	setRequests,
	selectedIds,
	setSelectedIds,
}: IRequestsTabProps) {
	const [loading, setLoading] = useState(true);
	const loadedRef = useRef(false);

	useEffect(() => {
		if (!scopeData || loadedRef.current) {
			return undefined;
		}
		loadedRef.current = true;

		if (scopeData.scope === "request") {
			setLoading(false);
			return undefined;
		}

		const handleMessage = (event: MessageEvent) => {
			const msg = event.data;
			if (!msg || msg.type !== responseTypes.getCollectionsByIdResponse) {
				return;
			}
			const list = (msg.collections ?? []) as IRequestModel[];
			setRequests(list);
			setSelectedIds(new Set(list.map((r) => r.id)));
			setLoading(false);
		};
		window.addEventListener("message", handleMessage);
		vscode.postMessage({
			type: requestTypes.getCollectionsByIdRequest,
			data: {
				colId: scopeData.colId,
				folderId: scopeData.folderId,
				type: scopeData.folderId ? "fol" : "col",
			},
		});
		return () => window.removeEventListener("message", handleMessage);
	}, [scopeData]);

	function toggle(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		setSelectedIds(next);
	}

	function selectAll(select: boolean) {
		setSelectedIds(select ? new Set(requests.map((r) => r.id)) : new Set());
	}

	if (scopeData?.scope === "request") {
		return (
			<div className="qg-empty">
				<p>Single request mode - this request will be analysed.</p>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="qg-loading">
				<div className="qg-spinner" />
				<span>Loading requests…</span>
			</div>
		);
	}

	if (requests.length === 0) {
		return (
			<div className="qg-empty">
				<p>No requests found in this scope.</p>
			</div>
		);
	}

	return (
		<div className="qg-requests-tab">
			<div className="qg-requests-toolbar">
				<span>
					{selectedIds.size}/{requests.length} selected
				</span>
				<div className="qg-rules-section-actions">
					<button
						className="qg-rules-select-btn"
						onClick={() => selectAll(true)}
					>
						Select All
					</button>
					<button
						className="qg-rules-select-btn"
						onClick={() => selectAll(false)}
					>
						Deselect All
					</button>
				</div>
			</div>
			<table className="qg-requests-tbl">
				<thead>
					<tr>
						<th></th>
						<th>Method</th>
						<th>Name</th>
						<th>URL</th>
					</tr>
				</thead>
				<tbody>
					{requests.map((r) => (
						<tr key={r.id}>
							<td>
								<input
									type="checkbox"
									checked={selectedIds.has(r.id)}
									onChange={() => toggle(r.id)}
								/>
							</td>
							<td>
								<span
									className={`qg-method qg-method-${r.method.toLowerCase()}`}
								>
									{r.method.toUpperCase()}
								</span>
							</td>
							<td>{r.name}</td>
							<td className="qg-requests-url">{r.url}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

// ─── Summary table (Result tab) ────────────────────────────────────────────────

function summaryCell(score: number) {
	const icon = score >= 85 ? "✅" : score >= 70 ? "⚠️" : "❌";
	const cls =
		score >= 85
			? "qg-summary-good"
			: score >= 70
				? "qg-summary-warn"
				: "qg-summary-bad";
	return (
		<span className={`qg-summary-cell-value ${cls}`}>
			{icon} {score}
		</span>
	);
}

function SummaryTable({ report }: { report: IQGReport }) {
	return (
		<div className="qg-summary-tbl-wrap">
			<table className="qg-summary-tbl">
				<thead>
					<tr>
						<th className="qg-summary-req-cell">Request</th>
						{QG_DIMENSION_ORDER.map((d) => (
							<th key={d}>{DIMENSION_LABELS[d]}</th>
						))}
						<th>Overall</th>
						<th>Verdict</th>
					</tr>
				</thead>
				<tbody>
					{report.results.map((r) => {
						const byDim = new Map(r.dimensions.map((d) => [d.dimension, d]));
						return (
							<tr key={r.requestId}>
								<td className="qg-summary-req-cell">
									<span
										className={`qg-method qg-method-${r.method.toLowerCase()}`}
									>
										{r.method}
									</span>
									<span className="qg-summary-req-name">{r.requestName}</span>
								</td>
								{QG_DIMENSION_ORDER.map((d) => (
									<td key={d}>
										{byDim.has(d) ? summaryCell(byDim.get(d)!.score) : "-"}
									</td>
								))}
								<td className="qg-summary-overall">
									{summaryCell(r.overallScore)}
								</td>
								<td>
									<VerdictBadge verdict={r.verdict} />
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
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
		<div className="runall-dropdown">
			<button className="submit-button reorder-btn run-all-button">
				Export
			</button>
			<div className="runall-dropdown-content">
				<a onClick={() => onExport("json")}>JSON</a>
				<a onClick={() => onExport("csv")}>CSV</a>
				<a onClick={() => onExport("html")}>HTML</a>
				<a onClick={() => onExport("xml")}>XML</a>
			</div>
		</div>
	);
}

// ─── Main Quality Gate Panel ──────────────────────────────────────────────────

const QualityGate = () => {
	const [report, setReport] = useState<IQGReport | null>(null);
	const [loading, setLoading] = useState(false);
	const [scopeData, setScopeData] = useState<any>(null);
	const nameRef = useRef("Quality Gate");

	const [activeTab, setActiveTab] = useState<"Rules" | "Requests" | "Result">(
		"Rules",
	);
	const [requests, setRequests] = useState<IRequestModel[]>([]);
	const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(
		new Set(),
	);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const msg = event.data;
			if (!msg) {
				return;
			}

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
		if (!scopeData) {
			return;
		}
		setLoading(true);
		setReport(null);
		setActiveTab("Result");
		vscode.postMessage({
			type: requestTypes.runQualityGateRequest,
			data: {
				...scopeData,
				selectedRequestIds:
					scopeData.scope === "request"
						? undefined
						: Array.from(selectedRequestIds),
			},
		});
	}

	const headerTitle = scopeData?.name ?? "Quality Gate";
	const runDisabled =
		loading ||
		!scopeData ||
		(scopeData?.scope !== "request" && selectedRequestIds.size === 0);

	const tabTitle = (
		<div className="qg-tabs">
			{(["Rules", "Requests", "Result"] as const).map((tab) => (
				<div
					key={tab}
					className={`qg-tab${activeTab === tab ? " selected" : ""}`}
					onClick={() => setActiveTab(tab)}
				>
					{tab}
				</div>
			))}
		</div>
	);

	const footer = (
		<div className="qg-footer">
			<button className="qg-run-btn" onClick={onRun} disabled={runDisabled}>
				{loading ? "Running…" : "Run Gate"}
			</button>
			{report && <ExportToolbar report={report} name={headerTitle} />}
		</div>
	);

	return (
		<div className="qg-root">
			<PanelLayout title="🔬 API Quality Gate" footer={footer}>
				{tabTitle}
				<div className="qg-tab-content">
					{activeTab === "Rules" && <RulesTab />}

					{activeTab === "Requests" && (
						<RequestsTab
							scopeData={scopeData}
							requests={requests}
							setRequests={setRequests}
							selectedIds={selectedRequestIds}
							setSelectedIds={setSelectedRequestIds}
						/>
					)}

					{activeTab === "Result" && (
						<>
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
										Click <strong>▶ Run Gate</strong> to analyse the requests in
										this scope.
									</p>
									<p className="qg-empty-hint">
										Evaluates 7 quality dimensions: Functional, Security,
										Performance, Design, Observability, Test Coverage, and
										Maintainability.
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
														CI Gate:{" "}
														{report.gateStatus.passed ? "PASSED" : "FAILED"}
													</span>
												)}
											</div>
											<div className="qg-aggregate-meta">
												{report.results.length} request
												{report.results.length !== 1 ? "s" : ""} · Score:{" "}
												{report.aggregateScore}/100
											</div>
										</div>
									</div>

									{/* Summary table */}
									<div className="qg-section-title">SUMMARY</div>
									<SummaryTable report={report} />

									{/* Per-request results */}
									<div className="qg-section-title">BREAKDOWN</div>
									<div className="qg-results">
										{report.results.map((r) => (
											<ResultPanel key={r.requestId} result={r} />
										))}
									</div>
								</>
							)}
						</>
					)}
				</div>
			</PanelLayout>
		</div>
	);
};

export default QualityGate;
