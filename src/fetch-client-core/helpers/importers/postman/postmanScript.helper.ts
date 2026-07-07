import { v4 as uuidv4 } from "uuid";
import { Event, Items } from "../../../types/postman_2_1.types";
import { IRunRequest, ITest, ISetVar } from "../../../types/prefetch.types";

const EMPTY_TEST: ITest = { parameter: "", action: "", expectedValue: "" };
const EMPTY_SET_VAR: ISetVar = { parameter: "", key: "", variableName: "" };

export interface IdEntry {
  id: string;
  parentId: string;
  colId: string;
}

export interface UrlIndexEntry extends IdEntry {
  rawUrl: string;
  method: string;
  exactKey: string;
  looseKey: string;
}

export interface PreRequestParseResult {
  runRequests: IRunRequest[];
  leftover: string[];
}

/**
 * Handles everything Postman-script related: id pre-assignment (so pm.sendRequest()
 * can resolve forward/backward references), test script -> ITest[] parsing,
 * set-variable parsing, and pre-request script -> chained-request parsing.
 */
export class PostmanScriptParser {
  private idMap = new Map<Items, IdEntry>();
  private urlIndex: UrlIndexEntry[] = [];
  private exactIndex = new Map<string, UrlIndexEntry[]>();
  private looseIndex = new Map<string, UrlIndexEntry[]>();

  // ---------- id pre-pass ----------

  precomputeIds(
    items: Items[],
    parentId: string,
    colId: string,
    resolveUrl: (item: Items) => string,
    resolveMethod: (item: Items) => string,
  ): void {
    for (const item of items) {
      const id = uuidv4();
      this.idMap.set(item, { id, parentId, colId });

      if (item.request) {
        const rawUrl = resolveUrl(item);
        const method = (resolveMethod(item) || "get").toLowerCase();
        const { exactKey, looseKey } = this.buildUrlKeys(rawUrl, method);

        const entry: UrlIndexEntry = { id, parentId, colId, rawUrl, method, exactKey, looseKey };
        this.urlIndex.push(entry);
        this.pushToIndex(this.exactIndex, exactKey, entry);
        this.pushToIndex(this.looseIndex, looseKey, entry);
      }

      if (item.item?.length) {
        this.precomputeIds(item.item, id, colId, resolveUrl, resolveMethod);
      }
    }
  }

  private pushToIndex(map: Map<string, UrlIndexEntry[]>, key: string, entry: UrlIndexEntry): void {
    const list = map.get(key);
    if (list) {
      list.push(entry);
    } else {
      map.set(key, [entry]);
    }
  }

  getId(item: Items): IdEntry {
    const entry = this.idMap.get(item);
    if (!entry) {
      throw new Error("PostmanScriptParser: id requested for an item not seen during precomputeIds()");
    }
    return entry;
  }

  // ---------- URL normalization (fixes #2, #4, #5, #6, #32, #33) ----------

  private buildUrlKeys(rawUrl: string, method: string): { exactKey: string; looseKey: string } {
    const normalized = this.normalizeUrl(rawUrl);
    return {
      exactKey: `${method} ${normalized.full}`,
      looseKey: `${method} ${normalized.pathAndQuery}`,
    };
  }

