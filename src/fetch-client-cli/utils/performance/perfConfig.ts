import { IPerfConfig, LoadModel, TestScope } from "../../../fetch-client-core/types/perfTest.types";
import { wrtieConsleError } from "../logger";

export const MAX_VUS = 50;
export const MAX_ITERATIONS = 1000;
export const MAX_DURATION_SEC = 3600;
export const MAX_DELAY_MS = 300000;

export const PERF_DEFAULTS = {
	loadModel: "fixed" as LoadModel,
	targetVUs: 5,
	iterations: 10,
	testDurationSec: 30,
	rampUpDurationSec: 20,
	rampSteps: 5,
	thinkTimeMs: 0,
};

const LOAD_MODELS: LoadModel[] = ["fixed", "duration", "rampup", "combined"];

function clamp(value: number, min: number, max: number): number {
	if (isNaN(value)) {
		return min;
	}
	return Math.min(Math.max(value, min), max);
}

export interface PerfCliOptions {
	loadModel?: string;
	vus?: string;
	iterations?: string;
	duration?: string;
	rampupDuration?: string;
	rampupSteps?: string;
	thinkTime?: string;
}

/** Which fields the user explicitly supplied on the command line vs. left to default. */
export interface PerfConfigFieldSource {
	loadModel: boolean;
	targetVUs: boolean;
	iterations: boolean;
	testDurationSec: boolean;
	rampUpDurationSec: boolean;
	rampSteps: boolean;
	thinkTimeMs: boolean;
}

export interface BuiltPerfConfig {
	config: IPerfConfig;
	userProvided: PerfConfigFieldSource;
	/** Fields where a raw value was given but was invalid (NaN) or out of range and got adjusted/rejected. */
	warnings: string[];
}

function parseNumericFlag(
	raw: string | undefined,
	flagName: string,
	fallback: number,
	min: number,
	max: number,
	warnings: string[],
): { value: number; wasProvided: boolean } {
	if (raw === undefined) {
		return { value: fallback, wasProvided: false };
	}

	const parsed = Number(raw);

	if (isNaN(parsed)) {
		warnings.push(`'${flagName} ${raw}' is not a number — using default (${fallback}).`);
		return { value: fallback, wasProvided: false };
	}

	const clamped = clamp(parsed, min, max);
	if (clamped !== parsed) {
		warnings.push(`'${flagName} ${raw}' is out of range (${min}-${max}) — clamped to ${clamped}.`);
	}

	return { value: clamped, wasProvided: true };
}

export function buildPerfConfig(scope: TestScope, opts: PerfCliOptions): BuiltPerfConfig {
	const warnings: string[] = [];
	const loadModel = (opts.loadModel ?? PERF_DEFAULTS.loadModel) as LoadModel;

	if (opts.loadModel !== undefined && !LOAD_MODELS.includes(loadModel)) {
		wrtieConsleError(
			`Invalid --load-model '${opts.loadModel}'. Supported: ${LOAD_MODELS.join(", ")}.`,
		);
		process.exit(1);
	}

	const vus = parseNumericFlag(opts.vus, "--vus", PERF_DEFAULTS.targetVUs, 1, MAX_VUS, warnings);
	const iterations = parseNumericFlag(opts.iterations, "--iterations", PERF_DEFAULTS.iterations, 1, MAX_ITERATIONS, warnings);
	const duration = parseNumericFlag(opts.duration, "--duration", PERF_DEFAULTS.testDurationSec, 1, MAX_DURATION_SEC, warnings);
	const rampupDuration = parseNumericFlag(opts.rampupDuration, "--rampup-duration", PERF_DEFAULTS.rampUpDurationSec, 1, MAX_DURATION_SEC, warnings);
	const thinkTime = parseNumericFlag(opts.thinkTime, "--think-time", PERF_DEFAULTS.thinkTimeMs, 0, MAX_DELAY_MS, warnings);

	// rampSteps is bounded by the resolved VU count, so it's validated after `vus` above.
	const rampSteps = parseNumericFlag(opts.rampupSteps, "--rampup-steps", Math.min(PERF_DEFAULTS.rampSteps, vus.value), 1, vus.value, warnings);

	// Flag relevance check: warn if the user passed a flag the chosen load model ignores.
	if (loadModel === "fixed" || loadModel === "duration") {
		if (opts.rampupDuration !== undefined) {
			warnings.push(`--rampup-duration is ignored with --load-model ${loadModel}.`);
		}
		if (opts.rampupSteps !== undefined) {
			warnings.push(`--rampup-steps is ignored with --load-model ${loadModel}.`);
		}
	}
	if (loadModel === "fixed" || loadModel === "rampup") {
		if (opts.duration !== undefined) {
			warnings.push(`--duration is ignored with --load-model ${loadModel}.`);
		}
	}
	if (loadModel !== "fixed" && opts.iterations !== undefined) {
		warnings.push(`--iterations is ignored with --load-model ${loadModel}.`);
	}

	const config: IPerfConfig = {
		scope,
		loadModel,
		targetVUs: vus.value,
		iterations: iterations.value,
		testDurationSec: duration.value,
		rampUpDurationSec: rampupDuration.value,
		rampSteps: rampSteps.value,
		thinkTimeMs: thinkTime.value,
	};

	const userProvided: PerfConfigFieldSource = {
		loadModel: opts.loadModel !== undefined,
		targetVUs: vus.wasProvided,
		iterations: iterations.wasProvided,
		testDurationSec: duration.wasProvided,
		rampUpDurationSec: rampupDuration.wasProvided,
		rampSteps: rampSteps.wasProvided,
		thinkTimeMs: thinkTime.wasProvided,
	};

	return { config, userProvided, warnings };
}
