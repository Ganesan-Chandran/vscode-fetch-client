import {
	IQGConfig,
	IQGReport,
	IQGRequestInput,
	IQualityGateIssue,
	IQualityGateResult,
	QGVerdict,
} from "../types/qualityGate.types";
import {
	computeGateStatus,
	parseInlineDisabledRules,
	resetIssueIdCounter,
	resolveThresholds,
	resolveWeights,
	runDimension,
} from "./qualityGate/qualityGateEngine";
import { ALL_DIMENSIONS } from "./qualityGate/ruleRegistry";

// ─── Main entry points ────────────────────────────────────────────────────────
// All rule logic now lives in helpers/qualityGate/ (rule engine + per-category
// rule files under rules/*.rules.ts). This file only orchestrates a single run:
// resolve config → run every dimension → aggregate score/verdict.
//
// To add a rule or a whole new category, see ruleRegistry.ts - nothing in this
// file needs to change.

export function runQualityGate(
	input: IQGRequestInput,
	config: IQGConfig = {},
): IQualityGateResult {
	// Reset per-run counter so IDs are deterministic within a single gate run.
	resetIssueIdCounter();

	const reqId = input.request.id;
	const thresholds = resolveThresholds(config);
	const weights = resolveWeights(config);

	// Two distinct disable sources, kept separate - see runDimension() for why:
	// config-disabled rules are skipped outright, tag-disabled rules are still
	// evaluated and reported as "suppressed" for audit purposes.
	const configDisabled = new Set<string>(
		(config.disabledRules ?? []).map((r) => r.toLowerCase()),
	);
	const tagDisabled = parseInlineDisabledRules(input.request.notes);

	const ctx = { input, reqId, thresholds };
	const suppressed: IQualityGateIssue[] = [];
	const dimensions = ALL_DIMENSIONS.map((dimension) => {
		const { dim, suppressed: dimSuppressed } = runDimension(
			dimension,
			ctx,
			configDisabled,
			tagDisabled,
		);
		suppressed.push(...dimSuppressed);
		return dim;
	});

	const overallScore = Math.round(
		dimensions.reduce(
			(acc, d) => acc + d.score * (weights[d.dimension] ?? 0),
			0,
		),
	);

	const allIssues = dimensions.flatMap((d) => d.issues);
	const summary = {
		critical: allIssues.filter((i) => i.severity === "Critical").length,
		high: allIssues.filter((i) => i.severity === "High").length,
		medium: allIssues.filter((i) => i.severity === "Medium").length,
		low: allIssues.filter((i) => i.severity === "Low").length,
		total: allIssues.length,
	};

	const verdict: QGVerdict =
		summary.critical > 0 || overallScore < thresholds.scoring.conditionalScore
			? "FAIL"
			: overallScore < thresholds.scoring.passScore
				? "CONDITIONAL_PASS"
				: "PASS";

	return {
		requestId: reqId,
		requestName: input.request.name,
		method: input.request.method.toUpperCase(),
		url: input.request.url,
		timestamp: new Date().toISOString(),
		dimensions,
		overallScore,
		verdict,
		summary,
		suppressedIssues: suppressed.length ? suppressed : undefined,
	};
}

export function runQualityGateForCollection(
	name: string,
	inputs: IQGRequestInput[],
	config: IQGConfig = {},
): IQGReport {
	const thresholds = resolveThresholds(config);
	const results = inputs.map((i) => runQualityGate(i, config));

	const aggregateScore = results.length
		? Math.round(
				results.reduce((s, r) => s + r.overallScore, 0) / results.length,
			)
		: 0;
	const hasCritical = results.some((r) => r.summary.critical > 0);
	const aggregateVerdict: QGVerdict =
		hasCritical || aggregateScore < thresholds.scoring.conditionalScore
			? "FAIL"
			: aggregateScore < thresholds.scoring.passScore
				? "CONDITIONAL_PASS"
				: "PASS";

	const gateStatus = computeGateStatus(
		results,
		aggregateScore,
		config,
		thresholds.scoring,
	);

	return {
		name,
		runAt: new Date().toISOString(),
		results,
		aggregateScore,
		aggregateVerdict,
		config,
		gateStatus,
	};
}
