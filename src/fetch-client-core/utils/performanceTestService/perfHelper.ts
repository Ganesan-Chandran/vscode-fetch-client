import { formatDate } from "../../helpers/dateTime.helper";
import {
	IPerfConfig,
	IPerfEndpointMetrics,
	IPerfMetrics,
	IPerfResultPoint,
} from "../../types/perfTest.types";
import { percentile } from "./perfEngine";
import { toPerfHtml } from "./perfHtmlExporter";
import { toPerfXml } from "./perfXmlExporter";

export function computeMetrics(
	results: IPerfResultPoint[],
	elapsedSec: number,
): IPerfMetrics {
	const total = results.length;
	const durations = results.map((r) => r.duration).sort((a, b) => a - b);
	const failed = results.filter(
		(r) => r.isError || r.status >= 400 || r.status === 0,
	).length;
	const success = total - failed;

	return {
		total,
		success,
		failed,
		errorRate: total > 0 ? (failed / total) * 100 : 0,
		avg: total > 0 ? durations.reduce((a, b) => a + b, 0) / total : 0,
		min: total > 0 ? durations[0] : 0,
		max: total > 0 ? durations[total - 1] : 0,
		p50: percentile(durations, 50),
		p90: percentile(durations, 90),
		p95: percentile(durations, 95),
		p99: percentile(durations, 99),
		rps: elapsedSec > 0 ? total / elapsedSec : 0,
		elapsedSec,
	};
}

export function computeEndpointBreakdown(
	results: IPerfResultPoint[],
	elapsedSec: number,
): IPerfEndpointMetrics[] {
	const grouped = new Map<string, IPerfResultPoint[]>();

	results.forEach((r) => {
		if (!grouped.has(r.requestId)) {
			grouped.set(r.requestId, []);
		}
		grouped.get(r.requestId).push(r);
	});

	const breakdown: IPerfEndpointMetrics[] = [];
	grouped.forEach((points, requestId) => {
		const metrics = computeMetrics(points, elapsedSec);
		breakdown.push({
			...metrics,
			requestId,
			requestName: points[0].requestName,
			url: points[0].url,
			method: points[0].method,
		});
	});

	return breakdown.sort((a, b) => a.requestName.localeCompare(b.requestName));
}

export function exportPerfJson(
	config: IPerfConfig,
	results: IPerfResultPoint[],
	metrics: IPerfMetrics,
	breakdown: IPerfEndpointMetrics[],
	testName: string,
) {
	return {
		app: "Fetch Client",
		testType: "Performance Test",
		testName,
		exportedDate: formatDate(),
		config,
		summary: metrics,
		endpointBreakdown: breakdown,
		rawResults: results,
	};
}

export function exportPerfCSV(
	metrics: IPerfMetrics,
	breakdown: IPerfEndpointMetrics[],
	testName: string,
): string {
	let data = `app,Fetch Client\ntestType,Performance Test\ntestName,${testName}\nexportedDate,${formatDate()}\n\n`;

	data += `Summary\n`;
	data += `Total,Success,Failed,ErrorRate(%),Avg(ms),Min(ms),Max(ms),P50(ms),P90(ms),P95(ms),P99(ms),RPS,Elapsed(s)\n`;
	data +=
		`${metrics.total},${metrics.success},${metrics.failed},${metrics.errorRate.toFixed(2)},` +
		`${metrics.avg.toFixed(2)},${metrics.min},${metrics.max},${metrics.p50},${metrics.p90},${metrics.p95},` +
		`${metrics.p99},${metrics.rps.toFixed(2)},${metrics.elapsedSec.toFixed(2)}\n\n`;

	data += `Endpoint Breakdown\n`;
	data += `Request,Total,Success,Failed,ErrorRate(%),Avg(ms),P95(ms),RPS\n`;
	breakdown.forEach((b) => {
		data +=
			`${b.requestName},${b.total},${b.success},${b.failed},${b.errorRate.toFixed(2)},` +
			`${b.avg.toFixed(2)},${b.p95},${b.rps.toFixed(2)}\n`;
	});

	return data;
}

export function exportPerfHtml(
	config: IPerfConfig,
	results: IPerfResultPoint[],
	metrics: IPerfMetrics,
	breakdown: IPerfEndpointMetrics[],
	testName: string,
): string {
	return toPerfHtml(config, results, metrics, breakdown, testName);
}

export function exportPerfXml(
	config: IPerfConfig,
	results: IPerfResultPoint[],
	metrics: IPerfMetrics,
	breakdown: IPerfEndpointMetrics[],
	testName: string,
): string {
	return toPerfXml(config, results, metrics, breakdown, testName);
}
