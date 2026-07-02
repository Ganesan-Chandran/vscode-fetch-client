import { ExportOutcome, ExportTestResult, ExportPreFetchStep, ExportRequestResult } from '../../types/export.types';
import { IPreFetchResponse, ITestResult } from '../../../fetch-client-core/types/response.types';
import { RunResult } from '../display';

function computeOutcome(r: RunResult): ExportOutcome {
  if (r.isError) { return 'Error'; }
  return r.status >= 200 && r.status < 400 ? 'Passed' : 'Failed';
}

function toExportTest(t: ITestResult): ExportTestResult {
  return {
    name: t.test,
    passed: t.result,
    actualValue: t.actualValue !== undefined && t.actualValue !== null ? String(t.actualValue) : undefined,
  };
}

function toExportPreFetchStep(p: IPreFetchResponse): ExportPreFetchStep {
  return {
    name: p.name,
    status: p.resStatus,
    passed: p.resStatus >= 200 && p.resStatus < 400,
    tests: (p.testResults ?? []).map(toExportTest),
    children: (p.childrenResponse ?? []).map(toExportPreFetchStep),
  };
}

/**
 * Converts a raw RunResult (internal execution shape, includes responseType/isError)
 * into the normalized ExportRequestResult every report format renders from.
 */
export function toExportRequestResult(r: RunResult): ExportRequestResult {
  const outcome = computeOutcome(r);

  return {
    name: r.name,
    method: r.method,
    url: r.url,
    status: r.status,
    statusText: r.statusText,
    durationMs: r.duration,
    sizeBytes: r.size,
    outcome,
    details: outcome !== 'Passed' ? r.responseData : undefined,
    tests: (r.testResults ?? []).map(toExportTest),
    preFetch: (r.preFetchResponses ?? []).map(toExportPreFetchStep),
  };
}

export function toExportRequestResults(results: RunResult[]): ExportRequestResult[] {
  return results.map(toExportRequestResult);
}
