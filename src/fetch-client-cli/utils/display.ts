import {
	ICollections,
	IFolder,
	IHistory,
} from "../../fetch-client-core/types/sidebar.types";
import {
	IPreFetchResponse,
	ITestResult,
} from "../../fetch-client-core/types/response.types";
import { ITableData } from "../../fetch-client-core/types/common.types";
import { writeConsoleLog } from "./logger";
import { IPerfMetrics, IPerfEndpointMetrics, IPerfResultPoint, IPerfConfig } from "../../fetch-client-core/types/perfTest.types";
import { PerfConfigFieldSource } from "./performance/perfConfig";

// === ANSI colour helpers ====================================================

const C = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	red: "\x1b[31m",
	yellow: "\x1b[33m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	blueBg: "\x1b[44m",
};

export function bold(s: string) {
	return `${C.bold}${s}${C.reset}`;
}
export function dim(s: string) {
	return `${C.dim}${s}${C.reset}`;
}
export function green(s: string) {
	return `${C.green}${s}${C.reset}`;
}
export function red(s: string) {
	return `${C.red}${s}${C.reset}`;
}
export function yellow(s: string) {
	return `${C.yellow}${s}${C.reset}`;
}
export function cyan(s: string) {
	return `${C.cyan}${s}${C.reset}`;
}

export function methodBadge(method: string): string {
	const m = method.toUpperCase();
	const colours: Record<string, string> = {
		GET: "\x1b[32m",
		POST: "\x1b[34m",
		PUT: "\x1b[33m",
		PATCH: "\x1b[35m",
		DELETE: "\x1b[31m",
		HEAD: "\x1b[36m",
		OPTIONS: "\x1b[37m",
	};

	const colour = colours[m] ?? "\x1b[37m";
	return `${colour}${C.bold}${m.padEnd(7)}${C.reset}`;
}

export function statusBadge(status: number): string {
	if (status >= 200 && status < 300) {
		return green(`${status}`);
	}
	if (status >= 300 && status < 400) {
		return yellow(`${status}`);
	}
	return red(`${status}`);
}

// === Section / table helpers ================================================

export function printSection(title: string): void {
	writeConsoleLog(`\n${C.bold}${C.cyan}${title}${C.reset}`);
	writeConsoleLog(cyan("-".repeat(title.length)));
}

export function printTable(rows: string[][]): void {
	if (rows.length === 0) {
		return;
	}

	// Calculate column widths
	const widths = rows[0].map((_, ci) =>
		Math.max(...rows.map((r) => stripAnsi(r[ci] ?? "").length)),
	);

	for (const row of rows) {
		const line = row
			.map((cell, ci) => {
				const pad = widths[ci] - stripAnsi(cell).length;
				return cell + " ".repeat(Math.max(0, pad));
			})
			.join("  ");

		writeConsoleLog("  " + line);
	}
}

