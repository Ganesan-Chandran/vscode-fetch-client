import { ExportFormat } from "../../../consts/export.consts";
import { ExportSummary, ExportContext, ExportReport } from "../../../types/export.types";
import { RunResult } from "../../../types/cli.types";
import { toCsv } from "./csvExporter";
import { toExportRequestResults } from "./transform";
import { toHtml } from "./htmlExporter";
import { toJson } from "./jsonExporter";
import { toNUnit } from "./nunitExporter";
import { toXml } from "./xmlExporter";

export function buildSummary(results: RunResult[]): ExportSummary {
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

export function renderReport(report: ExportReport, format: ExportFormat): string {
  switch (format) {
    case "csv":
      return toCsv([report]);
    case "html":
      return toHtml([report]);
    case "json":
      return toJson([report]);
    case "xml":
      return toXml([report]);
    case "nunit":
      return toNUnit([report]);
    default: {
      // Exhaustiveness check - compiler error if a new ExportFormat is added but not handled above.
      const exhaustiveCheck: never = format;
      throw new Error(`Unsupported export format: ${exhaustiveCheck}`);
    }
  }
}