  /** Strips protocol differences, default ports, fragments, trailing slashes; decodes percent-escapes; sorts query params so ordering doesn't matter. */
  private normalizeUrl(rawUrl: string): { full: string; pathAndQuery: string } {
    let url = (rawUrl ?? "").trim();
    if (!url) {
      return { full: "", pathAndQuery: "" };
    }

    url = url.split("#")[0]; // drop fragment

    let protocol = "";
    let rest = url;
    const protoMatch = url.match(/^(https?):\/\//i);
    if (protoMatch) {
      protocol = "http"; // http/https treated as equivalent for matching
      rest = url.slice(protoMatch[0].length);
    }

    rest = rest.replace(/:(80|443)(?=[/?]|$)/, "");
    const [hostAndPath, queryString] = rest.split("?");
    const host = (hostAndPath.split("/")[0] ?? "").toLowerCase();
    let path = "/" + hostAndPath.split("/").slice(1).join("/");
    path = path.replace(/\/+$/, "") || "/";

    let decodedPath = path;
    try {
      decodedPath = decodeURIComponent(path);
    } catch {
      // not validly percent-encoded - keep as-is
    }

    const sortedQuery = (queryString ?? "")
      .split("&")
      .filter(Boolean)
      .sort()
      .join("&");

    const pathAndQuery = decodedPath.toLowerCase() + (sortedQuery ? `?${sortedQuery.toLowerCase()}` : "");
    const full = `${protocol}://${host}${pathAndQuery}`;

    return { full, pathAndQuery };
  }

  /**
   * Resolves a pm.sendRequest() target against the precomputed index.
   * Tries method-aware strict match, then method-aware loose match (path+query only -
   * handles {{host}} variables since the host segment is dropped), then falls back to
   * method-agnostic matches as a last resort so a mismatched method string doesn't
   * cause an otherwise-clear match to be missed.
   */
  private resolveUrlEntry(targetUrl: string, targetMethod: string | null): UrlIndexEntry | null {
    const method = (targetMethod ?? "").toLowerCase();
    const { full, pathAndQuery } = this.normalizeUrl(targetUrl);

    if (method) {
      const exact = this.exactIndex.get(`${method} ${full}`);
      if (exact?.length) { return exact[0]; }
      const loose = this.looseIndex.get(`${method} ${pathAndQuery}`);
      if (loose?.length) { return loose[0]; }
    }

    const methods = ["get", "post", "put", "patch", "delete", "options", "head"];
    for (const m of methods) {
      const exact = this.exactIndex.get(`${m} ${full}`);
      if (exact?.length) { return exact[0]; }
    }
    for (const m of methods) {
      const loose = this.looseIndex.get(`${m} ${pathAndQuery}`);
      if (loose?.length) { return loose[0]; }
    }

    return null;
  }

  // ---------- event script extraction (fixes #27, #28) ----------

  /** Concatenates ALL non-disabled scripts of a given type - Postman allows multiple test/prerequest events per request. */
  getEventScript(events: Event[] | undefined, listen: "test" | "prerequest"): string {
    if (!events?.length) {
      return "";
    }
    const scripts = events
      .filter(e => e.listen === listen && !e.disabled)
      .map(e => {
        const exec = e.script?.exec;
        if (!exec) { return ""; }
        return Array.isArray(exec) ? exec.join("\n") : exec;
      })
      .filter(Boolean);

    return scripts.join("\n// --- next event ---\n");
  }

  /** Best-effort comment removal so status-check regexes inside comments don't get picked up (#30). Does not handle comment-like text embedded inside string literals - that needs a real JS parser, not regex. */
  private stripComments(script: string): string {
    return script.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  }

  // ---------- JSON path tokenizer (fixes #7, #11, #12, #13, #14, #15) ----------

  /** Detects variable name(s) assigned from pm.response.json(), e.g. `const data = pm.response.json();` -> "data". Always includes the "jsonData" convention and direct pm.response.json() calls too. */
  private detectJsonVarNames(script: string): string[] {
    const names = new Set<string>(["jsonData"]);
    const declRegex = /(?:const|let|var)\s+(\w+)\s*=\s*pm\.response\.json\(\)/g;
    let match: RegExpExecArray | null;
    while ((match = declRegex.exec(script)) !== null) {
      names.add(match[1]);
    }
    return Array.from(names);
  }

  /** Converts `jsonData.users[0]["user-id"]` into a normalized path string: "users.[0].user-id". Handles numeric indexes and quoted keys with hyphens/spaces. Does not handle optional chaining (?.). */
  private tokenizeJsonPath(expr: string): string {
    const path = expr.trim().replace(/^(?:pm\.response\.json\(\)|\w+)/, "");

    const parts: string[] = [];
    const tokenRegex = /\.(\w+)|\[(\d+)\]|\[["'`]([^"'`]+)["'`]\]/g;

    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(path)) !== null) {
      if (match[2] !== undefined) {
        // array index
        parts.push(`[${match[2]}]`);
      } else {
        parts.push(match[1] ?? match[3]);
      }
    }

    let result = "";

    for (const p of parts) {
      if (p.startsWith("[")) {
        result += p;
      } else {
        result += result ? "." + p : p;
      }
    }

    return result;
  }

  private buildJsonAssertionRules(varNames: string[]): Array<{ regex: RegExp; build: (m: RegExpMatchArray) => ITest | null }> {
    const varPattern = varNames.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const pathExpr = `(?:${varPattern}|pm\\.response\\.json\\(\\))((?:\\.[\\w]+|\\[\\d+\\]|\\[["'\`][^"'\`]+["'\`]\\])*)`;

    return [
      {
        regex: new RegExp(`pm\\.expect\\(\\s*${pathExpr}\\s*\\)\\.to\\.(eql|equal|include|contain)\\(\\s*(.+?)\\s*\\)\\s*;?`, "g"),
        build: m => ({
          parameter: "JSON",
          action: m[2] === "eql" || m[2] === "equal" ? "equal" : "contains",
          expectedValue: this.stripQuotes(m[3]),
          customParameter: this.tokenizeJsonPath(m[1]),
        }),
      },
      {
        regex: new RegExp(`pm\\.expect\\(\\s*${pathExpr}\\s*\\)\\.to\\.be\\.(true|false)\\b`, "g"),
        build: m => ({ parameter: "JSON", action: "equal", expectedValue: m[2], customParameter: this.tokenizeJsonPath(m[1]) }),
      },
      {
        regex: new RegExp(`pm\\.expect\\(\\s*${pathExpr}\\s*\\)\\.to\\.be\\.null\\b`, "g"),
        build: m => ({ parameter: "JSON", action: "equal", expectedValue: "null", customParameter: this.tokenizeJsonPath(m[1]) }),
      },
      {
        regex: new RegExp(`pm\\.expect\\(\\s*${pathExpr}\\s*\\)\\.to\\.exist\\b`, "g"),
        build: m => ({ parameter: "JSON", action: "type", expectedValue: "", customParameter: this.tokenizeJsonPath(m[1]) }),
      },
      {
        regex: new RegExp(`pm\\.expect\\(\\s*${pathExpr}\\.length\\s*\\)\\.to\\.(eql|equal)\\(\\s*(\\d+)\\s*\\)`, "g"),
        build: m => ({ parameter: "JSON", action: "length", expectedValue: m[2], customParameter: this.tokenizeJsonPath(m[1]) }),
      },
      {
        regex: new RegExp(`pm\\.expect\\(\\s*${pathExpr}\\s*\\)\\.to\\.be\\.at\\.(least|most)\\(\\s*(.+?)\\s*\\)`, "g"),
        build: m => ({ parameter: "JSON", action: m[2] === "least" ? ">=" : "<=", expectedValue: this.stripQuotes(m[3]), customParameter: this.tokenizeJsonPath(m[1]), }),
      },
      {
        regex: /pm\.expect\(\s*function\s*\(\)\s*\{\s*pm\.response\.json\(\);\s*\}\s*\)\.to\.not\.throw\(\s*\)/g,
        build: () => ({ parameter: "Response Body", action: "isJSON", expectedValue: "true", }),
      },
    ];
  }

  // ---------- other test rules (fixes #8, #9, #10, #16-#20) ----------

  private readonly TEST_RULES: Array<{ regex: RegExp; build: (m: RegExpMatchArray) => ITest | null }> = [
    {
      regex: /pm\.response\.to\.have\.status\(\s*(\d+)\s*\)/g,
      build: m => ({ parameter: "Response Code", action: "equal", expectedValue: m[1] }),
    },
    {
      regex: /pm\.expect\(\s*pm\.response\.code\s*\)\.to\.(eql|equal|not\.eql)\(\s*(\d+)\s*\)/g,
      build: m => ({ parameter: "Response Code", action: m[1] === "not.eql" ? "notEqual" : "equal", expectedValue: m[2] }),
    },
    {
      regex: /pm\.expect\(\s*pm\.response\.code\s*\)\.to\.be\.at\.(most|least)\(\s*(\d+)\s*\)/g,
      build: m => ({ parameter: "Response Code", action: m[1] === "most" ? "<=" : ">=", expectedValue: m[2], }),
    },
    {
      regex: /pm\.expect\(\s*pm\.response\.responseTime\s*\)\.to\.be\.(below|above)\(\s*(\d+)\s*\)/g,
      build: m => ({ parameter: "Response Time", action: m[1] === "below" ? "<" : ">", expectedValue: m[2] }),
    },
    {
      regex: /pm\.response\.responseTime\s*(<=|>=|<|>)\s*(\d+)/g,
      build: m => ({ parameter: "Response Time", action: m[1], expectedValue: m[2] }),
    },
    {
      regex: /pm\.response\.to\.be\.json\b/g,
      build: () => ({ parameter: "Response Body", action: "isJSON", expectedValue: "" }),
    },
    {
      regex: /pm\.response\.to\.have\.header\(\s*["'`]([^"'`]+)["'`]\s*(?:,\s*["'`]([^"'`]+)["'`])?\s*\)/g,
      build: m => {
        const [, headerName, headerValue] = m;
        if (headerName.toLowerCase() === "content-type" && headerValue) {
          return { parameter: "Content-Type", action: "equal", expectedValue: headerValue };
        }
        return { parameter: "Header", action: headerValue ? "equal" : "contains", expectedValue: headerValue ?? "", customParameter: headerName };
      },
    },
    {
      // #10: header equality via expect(...headers.get(...)).to.eql(...) - not just have.header()
      regex: /pm\.expect\(\s*pm\.response\.headers\.get\(\s*["'`]([^"'`]+)["'`]\s*\)\s*\)\.to\.(eql|equal|include)\(\s*["'`]([^"'`]*)["'`]\s*\)/g,
      build: m => ({ parameter: "Header", action: m[2] === "include" ? "contains" : "equal", expectedValue: m[3], customParameter: m[1] }),
    },
    {
      regex: /pm\.expect\(\s*pm\.response\.headers\.get\(\s*["'`]([^"'`]+)["'`]\s*\)\s*\)\.to\.not\.eql\(\s*["'`]([^"'`]*)["'`]\s*\)/g,
      build: m => ({ parameter: "Header", action: "notEqual", expectedValue: m[2], customParameter: m[1], }),
    },
    {
      // #8: response body contains
      regex: /pm\.expect\(\s*pm\.response\.text\(\)\s*\)\.to\.include\(\s*["'`]([^"'`]*)["'`]\s*\)/g,
      build: m => ({ parameter: "Response Body", action: "contains", expectedValue: m[1] }),
    },
    {
      // #9: response body equality
      regex: /pm\.expect\(\s*pm\.response\.text\(\)\s*\)\.to\.(eql|equal)\(\s*["'`]([^"'`]*)["'`]\s*\)/g,
      build: m => ({ parameter: "Response Body", action: "equal", expectedValue: m[2] }),
    },
  ];

  private readonly STATUS_ALIAS_RANGES: Record<string, [number, number]> = {
    info: [100, 199],
    success: [200, 299],
    redirection: [300, 399],
    clientError: [400, 499],
    serverError: [500, 599],
  };

  /** #20: pm.response.to.be.success / clientError / etc. Emits two Response Code tests (>= and <=) since the model has no native range operator. */
  private buildStatusAliasTests(script: string): ITest[] {
    const tests: ITest[] = [];
    const regex = /pm\.response\.to\.be\.(success|error|clientError|serverError|info|redirection)\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(script)) !== null) {
      const alias = match[1];
      if (alias === "error") {
        tests.push({ parameter: "Response Code", action: ">=", expectedValue: "400" });
        continue;
      }
      const range = this.STATUS_ALIAS_RANGES[alias];
      if (range) {
        tests.push({ parameter: "Response Code", action: ">=", expectedValue: String(range[0]) });
        tests.push({ parameter: "Response Code", action: "<=", expectedValue: String(range[1]) });
      }
    }
    return tests;
  }

  /** #31: proper unescaping instead of just trimming surrounding quotes. */
  private stripQuotes(value: string): string {
    const trimmed = value.trim();
    const m = trimmed.match(/^["'`](.*)["'`]$/s);
    if (!m) {
      return trimmed;
    }
    return m[1].replace(/\\(["'`\\])/g, "$1");
  }

  /** #29: same logical test imported twice via different Postman syntaxes now collapses to one entry. */
  private dedupeTests(tests: ITest[]): ITest[] {
    const seen = new Set<string>();
    const result: ITest[] = [];
    for (const t of tests) {
      const key = `${t.parameter}|${t.action}|${t.expectedValue}|${t.customParameter ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(t);
      }
    }
    return result;
  }

  /** Only recognizable assertion patterns are kept; anything else is dropped (per your call). */
  parsePostmanTests(rawScript: string): ITest[] {
    if (!rawScript) {
      return [{ ...EMPTY_TEST }];
    }
    const script = this.stripComments(rawScript);
    const varNames = this.detectJsonVarNames(script);
    const rules = [...this.TEST_RULES, ...this.buildJsonAssertionRules(varNames)];

    const tests: ITest[] = [];
    for (const rule of rules) {
      const regex = new RegExp(rule.regex.source, rule.regex.flags.includes("g") ? rule.regex.flags : rule.regex.flags + "g");
      let match: RegExpExecArray | null;
      while ((match = regex.exec(script)) !== null) {
        const built = rule.build(match);
        if (built) {
          tests.push(built);
        }
      }
    }

    tests.push(...this.buildStatusAliasTests(script));

    return [...this.dedupeTests(tests), { ...EMPTY_TEST }];
  }

  // ---------- set variables (fixes #22, #23, #24, #25; #21 intentionally still excluded - see table) ----------

  private detectLiteral(valueExpr: string): { isLiteral: boolean; value: string } {
    const trimmed = valueExpr.trim();
    if (/^["'`].*["'`]$/s.test(trimmed) && !/\$\{/.test(trimmed)) {
      return { isLiteral: true, value: this.stripQuotes(trimmed) };
    }
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return { isLiteral: true, value: trimmed };
    }
    if (/^(true|false)$/.test(trimmed)) {
      return { isLiteral: true, value: trimmed };
    }
    return { isLiteral: false, value: trimmed };
  }

  private resolveSetVarSource(valueExpr: string): { parameter: string; key: string } {
    const trimmed = valueExpr.trim();

    let m = trimmed.match(/^(?:pm\.response\.json\(\)|\w+)((?:\.[\w]+|\[\d+\]|\[["'`][^"'`]+["'`]\])+)$/);
    if (m) {
      return { parameter: "JSON", key: this.tokenizeJsonPath(trimmed) };
    }

    m = trimmed.match(/^pm\.response\.text\(\)$/);
    if (m) {
      return { parameter: "Response Body", key: "" };
    }

    m = trimmed.match(/^pm\.response\.headers\.get\(\s*["'`]([^"'`]+)["'`]\s*\)$/);
    if (m) {
      return { parameter: "Header", key: m[1] };
    }

    m = trimmed.match(/^pm\.response\.code$/);
    if (m) {
      return { parameter: "Response Code", key: "" };
    }

    const literal = this.detectLiteral(trimmed);
    if (literal.isLiteral) {
      // No dedicated "static value" parameter exists in ParametersModelMapping yet.
      // "Variable" is the closest available bucket - flag this to the user, see table.
      return { parameter: "Variable", key: literal.value };
    }

    if (/\$\{.+\}/.test(trimmed)) {
      // template literal e.g. `${host}/api` - can't be evaluated at import time, stored raw
      return { parameter: "Variable", key: trimmed };
    }

    return { parameter: "Response Body", key: trimmed };
  }

  /** Only pm.collectionVariables.set / pm.globals.set are handled - no pm.environment scope in this extension. */
  parsePostmanSetVars(rawScript: string): ISetVar[] {
    if (!rawScript) {
      return [{ ...EMPTY_SET_VAR }];
    }
    const script = this.stripComments(rawScript);
    const setVars: ISetVar[] = [];
    const rules = [/pm\.collectionVariables\.set\(\s*["'`]([^"'`]+)["'`]\s*,\s*(.+?)\)\s*;?$/gm, /pm\.globals\.set\(\s*["'`]([^"'`]+)["'`]\s*,\s*(.+?)\)\s*;?$/gm];

    for (const regex of rules) {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(script)) !== null) {
        const [, variableName, valueExpr] = match;
        const { parameter, key } = this.resolveSetVarSource(valueExpr);
        setVars.push({ parameter, key, variableName });
      }
    }

    return [...setVars, { ...EMPTY_SET_VAR }];
  }

  // ---------- pre-request script -> chained requests + leftover notes (fixes #1, #26) ----------

  /** Finds the index just past the matching closing paren for a `(` opened at (openParenIndex), respecting nested parens/braces and string literals - needed so callback functions inside pm.sendRequest(...) don't get truncated mid-call. */
  private findMatchingParenEnd(script: string, openParenIndex: number): number {
    let depth = 0;
    let inString: string | null = null;
    for (let i = openParenIndex; i < script.length; i++) {
      const ch = script[i];
      if (inString) {
        if (ch === "\\") {
          i++;
          continue;
        }
        if (ch === inString) {
          inString = null;
        }
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inString = ch;
        continue;
      }
      if (ch === "(") {
        depth++;
      }
      if (ch === ")") {
        depth--;
        if (depth === 0) {
          return i + 1;
        }
      }
    }
    return script.length;
  }

  parsePreRequestScript(rawScript: string): PreRequestParseResult {
    const runRequests: IRunRequest[] = [];
    const leftover: string[] = [];

    if (!rawScript) {
      return { runRequests, leftover };
    }
    const script = this.stripComments(rawScript);

    const callStartRegex = /pm\.sendRequest\(/g;
    const matchedRanges: Array<[number, number]> = [];
    let order = 0;
    let match: RegExpExecArray | null;

    while ((match = callStartRegex.exec(script)) !== null) {
      const callStart = match.index;
      const argStart = callStart + match[0].length;
      const callEnd = this.findMatchingParenEnd(script, argStart - 1);
      const argsText = script.slice(argStart, callEnd - 1);

      let targetUrl: string | null = null;
      let targetMethod: string | null = null;

      // #1: object syntax pm.sendRequest({ url: "...", method: "..." }, cb)
      const stringUrlMatch = argsText.match(/^\s*["'`]([^"'`]+)["'`]/);
      if (stringUrlMatch) {
        targetUrl = stringUrlMatch[1];
      } else {
        const objUrlMatch = argsText.match(/url\s*:\s*["'`]([^"'`]+)["'`]/);
        const objMethodMatch = argsText.match(/method\s*:\s*["'`]([^"'`]+)["'`]/);
        if (objUrlMatch) {
          targetUrl = objUrlMatch[1];
          targetMethod = objMethodMatch?.[1] ?? null;
        }
      }

      if (targetUrl) {
        const candidate = this.resolveUrlEntry(targetUrl, targetMethod);
        if (candidate) {
          runRequests.push({
            reqId: candidate.id,
            parentId: candidate.parentId,
            colId: candidate.colId,
            order: order++,
            condition: [{ parameter: "noCondition", action: "", expectedValue: "" }],
          });
          // #26: full call (including callback) is now excluded from leftover, not just the signature
          matchedRanges.push([callStart, callEnd]);
        }
      }
    }

    if (matchedRanges.length === 0) {
      if (script.trim()) {
        leftover.push(script.trim());
      }
    } else {
      let cursor = 0;
      for (const [start, end] of matchedRanges) {
        const chunk = script.slice(cursor, start).trim();
        if (chunk) {
          leftover.push(chunk);
        }
        cursor = end;
      }
      const tail = script.slice(cursor).trim();
      if (tail) {
        leftover.push(tail);
      }
    }

    return { runRequests, leftover };
  }
}
