import {
	IQGConfig,
	IQGRequestInput,
	QGDimension,
	QGSeverity,
} from "../../types/qualityGate.types";

export type ResolvedPerformanceThresholds = Required<
	NonNullable<IQGConfig["thresholds"]>["performance"]
>;
export type ResolvedScoringThresholds = Required<
	NonNullable<IQGConfig["thresholds"]>["scoring"]
>;

export type ResolvedThresholds = {
	performance: ResolvedPerformanceThresholds;
	scoring: ResolvedScoringThresholds;
};

export interface IQGRuleEvalContext {
	input: IQGRequestInput;
	reqId: string;
	thresholds: ResolvedThresholds;
}

export interface IQGRuleIssueDetail {
	description: string;
	impact: string;
	recommendation: string;
	suggestedFix?: string;
}

export interface IQGRuleOutcome {
	/** false = rule does not apply to this request (e.g. a GET-only rule on a
	 *  POST request); the rule is excluded entirely from the results. */
	applicable: boolean;
	passed?: boolean;
	/** Required when passed is false. */
	severity?: QGSeverity;
	/** Present when passed is false. */
	issue?: IQGRuleIssueDetail;
}

/**
 * A single, independently pluggable Quality Gate rule.
 *
 * To add a new rule: push a new object into the relevant dimension's
 * `rules/<dimension>.rules.ts` array - no other file needs to change.
 * To add a brand-new category/dimension: see ruleRegistry.ts.
 */
export interface IQGRuleDefinition {
	/** Short id, unique within its dimension, e.g. "no-auth-mutation". */
	id: string;
	dimension: QGDimension;
	name: string;
	description: string;
	/** Severity used when the rule fails (informational default for the Rules tab). */
	defaultSeverity: QGSeverity;
	evaluate: (ctx: IQGRuleEvalContext) => IQGRuleOutcome;
}
