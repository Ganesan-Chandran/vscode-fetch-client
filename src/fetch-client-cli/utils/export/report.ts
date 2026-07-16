import {
	ExportFormat,
	ExportSummary,
	ExportContext,
	ExportReport,
} from "../../types/export.types";
import { cliConfig } from "../../config";
import { RunResult } from "../display";
import { toCsv } from "./csvExporter";
import { toHtml } from "./htmlExporter";
import { toJson } from "./jsonExporter";
import { toNUnit } from "./nunitExporter";
import { toXml } from "./xmlExporter";
import * as fs from "fs/promises";
import * as path from "path";
import { toExportRequestResults } from "./transform";
import { wrtieConsleError } from "../logger";

const EXPORT_DIR_NAME = "fetch-client-exports";

const EXTENSION_BY_FORMAT: Record<ExportFormat, string> = {
	csv: "csv",
	html: "html",
	json: "json",
	xml: "xml",
	nunit: "xml",
};

function buildSummary(results: RunResult[]): ExportSummary {
	const totalRequests = results.length;
	const passedRequests = results.filter(
		(r) => !r.isError && r.status >= 200 && r.status < 400,
	).length;
	const failedRequests = totalRequests - passedRequests;
	const totalDurationMs = results.reduce(
		(sum, r) => sum + (r.duration ?? 0),
		0,
	);

	let totalTests = 0;
	let passedTests = 0;

	for (const r of results) {
		const tests = r.testResults ?? [];
		totalTests += tests.length;
		passedTests += tests.filter((t) => t.result).length;
	}

	return {
		totalRequests,
		passedRequests,
		failedRequests,
		totalDurationMs,
		totalTests,
		passedTests,
		failedTests: totalTests - passedTests,
		generatedAt: new Date().toISOString(),
	};
}

export function buildExportReport(
	results: RunResult[],
	context: ExportContext,
): ExportReport {
	return {
		context,
		summary: buildSummary(results),
		results: toExportRequestResults(results),
	};
}

export function slugify(value: string): string {
	const slug = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return slug || "report";
}

export function timestampForFilename(): string {
	return new Date().toISOString().replace(/[:.]/g, "-");
}

function renderReport(report: ExportReport, format: ExportFormat): string {
	switch (format) {
		case "csv":
			return toCsv(report);
		case "html":
			return toHtml(report);
		case "json":
			return toJson(report);
		case "xml":
			return toXml(report);
		case "nunit":
			return toNUnit(report);
		default: {
			// Exhaustiveness check - compiler error if a new ExportFormat is added but not handled above.
			const exhaustiveCheck: never = format;
			wrtieConsleError(`Unsupported export format: ${exhaustiveCheck}`);
			process.exit(1);
		}
	}
}

/**
 * Resolves the directory reports are written to.
 * - Explicit `customPath` always wins.
 * - Otherwise, uses a "fetch-client-exports" folder alongside the DB storage directory.
 *
 * resolveDbPath() always returns a directory (custom path, workspace path, or the
 * default VS Code global-storage path are all directories) - never a file path.
 */
export async function resolveExportDirectory(customPath?: string): Promise<string> {
	if (customPath) {
		return path.resolve(customPath);
	}

	return path.join(cliConfig.dbPath, EXPORT_DIR_NAME);
}

export async function writeExportReport(
	results: RunResult[],
	format: ExportFormat,
	context: ExportContext,
	customExportPath?: string,
): Promise<string> {
	const report = buildExportReport(results, context);
	const content = renderReport(report, format);

	const directory = await resolveExportDirectory(customExportPath);
	await fs.mkdir(directory, { recursive: true });

	const fileName = `${context.scope}-${slugify(context.name)}-${format}-${timestampForFilename()}.${EXTENSION_BY_FORMAT[format]}`;
	const filePath = path.join(directory, fileName);

	await fs.writeFile(filePath, content, "utf-8");

	return filePath;
}

export async function writeReportFile(
	content: string,
	extension: string,
	fileNameParts: { scope: string; name: string; format: string },
	customExportPath?: string,
): Promise<string> {
	const directory = await resolveExportDirectory(customExportPath);
	await fs.mkdir(directory, { recursive: true });

	const fileName =
		`${fileNameParts.scope}-${slugify(fileNameParts.name)}-${fileNameParts.format}-${timestampForFilename()}.${extension}`;
	const filePath = path.join(directory, fileName);

	await fs.writeFile(filePath, content, "utf-8");
	return filePath;
}
