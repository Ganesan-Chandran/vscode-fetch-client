import jexl from "jexl";
import { ITableData } from "../types/common.types";

jexl.addFunction("now", () => Date.now());

jexl.addFunction("empty", (value: any) => {
  return value === "" || value === null || value === undefined;
});

jexl.addFunction("exists", (value: any) => {
  return value !== undefined && value !== null;
});

jexl.addFunction("contains", (text: any, search: any) => {
  return text?.toString().includes(search?.toString()) ?? false;
});

jexl.addFunction("matches", (text: any, regex: string) => {
  try {
    return new RegExp(regex).test(text?.toString() ?? "");
  } catch {
    return false;
  }
});

export function evaluateTableExpression(
  expression: string,
  variables: ITableData[],
): boolean {

  const context: Record<string, any> = {};

  variables.forEach(v => {
    context[v.key] = v.value;
  });

  const result = jexl.evalSync(expression, context);

  return Boolean(result);
}

export function evaluateExpression(expression: string): boolean {

  const result = jexl.evalSync(expression);

  return Boolean(result);
}
