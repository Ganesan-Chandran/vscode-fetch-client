import { escapeXml } from "../escapeHelpers";
import {
	IPerfConfig,
	IPerfEndpointMetrics,
	IPerfMetrics,
	IPerfResultPoint,
} from "../../types/perfTest.types";

function renderMetricsAttrs(m: IPerfMetrics): string {
	return `total="${m.total}" success="${m.success}" failed="${m.failed}" errorRate="${m.errorRate.toFixed(2)}" avg="${m.avg.toFixed(2)}" min="${m.min}" max="${m.max}" p50="${m.p50}" p90="${m.p90}" p95="${m.p95}" p99="${m.p99}" rps="${m.rps.toFixed(2)}" elapsedSec="${m.elapsedSec.toFixed(2)}"`;
}

function renderBreakdown(breakdown: IPerfEndpointMetrics[]): string {
	if (breakdown.length === 0) {
		return "";
	}
	return `\n  <endpointBreakdown>\n${breakdown
		.map(
			(b) =>
				`    <endpoint requestId="${escapeXml(b.requestId)}" requestName="${escapeXml(b.requestName)}" url="${escapeXml(b.url)}" method="${escapeXml(b.method)}" ${renderMetricsAttrs(b)} />`,
		)
		.join("\n")}\n  </endpointBreakdown>`;
}

function renderRawResults(results: IPerfResultPoint[]): string {
	if (results.length === 0) {
		return "";
	}
	return `\n  <rawResults>\n${results
		.map(
			(r) =>
				`    <result wave="${r.wave}" vuIndex="${r.vuIndex}" requestId="${escapeXml(r.requestId)}" requestName="${escapeXml(r.requestName)}" url="${escapeXml(r.url)}" method="${escapeXml(r.method)}" status="${r.status}" statusText="${escapeXml(r.statusText)}" duration="${r.duration}" isError="${r.isError}" timestamp="${r.timestamp}" />`,
		)
		.join("\n")}\n  </rawResults>`;
}

export function toPerfXml(
	config: IPerfConfig,
	results: IPerfResultPoint[],
	metrics: IPerfMetrics,
	breakdown: IPerfEndpointMetrics[],
	testName: string,
): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<perfTestReport name="${escapeXml(testName)}" scope="${escapeXml(config.scope)}" loadModel="${escapeXml(config.loadModel)}">
  <config targetVUs="${config.targetVUs}" iterations="${config.iterations}" testDurationSec="${config.testDurationSec}" rampUpDurationSec="${config.rampUpDurationSec}" rampSteps="${config.rampSteps}" thinkTimeMs="${config.thinkTimeMs}" />
  <summary ${renderMetricsAttrs(metrics)} />${renderBreakdown(breakdown)}${renderRawResults(results)}
</perfTestReport>
`;
}
