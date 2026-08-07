import { IQGRuleMeta, QGDimension } from "../../types/qualityGate.types";
import { IQGRuleDefinition } from "./qgEngineTypes";
import { designRules } from "./rules/design.rules";
import { functionalRules } from "./rules/functional.rules";
import { maintainabilityRules } from "./rules/maintainability.rules";
import { observabilityRules } from "./rules/observability.rules";
import { performanceRules } from "./rules/performance.rules";
import { securityRules } from "./rules/security.rules";
import { testCoverageRules } from "./rules/testCoverage.rules";

// ─── Rule registry (plug-and-play) ────────────────────────────────────────────
// To add a rule: push a new entry into the relevant `rules/<dimension>.rules.ts`
// array - nothing else needs to change.
//
// To add a brand-new category/dimension:
//   1. Add the new name to `QGDimension` (qualityGate.types.ts).
//   2. Create `rules/<name>.rules.ts` exporting an `IQGRuleDefinition[]`.
//   3. Add a weight for it to `DEFAULT_WEIGHTS` (qualityGateEngine.ts).
//   4. Register the array below.
const RULES_BY_DIMENSION: Record<QGDimension, IQGRuleDefinition[]> = {
	Functional: functionalRules,
	Security: securityRules,
	Performance: performanceRules,
	Design: designRules,
	Observability: observabilityRules,
	TestCoverage: testCoverageRules,
	Maintainability: maintainabilityRules,
};

export const ALL_DIMENSIONS: QGDimension[] = Object.keys(
	RULES_BY_DIMENSION,
) as QGDimension[];

export function getRulesForDimension(
	dimension: QGDimension,
): IQGRuleDefinition[] {
	return RULES_BY_DIMENSION[dimension] ?? [];
}

export function getAllRuleDefinitions(): IQGRuleDefinition[] {
	return ALL_DIMENSIONS.flatMap((d) => RULES_BY_DIMENSION[d]);
}

/** Static metadata for every registered rule (no execution) - used by the
 *  Rules tab UI to render checkboxes grouped by dimension. */
export function getRuleMetas(): IQGRuleMeta[] {
	return getAllRuleDefinitions().map((r) => ({
		ruleId: `${r.dimension.toLowerCase()}/${r.id}`,
		dimension: r.dimension,
		name: r.name,
		description: r.description,
		defaultSeverity: r.defaultSeverity,
	}));
}
