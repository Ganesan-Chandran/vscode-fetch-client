
import { ITestResult } from "../../fetch-client-core/types/response.types";

// === ANSI colour helpers ====================================================

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  blueBg: '\x1b[44m',
};

function bold(s: string) { return `${C.bold}${s}${C.reset}`; }
function dim(s: string) { return `${C.dim}${s}${C.reset}`; }
function green(s: string) { return `${C.green}${s}${C.reset}`; }
function red(s: string) { return `${C.red}${s}${C.reset}`; }
function yellow(s: string) { return `${C.yellow}${s}${C.reset}`; }
function cyan(s: string) { return `${C.cyan}${s}${C.reset}`; }

export function methodBadge(method: string): string {
  const m = method.toUpperCase();
  const colours: Record<string, string> = {
    GET: '\x1b[32m',
    POST: '\x1b[34m',
    PUT: '\x1b[33m',
    PATCH: '\x1b[35m',
    DELETE: '\x1b[31m',
    HEAD: '\x1b[36m',
    OPTIONS: '\x1b[37m',
  };

  const colour = colours[m] ?? '\x1b[37m';
  return `${colour}${C.bold}${m.padEnd(7)}${C.reset}`;
}

export function statusBadge(status: number): string {
  if (status >= 200 && status < 300) { return green(`${status}`); }
  if (status >= 300 && status < 400) { return yellow(`${status}`); }
  return red(`${status}`);
}

// === Section / table helpers ================================================

export function printSection(title: string): void {
  console.log(`\n${C.bold}${C.cyan}${title}${C.reset}`);
  console.log(cyan('-'.repeat(title.length)));
}

export function printTable(rows: string[][]): void {
  if (rows.length === 0) { return; }

  // Calculate column widths
  const widths = rows[0].map((_, ci) =>
    Math.max(...rows.map(r => stripAnsi(r[ci] ?? '').length))
  );

  for (const row of rows) {
    const line = row.map((cell, ci) => {
      const pad = widths[ci] - stripAnsi(cell).length;
      return cell + ' '.repeat(Math.max(0, pad));
    }).join('  ');

    console.log('  ' + line);
  }
}

function stripAnsi(s: string): string {
  // Remove ANSI escape sequences for width calculation
  return s.replace(/\x1b\[[0-9;]*m/g, '');
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
    console.log(dim(' No collections found.'));
    return;
  }

  const header = [bold('ID'), bold('Name'), bold('Requests'), bold('Variable'), bold('Created')];
  const rows = [
    header,
    ...items.map(c => [
      dim(c.id),
      cyan(c.name),
      String(c.requestCount),
      c.variableId ? dim(c.variableId) : dim('-'),
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
    console.log(dim(' No folders found.'));
    return;
  }

  const header = [bold('ID'), bold('Name'), bold('Collection'), bold('Requests'), bold('Created')];
  const rows = [
    header,
    ...items.map(f => [
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
    console.log(dim(' No variable sets found.'));
    return;
  }

  const header = [bold('ID'), bold('Name'), bold('Active'), bold('Variables'), bold('Created')];
  const rows = [
    header,
    ...items.map(v => [
      dim(v.id),
      cyan(v.name),
      v.active ? green('yes') : red('no'),
      String(v.varCount),
      dim(v.createdTime),
    ]),
  ];
  printTable(rows);
}

// ── Request execution result ───────────────────────────────────────────

export interface RunResult {
  name: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  duration: number;
  size: number;
  responseData: string;
  isError: boolean;
  testResults: ITestResult[];
}

export function printRunResult(result: RunResult): void {
  const statusStr = statusBadge(result.status);
  const durationStr = dim(`${result.duration}ms`);
  const sizeStr = dim(formatBytes(result.size));

  console.log(
    ` ${methodBadge(result.method)} ${bold(result.name)}`
  );

  console.log(
    ` ${cyan(result.url)}`
  );

  console.log(
    ` Status: ${statusStr} ${dim(result.statusText)} | ${durationStr} | ${sizeStr}`
  );

  if (result.isError) {
    console.log(` ${red('Error:')} ${result.responseData}`);
  }

  if (result.testResults && result.testResults.length > 0) {
    console.log(` ${bold('Tests:')}`);
    for (const t of result.testResults) {
      const icon = t.result ? green('✓') : red('✗');
      console.log(
        ` ${icon} ${t.test}${t.actualValue ? dim(` (got: ${t.actualValue})`) : ''}`
      );
    }
  }

  console.log('');
}

export function printRunSummary(results: RunResult[]): void {
  const total = results.length;
  const passed = results.filter(r => !r.isError && r.status >= 200 && r.status < 400).length;
  const failed = total - passed;

  const totalTests = results.reduce((s, r) => s + (r.testResults?.length ?? 0), 0);
  const passedTests = results.reduce(
    (s, r) => s + (r.testResults?.filter(t => t.result).length ?? 0),
    0
  );
  const failedTests = totalTests - passedTests;

  printSection('Summary');

  console.log(
    ` Requests : ${green(String(passed))} passed, ${failed > 0 ? red(String(failed)) : dim('0')} failed, ${dim(String(total))} total`
  );

  if (totalTests > 0) {
    console.log(
      ` Tests    : ${green(String(passedTests))} passed, ${failedTests > 0 ? red(String(failedTests)) : dim('0')} failed, ${dim(String(totalTests))} total`
    );
  }

  console.log('');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) { return `${bytes} B`; }
  if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB`; }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