function stripAnsi(s: string): string {
	// Remove ANSI escape sequences for width calculation
	return s.replace(/\x1b\[[0-9;]*m/g, "");
}

// === Collection / variable list =============================================

export interface CollectionRow {
	id: string;
	name: string;
	requestCount: number;
	variableId: string;
	createdTime: string;
}

export function printCollections(items: CollectionRow[]): void {
	if (items.length === 0) {
		writeConsoleLog(dim(" No collections found."));
		return;
	}

	const header = [
		bold("ID"),
		bold("Name"),
		bold("Requests"),
		bold("Variable"),
		bold("Created"),
	];
	const rows = [
		header,
		...items.map((c) => [
			dim(c.id),
			cyan(c.name),
			String(c.requestCount),
			c.variableId ? dim(c.variableId) : dim("-"),
			dim(c.createdTime),
		]),
	];
	printTable(rows);
}

export interface FolderRow {
	id: string;
	name: string;
	collectionName: string;
	requestCount: number;
	createdTime: string;
}

export function printFolders(items: FolderRow[]): void {
	if (items.length === 0) {
		writeConsoleLog(dim(" No folders found."));
		return;
	}

	const header = [
		bold("ID"),
		bold("Name"),
		bold("Collection"),
		bold("Requests"),
		bold("Created"),
	];
	const rows = [
		header,
		...items.map((f) => [
			dim(f.id),
			cyan(f.name),
			yellow(f.collectionName),
			String(f.requestCount),
			dim(f.createdTime),
		]),
	];
	printTable(rows);
}

export interface VariableRow {
	id: string;
	name: string;
	active: boolean;
	varCount: number;
	createdTime: string;
}

export function printVariables(items: VariableRow[]): void {
	if (items.length === 0) {
		writeConsoleLog(dim(" No variable sets found."));
		return;
	}

	const header = [
		bold("ID"),
		bold("Name"),
		bold("Active"),
		bold("Variables"),
		bold("Created"),
	];
	const rows = [
		header,
		...items.map((v) => [
			dim(v.id),
			cyan(v.name),
			v.active ? green("yes") : red("no"),
			String(v.varCount),
			dim(v.createdTime),
		]),
	];
	printTable(rows);
}

export function printVariableItems(varName: string, items: ITableData[]): void {
	if (!items || items.length === 0) {
		writeConsoleLog(dim(`   ${varName}: (no items)`));
		return;
	}
	writeConsoleLog(`\n   ${bold(cyan(varName))}`);
	const header = [bold("Key"), bold("Value"), bold("Active")];
	const rows = [
		header,
		...items.map((d) => [
			cyan(d.key),
			yellow(d.value ?? ""),
			d.isChecked === false ? red("no") : green("yes"),
		]),
	];
	printTable(rows);
}

// === Collection / folder tree ============================================

function isTreeFolder(item: IHistory | IFolder): item is IFolder {
	return (item as IFolder).type === "folder";
}

function printTreeNode(item: IHistory | IFolder, indent: number): void {
	const prefix = "  ".repeat(indent);

	if (isTreeFolder(item)) {
		writeConsoleLog(
			`${prefix} ${yellow("▶")} ${bold(item.name)} ${dim("[folder]")} ${dim(item.id)}`,
		);

		if (item.data && item.data.length > 0) {
			for (const child of item.data) {
				printTreeNode(child, indent + 1);
			}
		}
	} else {
		const req = item as IHistory;
		const truncatedUrl =
			req.url.length > 50 ? req.url.slice(0, 47) + "..." : req.url;
		writeConsoleLog(
			`${prefix} ${methodBadge(req.method)}${dim(yellow(req.name))} ${cyan(truncatedUrl)} ${dim(req.id)}`,
		);
	}
}

export function printCollectionTree(col: ICollections): void {
	writeConsoleLog(`\n ${bold(cyan(col.name))} ${dim(col.id)}`);

	if (!col.data || col.data.length === 0) {
		writeConsoleLog(dim("    (empty)"));
		return;
	}

	for (const item of col.data) {
		printTreeNode(item, 1);
	}
}

export function printFolderTree(folder: IFolder, collectionName: string): void {
	writeConsoleLog(
		`\n ${bold(cyan(folder.name))} ${dim("[folder in: " + collectionName + "]")} ${dim(folder.id)}`,
	);

	if (!folder.data || folder.data.length === 0) {
		writeConsoleLog(dim("    (empty)"));
		return;
	}

	for (const item of folder.data) {
		printTreeNode(item, 1);
	}
}

// ── Request execution result ───────────────────────────────────────────

export interface RunResult {
	id: string;
	name: string;
	method: string;
	url: string;
	parent?: string;
	status: number;
	statusText: string;
	duration: number;
	size: number;
	responseData: string;
	responseType?: { isBinaryFile: boolean; format: string };
	isError: boolean;
	testResults: ITestResult[];
	preFetchResponses?: IPreFetchResponse[];
}

export function printPreFetchInfo(
	responses: IPreFetchResponse[],
	indent: number = 1,
): void {
	const prefix = "  ".repeat(indent);

	for (const r of responses) {
		const ok = r.resStatus >= 200 && r.resStatus < 400;
		const icon = r.reqId === "-1" ? red("✗") : ok ? green("✓") : red("✗");

		const statusStr = r.resStatus > 0 ? ` ${statusBadge(r.resStatus)}` : "";

		writeConsoleLog(`${prefix}${icon} ${cyan(r.name)}${statusStr}`);

		if (r.childrenResponse && r.childrenResponse.length > 0) {
			printPreFetchInfo(r.childrenResponse, indent + 1);
		}
	}
}

export function printRunResult(result: RunResult): void {
	if (result.preFetchResponses && result.preFetchResponses.length > 0) {
		writeConsoleLog(`${yellow(bold("Pre-Requests:"))}`);
		printPreFetchInfo(result.preFetchResponses);
		writeConsoleLog(`\n${yellow(bold("Request:"))}`);
	}

	const statusStr = statusBadge(result.status);
	const durationStr = dim(`${result.duration}ms`);
	const sizeStr = dim(formatBytes(result.size));

	writeConsoleLog(
		`${methodBadge(result.method)} ${bold(result.name)}   ${cyan(result.url)}`,
	);

	writeConsoleLog(
		`\n${yellow("Status")}: ${statusStr} ${dim(result.statusText)} | ${durationStr} | ${sizeStr}`,
	);

	if (result.responseType?.isBinaryFile) {
		writeConsoleLog(` ${dim("[Binary file - not displayed")}`);
	} else if (result.isError && result.responseData) {
		writeConsoleLog(`${red("Error:")} ${result.responseData}`);
	} else if (result.responseData) {
		printResponseBody(result.responseData, result.responseType?.format);
	}

	if (result.testResults && result.testResults.length > 0) {
		writeConsoleLog(`\n${bold(yellow("Tests:"))}`);
		for (const t of result.testResults) {
			const icon = t.result ? green("✓") : red("✗");
			writeConsoleLog(
				` ${icon} ${t.test}${t.actualValue ? dim(` (got: ${t.actualValue})`) : ""}`,
			);
		}
	}

	writeConsoleLog("");
}

export function printRunSummary(results: RunResult[]): void {
	const total = results.length;
	const passed = results.filter(
		(r) => !r.isError && r.status >= 200 && r.status < 400,
	).length;
	const failed = total - passed;
	const totalTests = results.reduce(
		(s, r) => s + (r.testResults?.length ?? 0),
		0,
	);
	const passedTests = results.reduce(
		(s, r) => s + (r.testResults?.filter((t) => t.result).length ?? 0),
		0,
	);
	const failedTests = totalTests - passedTests;

	printSection("Summary");

	const separator = "-".repeat(150);

	writeConsoleLog(separator);
	writeConsoleLog(
		fit("Id", 38) +
		fit("Name", 22) +
		fit("Method", 8) +
		fit("URL", 35) +
		fit("Location", 18) +
		fit("Status", 8) +
		fit("Duration", 11) +
		fit("Pre", 7) +
		fit("Test", 7),
	);
	writeConsoleLog(separator);

	for (const r of results) {
		const ok = !r.isError && r.status >= 200 && r.status < 400;

		const icon = ok ? green("✓") : red("✗");
		const preTotal = r.preFetchResponses?.length ?? 0;
		const prePassed =
			r.preFetchResponses?.filter(
				(x) => x.resStatus >= 200 && x.resStatus < 400,
			).length ?? 0;
		const pre = preTotal === 0 ? "-" : `${prePassed}/${preTotal}`;
		const testTotal = r.testResults?.length ?? 0;
		const testPassed = r.testResults?.filter((x) => x.result).length ?? 0;
		const test = testTotal === 0 ? "-" : `${testPassed}/${testTotal}`;

		writeConsoleLog(
			fitAnsi(`${icon} ${r.id}`, 40) +
			fitAnsi(cyan(r.name), 22) +
			fitAnsi(methodBadge(r.method.toUpperCase()), 8) +
			fitAnsi(dim(shortUrl(r.url)), 35) +
			fitAnsi(yellow(r.parent ?? "-"), 18) +
			fitAnsi(statusBadge(r.status), 8) +
			fitAnsi(dim(`${r.duration} ms`), 11) +
			fitAnsi(pre, 7) +
			fitAnsi(test, 7),
		);
	}

	writeConsoleLog(separator);
	writeConsoleLog("");
	writeConsoleLog(
		`Requests : ${green(String(passed))} passed, ${failed > 0 ? red(String(failed)) : dim("0")} failed, ${dim(String(total))} total`,
	);
	if (totalTests > 0) {
		writeConsoleLog(
			`Tests    : ${green(String(passedTests))} passed, ${failedTests > 0 ? red(String(failedTests)) : dim("0")} failed, ${dim(String(totalTests))} total`,
		);
	}
	writeConsoleLog("");
}

function fitAnsi(value: string, width: number): string {
	const visibleLength = stripAnsi(value).length;
	if (visibleLength > width) {
		const plain = stripAnsi(value);
		value = plain.substring(0, width - 3) + "...";
		return value.padEnd(width);
	}
	return value + " ".repeat(width - visibleLength);
}

function fit(value: string, width: number): string {
	if (!value) {
		return "".padEnd(width);
	}
	value = stripAnsi(value);
	if (value.length > width) {
		value = value.substring(0, width - 3) + "...";
	}
	return value.padEnd(width);
}

function shortUrl(url: string): string {
	if (!url) {
		return "";
	}

	try {
		const u = new URL(url);
		const value = u.pathname + u.search;
		if (value.length <= 32) {
			return value;
		}
		return value.substring(0, 29) + "...";
	} catch {
		if (url.length <= 32) {
			return url;
		}
		return url.substring(0, 29) + "...";
	}
}

function printResponseBody(data: string, format?: string): void {
	writeConsoleLog(`${bold(yellow("Response:"))}`);
	const fmt = (format ?? "").toLocaleLowerCase();

	if (fmt === "json") {
		try {
			const parsed = JSON.parse(data);
			const pretty = JSON.stringify(parsed, null, 2);
			writeConsoleLog(
				colorJson(pretty)
					.split("\n")
					.map((l) => `   ${l}`)
					.join("\n"),
			);
		} catch {
			writeConsoleLog(`   ${data}`);
		}
	} else if (fmt === "xml" || fmt === "xhtml" || fmt === "html") {
		writeConsoleLog(
			colorXml(data)
				.split("\n")
				.map((l) => `   ${l}`)
				.join("\n"),
		);
	} else {
		writeConsoleLog(`   ${data}`);
	}
}

function colorJson(text: string): string {
	return text.replace(
		/("(?:\\.|[^"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?/g,
		(match, str, colon) => {
			if (str) {
				return colon
					? `${C.cyan}${str}${C.reset}${colon}`
					: `${C.green}${str}${C.reset}`;
			}
			if (match === "true" || match === "false") {
				return `${C.yellow}${match}${C.reset}`;
			}
			if (match === "null") {
				return `${C.dim}${match}${C.reset}`;
			}
			return `${C.red}${match}${C.reset}`;
		},
	);
}

function colorXml(xml: string): string {
	return xml.replace(
		/(<\/?)([\w:-]+)([^>]*?)(\/?>)|(".*?")/g,
		(_, open, tag, attrs, close, quoted) => {
			if (quoted) {
				return `${C.green}${quoted}${C.reset}`;
			}
			const coloredAttrs = attrs.replace(
				/([\w:-]+)=(".*?")/g,
				(_, key, value) =>
					`${C.yellow}${key}${C.reset}=${C.green}${value}${C.reset}`,
			);
			return `${C.cyan}${open}${tag}${C.reset}${coloredAttrs}${C.cyan}${close}${C.reset}`;
		},
	);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ── Performance test progress / summary ────────────────────────────────

export function printPerfProgress(
	results: IPerfResultPoint[],
	elapsedMs: number,
	wave: number,
	isTTY: boolean,
): void {
	const total = results.length;
	const errors = results.filter((r) => r.isError).length;
	const elapsedSec = (elapsedMs / 1000).toFixed(1);

	const line = `Wave ${bold(String(wave))} │ Sent ${cyan(String(total))} │ Errors ${errors > 0 ? red(String(errors)) : dim("0")} │ Elapsed ${dim(`${elapsedSec}s`)}`;

	if (isTTY) {
		process.stderr.write(`\r\x1b[K  ${line}`);
	} else {
		writeConsoleLog(`[perf] Wave ${wave} sent=${total} errors=${errors} elapsed=${elapsedSec}s`);
	}
}

export function printPerfConfigSummary(
	testName: string,
	scopeLabel: string,
	config: IPerfConfig,
	userProvided: PerfConfigFieldSource,
	warnings: string[],
): void {
	printSection("Performance Test Configuration");

	writeConsoleLog(`Target    : ${cyan(scopeLabel)} ${dim(`"${testName}"`)}`);
	writeConsoleLog("");

	function row(label: string, flag: string, value: string | number, provided: boolean) {
		const tag = provided ? green("(user)") : dim("(default)");
		writeConsoleLog(`  ${fit(label, 20)}${fit(String(value), 12)}${fit(flag, 22)}${tag}`);
	}

	row("Load Model", "--load-model", config.loadModel, userProvided.loadModel);
	row("Virtual Users", "--vus", config.targetVUs, userProvided.targetVUs);

	if (config.loadModel === "fixed") {
		row("Iterations/VU", "--iterations", config.iterations, userProvided.iterations);
	}
	if (config.loadModel === "duration" || config.loadModel === "combined") {
		row("Duration (sec)", "--duration", config.testDurationSec, userProvided.testDurationSec);
	}
	if (config.loadModel === "rampup" || config.loadModel === "combined") {
		row("Ramp-up (sec)", "--rampup-duration", config.rampUpDurationSec, userProvided.rampUpDurationSec);
		row("Ramp-up Steps", "--rampup-steps", config.rampSteps, userProvided.rampSteps);
	}

	row("Think-time (ms)", "--think-time", config.thinkTimeMs, userProvided.thinkTimeMs);

	writeConsoleLog("");

	if (warnings.length > 0) {
		for (const w of warnings) {
			writeConsoleLog(`  ${yellow("⚠")} ${w}`);
		}
		writeConsoleLog("");
	}
}

export function printPerfSummary(
	metrics: IPerfMetrics,
	breakdown: IPerfEndpointMetrics[],
	status: "Completed" | "Cancelled",
): void {
	process.stderr.write("\n");

	const statusLabel = status === "Completed" ? green(bold(status)) : yellow(bold(status));
	printSection(`Performance Test ${status}`);

	writeConsoleLog(`Status    : ${statusLabel}`);
	writeConsoleLog(
		`Requests  : ${green(String(metrics.success))} success, ${metrics.failed > 0 ? red(String(metrics.failed)) : dim("0")} failed, ${dim(String(metrics.total))} total (${metrics.errorRate.toFixed(1)}% error rate)`,
	);
	writeConsoleLog(
		`Latency   : avg ${dim(`${metrics.avg.toFixed(0)}ms`)}  min ${dim(`${metrics.min.toFixed(0)}ms`)}  max ${dim(`${metrics.max.toFixed(0)}ms`)}  p50 ${dim(`${metrics.p50.toFixed(0)}ms`)}  p90 ${dim(`${metrics.p90.toFixed(0)}ms`)}  p95 ${dim(`${metrics.p95.toFixed(0)}ms`)}  p99 ${dim(`${metrics.p99.toFixed(0)}ms`)}`,
	);
	writeConsoleLog(
		`Throughput: ${cyan(metrics.rps.toFixed(1))} req/s over ${dim(`${metrics.elapsedSec.toFixed(1)}s`)}`,
	);
	writeConsoleLog("");

	if (breakdown.length <= 1) {
		return;
	}

	printSection("Breakdown by Request");

	const separator = "-".repeat(150);
	writeConsoleLog(separator);
	writeConsoleLog(
		fit("Request", 30) +
		fit("Method", 8) +
		fit("Total", 8) +
		fit("Failed", 8) +
		fit("Error %", 9) +
		fit("Avg", 10) +
		fit("P95", 10) +
		fit("P99", 10) +
		fit("RPS", 8),
	);
	writeConsoleLog(separator);

	for (const b of breakdown) {
		writeConsoleLog(
			fitAnsi(cyan(b.requestName), 30) +
			fitAnsi(methodBadge(b.method.toUpperCase()), 8) +
			fitAnsi(dim(String(b.total)), 8) +
			fitAnsi(b.failed > 0 ? red(String(b.failed)) : dim("0"), 8) +
			fitAnsi(dim(`${b.errorRate.toFixed(1)}%`), 9) +
			fitAnsi(dim(`${b.avg.toFixed(0)}ms`), 10) +
			fitAnsi(dim(`${b.p95.toFixed(0)}ms`), 10) +
			fitAnsi(dim(`${b.p99.toFixed(0)}ms`), 10) +
			fitAnsi(dim(b.rps.toFixed(1)), 8),
		);
	}

	writeConsoleLog(separator);
	writeConsoleLog("");
}
