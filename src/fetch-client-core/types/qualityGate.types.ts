import { IRequestModel } from "./request.types";
import { IReponseModel } from "./response.types";

export type QGSeverity = "Critical" | "High" | "Medium" | "Low";

export type QGDimension =
	| "Functional"
	| "Security"
	| "Performance"
	| "Design"
	| "Observability"
	| "TestCoverage"
	| "Maintainability";

export type QGVerdict = "PASS" | "CONDITIONAL_PASS" | "FAIL";

export interface IQualityGateIssue {
	id: string;
	/** Stable machine-readable id, e.g. "security/no-auth-mutation". Used for
	 *  rule suppression (config + @qg-disable tags) and for CI-gate rules. */
	ruleId: string;
	severity: QGSeverity;
	dimension: QGDimension;
	description: string;
	impact: string;
	recommendation: string;
	suggestedFix?: string;
	/** True when the issue was detected but suppressed by an inline
	 *  @qg-disable tag in the request's Notes. Rules disabled via .qgrc.json /
	 *  the Rules tab are skipped entirely and never reach this state - only
	 *  tag-based suppression is tracked here, for audit purposes. Suppressed
	 *  issues are excluded from scoring and from summary counts. */
	suppressed?: boolean;
}

// ─── Configuration (.qgrc.json) ───────────────────────────────────────────────

export interface IQGPerformanceThresholds {
	/** ms above which a response is "moderate" (Medium). Default 500. */
	slowMs?: number;
	/** ms above which a response is "slow" (High). Default 2000. */
	verySlowMs?: number;
	/** ms above which a response is a timeout-level failure (Critical). Default 5000. */
	timeoutMs?: number;
	/** bytes above which payload size is a Medium warning. Default 102400 (100KB). */
	payloadWarnBytes?: number;
	/** bytes above which payload size is a High warning. Default 1048576 (1MB). */
	payloadFailBytes?: number;
	/** bytes above which an uncompressed GET response is flagged. Default 10240 (10KB). */
	compressionThresholdBytes?: number;
}

export interface IQGScoringThresholds {
	/** Minimum overall score required for a PASS verdict. Default 85. */
	passScore?: number;
	/** Minimum overall score required to avoid FAIL (below this is FAIL). Default 70. */
	conditionalScore?: number;
}

export interface IQGFailOnConfig {
	/** Max critical issues allowed across the whole report before the CI gate fails. Default 0. */
	critical?: number;
	/** Max high-severity issues allowed across the whole report. Default: unlimited. */
	high?: number;
	/** Minimum aggregate score required for the CI gate to pass. Defaults to conditionalScore. */
	minScore?: number;
}

export interface IQGConfig {
	thresholds?: {
		performance?: IQGPerformanceThresholds;
		scoring?: IQGScoringThresholds;
	};
	weights?: Partial<Record<QGDimension, number>>;
	disabledRules?: string[];
	failOn?: IQGFailOnConfig;
}

export interface IQGGateStatus {
	passed: boolean;
	exitCode: 0 | 1;
	reasons: string[];
}

export interface IQGRuleResult {
	ruleId: string;
	name: string;
	passed: boolean;
	severity?: QGSeverity;
	message?: string;
}

/** Static metadata describing a registered rule - used by the Rules tab to
 *  render checkboxes without having to execute anything. */
export interface IQGRuleMeta {
	/** Full id, e.g. "security/no-auth-mutation" */
	ruleId: string;
	dimension: QGDimension;
	name: string;
	description: string;
	defaultSeverity: QGSeverity;
}

export interface IQGDimensionResult {
	dimension: QGDimension;
	score: number;
	issues: IQualityGateIssue[];
	rules: IQGRuleResult[];
}

export interface IQGRequestInput {
	request: IRequestModel;
	response?: IReponseModel;
}

export interface IQGSummary {
	critical: number;
	high: number;
	medium: number;
	low: number;
	total: number;
}

export interface IQualityGateResult {
	requestId: string;
	requestName: string;
	method: string;
	url: string;
	timestamp: string;
	dimensions: IQGDimensionResult[];
	overallScore: number;
	verdict: QGVerdict;
	summary: IQGSummary;
	/** Issues that were detected but suppressed via config or an inline tag. Omitted if none. */
	suppressedIssues?: IQualityGateIssue[];
}

export interface IQGReport {
	name: string;
	runAt: string;
	results: IQualityGateResult[];
	aggregateScore: number;
	aggregateVerdict: QGVerdict;
	/** The (merged, effective) config used for this run - included for auditability. */
	config?: IQGConfig;
	/** CI/CD gate result, independent of aggregateVerdict; use gateStatus.exitCode in build scripts. */
	gateStatus: IQGGateStatus;
}

export interface IQGOpenRequest {
	colId: string;
	folderId: string;
	itemId?: string;
	name: string;
	varId: string;
	scope: "collection" | "folder" | "request";
	/** When present, only these request ids are analyzed (Requests tab selection). */
	selectedRequestIds?: string[];
}
