export type LoadModel = "fixed" | "duration" | "rampup" | "combined";
export type TestScope = "single" | "collection";

export interface IPerfConfig {
	scope: TestScope;
	loadModel: LoadModel;
	targetVUs: number;
	iterations: number; // used by: fixed
	testDurationSec: number; // used by: duration, combined
	rampUpDurationSec: number; // used by: rampup, combined
	rampSteps: number; // used by: rampup, combined
	thinkTimeMs: number; // delay between waves (closed-loop pacing), all models
}

export interface IPerfResultPoint {
	wave: number;
	vuIndex: number;
	requestId: string;
	requestName: string;
	url: string;
	method: string;
	status: number;
	statusText: string;
	duration: number;
	size?: string;
	isError: boolean;
	timestamp: number;
}

export interface IPerfMetrics {
	total: number;
	success: number;
	failed: number;
	errorRate: number;
	avg: number;
	min: number;
	max: number;
	p50: number;
	p90: number;
	p95: number;
	p99: number;
	rps: number;
	elapsedSec: number;
}

export interface IPerfEndpointMetrics extends IPerfMetrics {
	requestId: string;
	requestName: string;
	url: string;
	method: string;
}
