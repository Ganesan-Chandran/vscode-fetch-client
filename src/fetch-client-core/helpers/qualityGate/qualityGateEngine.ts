import {
	IQGConfig,
	IQGDimensionResult,
	IQGGateStatus,
	IQGRuleResult,
	IQualityGateIssue,
	IQualityGateResult,
	QGDimension,
	QGSeverity,
} from "../../types/qualityGate.types";
import { IQGRuleEvalContext, ResolvedThresholds } from "./qgEngineTypes";
import { getRulesForDimension } from "./ruleRegistry";

// ─── Default scoring weights (must sum to 1 for a 0-100 overall score) ───────
export const DEFAULT_WEIGHTS: Record<QGDimension, number> = {
	Functional: 0.2,
	Security: 0.2,
	Performance: 0.15,
	Design: 0.15,
	Observability: 0.1,
	TestCoverage: 0.1,
	Maintainability: 0.1,
};

const DEDUCTIONS: Record<QGSeverity, number> = {
	Critical: 40,
	High: 20,
	Medium: 10,
	Low: 5,
};

// ─── Default thresholds (unchanged behaviour vs. the previous hardcoded values) ─
const DEFAULT_THRESHOLDS = {
	performance: {
		slowMs: 500,
		verySlowMs: 2000,
		timeoutMs: 5000,
		payloadWarnBytes: 102_400,
		payloadFailBytes: 1_048_576,
		compressionThresholdBytes: 10_240,
	},
	scoring: {
		passScore: 85,
		conditionalScore: 70,
	},
};

export function resolveThresholds(config: IQGConfig): ResolvedThresholds {
	return {
		performance: {
			...DEFAULT_THRESHOLDS.performance,
			...(config.thresholds?.performance ?? {}),
		},
		scoring: {
			...DEFAULT_THRESHOLDS.scoring,
			...(config.thresholds?.scoring ?? {}),
		},
	};
}

export function resolveWeights(config: IQGConfig): Record<QGDimension, number> {
	return { ...DEFAULT_WEIGHTS, ...(config.weights ?? {}) };
}

// ─── Rule suppression ─────────────────────────────────────────────────────────
// Inline tags look like: "@qg-disable security/no-auth-mutation" or
// "@qg-disable security" (whole dimension) or "@qg-disable *" (everything),
// placed anywhere in the request's Notes field. These are combined with the
// `disabledRules` from .qgrc.json (which the Rules tab UI also writes to).
const DISABLE_TAG_RE = /@qg-disable\s+([a-z0-9*_-]+(?:\/[a-z0-9*_-]+)?)/gi;

export function parseInlineDisabledRules(notes?: string): Set<string> {
	const set = new Set<string>();
	if (!notes) {
		return set;
	}
	let m: RegExpExecArray | null;
	DISABLE_TAG_RE.lastIndex = 0;
	while ((m = DISABLE_TAG_RE.exec(notes))) {
		set.add(m[1].toLowerCase());
	}
	return set;
}

function isRuleDisabled(
	dimension: QGDimension,
	fullRuleId: string,
	disabled: Set<string>,
): boolean {
	return (
		disabled.has("*") ||
		disabled.has(dimension.toLowerCase()) ||
		disabled.has(fullRuleId)
	);
}

// ─── Issue construction ────────────────────────────────────────────────────────
let _idCounter = 0;

export function resetIssueIdCounter(): void {
	_idCounter = 0;
}

function makeIssue(
	reqId: string,
	dim: QGDimension,
	ruleId: string,
	sev: QGSeverity,
	description: string,
	impact: string,
	recommendation: string,
	suggestedFix?: string,
): IQualityGateIssue {
	return {
		id: `qg_${reqId}_${dim.toLowerCase()}_${++_idCounter}`,
		ruleId: `${dim.toLowerCase()}/${ruleId}`,
		severity: sev,
		dimension: dim,
		description,
		impact,
		recommendation,
		suggestedFix,
	};
}

function scoreFrom(issues: IQualityGateIssue[]): number {
	return Math.max(
		0,
		100 - issues.reduce((s, i) => s + DEDUCTIONS[i.severity], 0),
	);
}

