import { LoadModel } from "./perfTypes";

export function computeVUsForWave(
	loadModel: LoadModel,
	targetVUs: number,
	elapsedMs: number,
	rampUpDurationMs: number,
	rampSteps: number
): number {
	if (loadModel === "fixed" || loadModel === "duration") {
		return targetVUs;
	}

	// rampup / combined: step concurrency up over rampUpDurationMs.
	if (rampUpDurationMs <= 0 || rampSteps <= 0) {
		return targetVUs;
	}

	if (loadModel === "combined" && elapsedMs >= rampUpDurationMs) {
		return targetVUs; // ramp finished, holding at target
	}

	const stepDurationMs = rampUpDurationMs / rampSteps;
	const currentStep = Math.min(rampSteps, Math.floor(elapsedMs / stepDurationMs) + 1);
	const vus = Math.round((targetVUs * currentStep) / rampSteps);

	return Math.max(1, vus);
}

export function shouldStopTest(
	loadModel: LoadModel,
	waveIndex: number,
	elapsedMs: number,
	iterations: number,
	testDurationMs: number,
	rampUpDurationMs: number
): boolean {
	switch (loadModel) {
		case "fixed":
			return waveIndex >= iterations;
		case "duration":
			return elapsedMs >= testDurationMs;
		case "rampup":
			return elapsedMs >= rampUpDurationMs;
		case "combined":
			return elapsedMs >= (rampUpDurationMs + testDurationMs);
		default:
			return true;
	}
}

export function percentile(sortedValues: number[], p: number): number {
	if (sortedValues.length === 0) {
		return 0;
	}

	const index = Math.ceil((p / 100) * sortedValues.length) - 1;
	return sortedValues[Math.min(Math.max(index, 0), sortedValues.length - 1)];
}
