import { ICollections, IFolder, IHistory } from "../../fetch-client-core/types/sidebar.types";
import { ITestResult } from "../../fetch-client-core/types/response.types";
import { ITableData } from "../../fetch-client-core/types/common.types";
import { writeConsoleLog } from "./logger";

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
  writeConsoleLog(`\n${C.bold}${C.cyan}${title}${C.reset}`);
  writeConsoleLog(cyan('-'.repeat(title.length)));
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

    writeConsoleLog('  ' + line);
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
    writeConsoleLog(dim(' No collections found.'));
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
    writeConsoleLog(dim(' No folders found.'));
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
    writeConsoleLog(dim(' No variable sets found.'));
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

export function printVariableItems(varName: string, items: ITableData[]): void {
  if (!items || items.length === 0) {
    writeConsoleLog(dim(`   ${varName}: (no items)`));
    return;
  }
  writeConsoleLog(`\n   ${bold(cyan(varName))}`);
  const header = [bold('Key'), bold('Value'), bold('Active')];
  const rows = [
    header,
    ...items.map(d => [
      cyan(d.key),
      yellow(d.value ?? ""),
      d.isChecked === false ? red('no') : green('yes'),
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
    writeConsoleLog(`${prefix} ${yellow("▶")} ${bold(item.name)} ${dim("[folder]")} ${dim(item.id)}`);

    if (item.data && item.data.length > 0) {
      for (const child of item.data) {
        printTreeNode(child, indent + 1);
      }
    }
  } else {
    const req = item as IHistory;
    const truncatedUrl = req.url.length > 50 ? req.url.slice(0, 47) + '...' : req.url;
    writeConsoleLog(
      `${prefix} ${methodBadge(req.method)}${dim(yellow(req.name))} ${cyan(truncatedUrl)} ${dim(req.id)}`
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
    `\n ${bold(cyan(folder.name))} ${dim("[folder in: " + collectionName + "]")} ${dim(folder.id)}`
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
  name: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  duration: number;
  size: number;
  responseData: string;
  responseType: { isBinaryFile: boolean; format: string };
  isError: boolean;
  testResults: ITestResult[];
}

export function printRunResult(result: RunResult): void {
  const statusStr = statusBadge(result.status);
  const durationStr = dim(`${result.duration}ms`);
  const sizeStr = dim(formatBytes(result.size));

  writeConsoleLog(
    `${methodBadge(result.method)} ${bold(result.name)}   ${cyan(result.url)}`
  );

  writeConsoleLog(
    `\n${yellow('Status')}: ${statusStr} ${dim(result.statusText)} | ${durationStr} | ${sizeStr}`
  );

  if (result.responseType?.isBinaryFile) {
    writeConsoleLog(` ${dim('[Binary file - not displayed')}`);
  } else if (result.isError && result.responseData) {
    writeConsoleLog(`${red('Error:')} ${result.responseData}`);
  } else if (result.responseData) {
    printResponseBody(result.responseData, result.responseType?.format);
  }

  if (result.testResults && result.testResults.length > 0) {
    writeConsoleLog(`\n${bold(yellow('Tests:'))}`);
    for (const t of result.testResults) {
      const icon = t.result ? green('✓') : red('✗');
      writeConsoleLog(
        ` ${icon} ${t.test}${t.actualValue ? dim(` (got: ${t.actualValue})`) : ''}`
      );
    }
  }

  writeConsoleLog('');
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

  writeConsoleLog(
    ` Requests : ${green(String(passed))} passed, ${failed > 0 ? red(String(failed)) : dim('0')} failed, ${dim(String(total))} total`
  );

  if (totalTests > 0) {
    writeConsoleLog(
      ` Tests    : ${green(String(passedTests))} passed, ${failedTests > 0 ? red(String(failedTests)) : dim('0')} failed, ${dim(String(totalTests))} total`
    );
  }

  writeConsoleLog('');
}

function printResponseBody(data: string, format?: string): void {
  writeConsoleLog(`${bold(yellow('Response:'))}`);
  const fmt = (format ?? '').toLocaleLowerCase();

  if (fmt === 'json') {
    try {
      const parsed = JSON.parse(data);
      const pretty = JSON.stringify(parsed, null, 2);
      writeConsoleLog(colorJson(pretty).split('\n').map(l => `   ${l}`).join('\n'));
    } catch {
      writeConsoleLog(`   ${data}`);
    }
  } else if (fmt === 'xml' || fmt === 'xhtml' || fmt === 'html') {
    writeConsoleLog(colorXml(data).split('\n').map(l => `   ${l}`).join('\n'));
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
      if (match === "true" || match === "false") { return `${C.yellow}${match}${C.reset}`; }
      if (match === "null") { return `${C.dim}${match}${C.reset}`; }
      return `${C.red}${match}${C.reset}`;
    }
  );
}

function colorXml(xml: string): string {
  return xml.replace(
    /(<\/?)([\w:-]+)([^>]*?)(\/?>)|(".*?")/g,
    (_, open, tag, attrs, close, quoted) => {
      if (quoted) {
        return `${C.green}${quoted}${C.reset}`;
      }
      const coloredAttrs = attrs.replace(/([\w:-]+)=(".*?")/g, (_, key, value) => `${C.yellow}${key}${C.reset}=${C.green}${value}${C.reset}`);
      return `${C.cyan}${open}${tag}${C.reset}${coloredAttrs}${C.cyan}${close}${C.reset}`;
    }
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) { return `${bytes} B`; }
  if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB`; }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
