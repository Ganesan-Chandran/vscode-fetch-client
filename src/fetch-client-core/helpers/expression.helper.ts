import jexl from "jexl";
import { ITableData } from "../types/common.types";

/**
 * Supported expressions
 *
 * Literals
 *   5
 *   10.5
 *   true
 *   false
 *   "Hello"
 *
 * Arithmetic
 *   10 + 7
 *   10 - 5
 *   10 * 2
 *   10 / 5
 *   (10 + 5) * 2
 *
 * Comparison
 *   10 > 5
 *   10 >= 5
 *   5 < 10
 *   5 <= 10
 *   10 == 10
 *   10 != 5
 *
 * Logical
 *   true && false
 *   true || false
 *   !(10 > 5)
 *
 * Variables
 *   age >= 18
 *   status == "ACTIVE"
 *   tokenExpiry > now()
 *
 * Date & Time
 *   now()
 *   date()
 *   date("2026-07-20")
 *   now() + days(1)
 *   now() - hours(2)
 *   parseDate("2026-07-20") < now()
 *   addDays(now(), 7)
 *   addHours(now(), 12)
 *   addMinutes(now(), 30)
 *   formatDate()
 *   formatDate(now())
 *   formatDate(now(), "dd/MM/yyyy")
 *   formatDate(now(), "yyyy-MM-dd")
 *   formatDate(addDays(now(), 1), "yyyy-MM-dd HH:mm:ss")
 *
 * String Functions
 *   contains(name, "John")
 *   matches(email, ".*@gmail\\.com$")
 *
 * Utility Functions
 *   exists(token)
 *   empty(token)
 *   between(age, 18, 60)
 *
 * Examples
 *   retryCount < 5
 *   empty(accessToken)
 *   exists(userId)
 *   responseTime < 1000
 *   tokenExpiry < now() + days(1)
 *   contains(environment, "prod")
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// -----------------------------------------------------------------------------
// Date / Time
// -----------------------------------------------------------------------------

jexl.addFunction("now", (): number => Date.now());

jexl.addFunction("seconds", (value: number): number => value * SECOND);

jexl.addFunction("minutes", (value: number): number => value * MINUTE);

jexl.addFunction("hours", (value: number): number => value * HOUR);

jexl.addFunction("days", (value: number): number => value * DAY);

jexl.addFunction("date", (value?: string): number => {
  return value ? new Date(value).getTime() : Date.now();
});

jexl.addFunction("nowString", () => new Date().toISOString());

jexl.addFunction("today", () => new Date().toLocaleString());

jexl.addFunction("parseDate", (value: string): number => {
  return new Date(value).getTime();
});

jexl.addFunction(
  "formatDate",
  (
    value?: number | string | Date,
    format = "dd-MM-yyyy HH:mm:ss",
  ) => {
    const d = value ? new Date(value) : new Date();

    const pad = (n: number) => String(n).padStart(2, "0");

    return format
      .replace("yyyy", String(d.getFullYear()))
      .replace("MM", pad(d.getMonth() + 1))
      .replace("dd", pad(d.getDate()))
      .replace("HH", pad(d.getHours()))
      .replace("mm", pad(d.getMinutes()))
      .replace("ss", pad(d.getSeconds()));
  },
);

jexl.addFunction(
  "addDays",
  (date: number | Date, days: number): number => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.getTime();
  },
);

jexl.addFunction(
  "addHours",
  (date: number | Date, hours: number): number => {
    const d = new Date(date);
    d.setHours(d.getHours() + hours);
    return d.getTime();
  },
);

jexl.addFunction(
  "addMinutes",
  (date: number | Date, minutes: number): number => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + minutes);
    return d.getTime();
  },
);

// -----------------------------------------------------------------------------
// Utility
// -----------------------------------------------------------------------------

jexl.addFunction("empty", (value: unknown): boolean => {
  return value === "" || value === null || value === undefined;
});

jexl.addFunction("exists", (value: unknown): boolean => {
  return value !== undefined && value !== null;
});

jexl.addFunction(
  "contains",
  (text: unknown, search: unknown): boolean => {
    return text?.toString().includes(search?.toString() ?? "") ?? false;
  },
);

jexl.addFunction(
  "matches",
  (text: unknown, regex: string): boolean => {
    try {
      return new RegExp(regex).test(text?.toString() ?? "");
    } catch {
      return false;
    }
  },
);

jexl.addFunction(
  "between",
  (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  },
);

// -----------------------------------------------------------------------------
// Evaluation
// -----------------------------------------------------------------------------

export function evaluateTableExpression(
  expression: string,
  variables: ITableData[],
): boolean {
  const context: Record<string, unknown> = {};

  variables.forEach((v) => {
    context[v.key] = v.value;
  });

  return Boolean(jexl.evalSync(expression, context));
}

export function evaluateExpression(expression: string): boolean {
  return Boolean(jexl.evalSync(expression));
}

export function evaluateExpressionValue<T = unknown>(expression: string): T | "" {
  try {
    return jexl.evalSync(expression) as T;
  } catch (err) {
    return "";
  }
}
