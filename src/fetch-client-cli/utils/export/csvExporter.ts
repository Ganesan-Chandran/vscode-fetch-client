import { ExportReport } from '../../types/export.types';
import { summarizePreFetch } from './preFetchSummary';

const HEADERS = [
  'Name', 'Method', 'URL', 'Status', 'StatusText', 'DurationMs', 'SizeBytes',
  'Outcome', 'Details', 'TestsTotal', 'TestsPassed', 'TestsFailed',
  'TestName', 'TestResult', 'TestActualValue', 'PreFetch',
];

function escapeCsv(value: string | number | boolean | undefined | null): string {
  const str = value === undefined || value === null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toRow(values: Array<string | number | boolean | undefined | null>): string {
  return values.map(escapeCsv).join(',');
}

/**
 * Flattened CSV: one row per test, request-level columns repeated. Requests with
 * no tests still get a single row. Pre-fetch chain is summarized into one column
 * (full tree detail is available in the JSON/XML exports).
 */
export function toCsv(report: ExportReport): string {
  const rows: string[] = [toRow(HEADERS)];

  for (const r of report.results) {
    const testsPassed = r.tests.filter(t => t.passed).length;
    const preFetchSummary = summarizePreFetch(r.preFetch);

    const baseRow: Array<string | number | boolean | undefined | null> = [
      r.name, r.method, r.url, r.status, r.statusText, r.durationMs, r.sizeBytes,
      r.outcome, r.details ?? '', r.tests.length, testsPassed, r.tests.length - testsPassed,
    ];

    if (r.tests.length === 0) {
      rows.push(toRow([...baseRow, '', '', '', preFetchSummary]));
      continue;
    }

    for (const t of r.tests) {
      rows.push(toRow([...baseRow, t.name, t.passed ? 'Pass' : 'Fail', t.actualValue ?? '', preFetchSummary]));
    }
  }

  return rows.join('\n') + '\n';
}
