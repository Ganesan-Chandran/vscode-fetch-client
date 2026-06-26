import jsYaml from "js-yaml";
import { OpenAPIV3Document, OpenAPIV3Reference, OpenAPIV3Schema } from "../../../../types/openApi.v3.types";

export interface ParseResult {
  success: true;
  document: OpenAPIV3Document;
}

export interface ParseError {
  success: false;
  errors: string[];
}

export type ParseOutcome = ParseResult | ParseError;

function parseYaml(text: string): unknown {
  try {
    return jsYaml.load(text);
  } catch (requireErr) {
    throw new Error(
      "js-yaml is required to parse YAML. Install it with: npm install js-yaml @types/js-yaml"
    );
  }
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateRequiredFields(doc: unknown, errors: string[]): doc is OpenAPIV3Document {
  if (!isObject(doc)) {
    errors.push("Document root must be a JSON/YAML object.");
    return false;
  }

  if ("swagger" in doc) {
    errors.push(`Unsupported Swagger/OpenAPI version: "${(doc as any).swagger}". Only OpenAPI v3.x is supported.`);
  } else if (!("openapi" in doc)) {
    errors.push('Missing required field: "openapi". Only OpenAPI v3.x documents are supported.');
  } else if (typeof doc.openapi !== "string" || !doc.openapi.startsWith("3.")) {
    errors.push(`Unsupported OpenAPI version: "${doc.openapi}". Only v3.x is supported.`);
  }

  if (!("info" in doc) || !isObject(doc.info)) {
    errors.push('Missing required field: "info".');
  }

  if (!("paths" in doc) && !("components" in doc)) {
    errors.push('Document must contain at least "paths" or "components".');
  }

  return errors.length === 0;
}

// ─── $ref resolution ──────────────────────────────────────────────────────────

export function isRef(v: unknown): v is OpenAPIV3Reference {
  return isObject(v) && "$ref" in v && typeof (v as any).$ref === "string";
}

/**
 * Resolves a local $ref (e.g. "#/components/schemas/Pet") against the document.
 * Remote $refs are returned as-is and must be handled externally.
 */
export function resolveRef<T>(ref: string, doc: OpenAPIV3Document): T | null {
  if (!ref.startsWith("#/")) { return null; } // remote ref – skip
  const parts = ref.slice(2).split("/");
  let node: unknown = doc;
  for (const part of parts) {
    const key = part.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isObject(node) || !(key in node)) { return null; }
    node = (node as Record<string, unknown>)[key];
  }
  return node as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parse and lightly validate an OpenAPI v3 document from a JSON or YAML string.
 */
export function parseOpenApiDocument(content: string, hint?: "json" | "yaml"): ParseOutcome {
  const errors: string[] = [];

  // 1. Detect format
  const trimmed = content.trimStart();
  const isJson = trimmed.startsWith("{") || trimmed.startsWith("[");
  const format: "json" | "yaml" = hint ?? (isJson ? "json" : "yaml");

  // 2. Parse
  let raw: unknown;
  try {
    if (format === "json") {
      raw = JSON.parse(content);
    } else {
      raw = parseYaml(content);
    }
  } catch (err: any) {
    return { success: false, errors: [`Failed to parse ${format.toUpperCase()}: ${err.message}`] };
  }

  // 3. Validate structure
  if (!validateRequiredFields(raw, errors)) {
    return { success: false, errors };
  }

  // validateRequiredFields narrows raw to OpenAPIV3Document via type predicate
  const doc = raw;

  // 4. Warn about unsupported features (non-fatal)
  // (callers receive the document; warnings are surfaced via the ImportSummary)

  return { success: true, document: doc };
}

// ─── Schema example extraction ────────────────────────────────────────────────

/**
 * Recursively generate a minimal example value from an OpenAPI schema.
 * Used to populate body placeholders.
 */
export function generateExampleFromSchema(
  schema: OpenAPIV3Schema | undefined,
  doc: OpenAPIV3Document,
  visited = new Set<string>()
): unknown {
  if (!schema) { return undefined; }

  // Dereference
  if ((schema as any).$ref) {
    const refStr: string = (schema as any).$ref;
    if (visited.has(refStr)) { return null; } // circular guard
    visited.add(refStr);
    const resolved = resolveRef<OpenAPIV3Schema>(refStr, doc);
    return resolved ? generateExampleFromSchema(resolved, doc, visited) : null;
  }

  // Explicit example / default
  if (schema.example !== undefined) { return schema.example; }
  if (schema.default !== undefined) { return schema.default; }

  // enum → first value
  if (schema.enum && schema.enum.length > 0) { return schema.enum[0]; }

  // allOf / anyOf / oneOf → merge / pick first
  if (schema.allOf) {
    return schema.allOf.reduce<Record<string, unknown>>((acc, sub) => {
      const val = generateExampleFromSchema(sub, doc, visited);
      return isObject(val) ? { ...acc, ...val } : acc;
    }, {});
  }
  if (schema.anyOf?.[0] || schema.oneOf?.[0]) {
    return generateExampleFromSchema((schema.anyOf ?? schema.oneOf)![0], doc, visited);
  }

  switch (schema.type) {
    case "object": {
      const obj: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(schema.properties ?? {})) {
        obj[key] = generateExampleFromSchema(prop, doc, visited);
      }
      return obj;
    }
    case "array":
      return [generateExampleFromSchema(schema.items, doc, visited)];
    case "string":
      return schema.format === "date-time"
        ? new Date().toISOString()
        : schema.format === "date"
          ? new Date().toISOString().split("T")[0]
          : schema.format === "uuid"
            ? "00000000-0000-0000-0000-000000000000"
            : schema.format === "email"
              ? "user@example.com"
              : schema.format === "uri"
                ? "https://example.com"
                : schema.format === "binary"
                  ? ""
                  : "string";
    case "integer":
    case "number":
      return schema.format === "float" || schema.format === "double" ? 0.0 : 0;
    case "boolean":
      return false;
    case "null":
      return null;
    default:
      return null;
  }
}