function makeDim(
	dimension: QGDimension,
	issues: IQualityGateIssue[],
	rules: IQGRuleResult[] = [],
): IQGDimensionResult {
	return { dimension, score: scoreFrom(issues), issues, rules };
}

// ─── Generic rule runner ──────────────────────────────────────────────────────
// Runs every rule registered for a dimension against one request.
//
// Two independent ways to disable a rule, handled differently:
//  - `configDisabled` (.qgrc.json `disabledRules` / Rules tab checkboxes): the
//    user has permanently turned the rule off, so it is skipped *before* it is
//    even evaluated - no issue, no "suppressed" entry, nothing recorded.
//  - `tagDisabled` (an inline "@qg-disable" note on the request itself): the
//    rule is still evaluated, and if it would have failed, that failure is
//    recorded as a "suppressed" issue for CI/audit visibility - it's excluded
//    from scoring/pass-fail, but still surfaced so the tag's effect is visible.
export function runDimension(
	dimension: QGDimension,
	ctx: IQGRuleEvalContext,
	configDisabled: Set<string>,
	tagDisabled: Set<string>,
): { dim: IQGDimensionResult; suppressed: IQualityGateIssue[] } {
	const issues: IQualityGateIssue[] = [];
	const rules: IQGRuleResult[] = [];
	const suppressed: IQualityGateIssue[] = [];

	for (const rule of getRulesForDimension(dimension)) {
		const fullRuleId = `${dimension.toLowerCase()}/${rule.id}`;

		if (isRuleDisabled(dimension, fullRuleId, configDisabled)) {
			continue;
		}

		const outcome = rule.evaluate(ctx);
		if (!outcome.applicable) {
			continue;
		}

		const severity = outcome.severity ?? rule.defaultSeverity;

		if (isRuleDisabled(dimension, fullRuleId, tagDisabled)) {
			if (!outcome.passed && outcome.issue) {
				suppressed.push({
					...makeIssue(
						ctx.reqId,
						dimension,
						rule.id,
						severity,
						outcome.issue.description,
						outcome.issue.impact,
						outcome.issue.recommendation,
						outcome.issue.suggestedFix,
					),
					suppressed: true,
				});
			}
			continue;
		}

		rules.push({
			ruleId: fullRuleId,
			name: rule.name,
			passed: !!outcome.passed,
			severity: outcome.passed ? undefined : severity,
		});

		if (!outcome.passed && outcome.issue) {
			issues.push(
				makeIssue(
					ctx.reqId,
					dimension,
					rule.id,
					severity,
					outcome.issue.description,
					outcome.issue.impact,
					outcome.issue.recommendation,
					outcome.issue.suggestedFix,
				),
			);
		}
	}

	return { dim: makeDim(dimension, issues, rules), suppressed };
}

// ─── CI/CD gate status (independent of PASS/CONDITIONAL_PASS/FAIL verdict) ───
export function computeGateStatus(
	results: IQualityGateResult[],
	aggregateScore: number,
	config: IQGConfig,
	scoringThresholds: ResolvedThresholds["scoring"],
): IQGGateStatus {
	const reasons: string[] = [];

	const totalCritical = results.reduce((s, r) => s + r.summary.critical, 0);
	const totalHigh = results.reduce((s, r) => s + r.summary.high, 0);

	const maxCritical = config.failOn?.critical ?? 0;
	const maxHigh = config.failOn?.high;
	const minScore =
		config.failOn?.minScore ?? scoringThresholds.conditionalScore;

	if (totalCritical > maxCritical) {
		reasons.push(
			`${totalCritical} critical issue(s) found (max allowed: ${maxCritical})`,
		);
	}
	if (maxHigh !== undefined && totalHigh > maxHigh) {
		reasons.push(
			`${totalHigh} high-severity issue(s) found (max allowed: ${maxHigh})`,
		);
	}
	if (aggregateScore < minScore) {
		reasons.push(
			`Aggregate score ${aggregateScore} is below the minimum required ${minScore}`,
		);
	}

	const passed = reasons.length === 0;
	return { passed, exitCode: passed ? 0 : 1, reasons };
}
