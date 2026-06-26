/**
 * Detect whether a string looks like YAML or JSON.
 */
export function detectFormat(content: string): "json" | "yaml" {
  const trimmed = content.trimStart();
  return trimmed.startsWith("{") || trimmed.startsWith("[") ? "json" : "yaml";
}

/**
 * Deep-merge two plain objects (b wins on conflict). Non-destructive.
 */
export function deepMerge<T extends Record<string, unknown>>(a: T, b: Partial<T>): T {
  const result: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (
      typeof v === "object" &&
      v !== null &&
      !Array.isArray(v) &&
      typeof result[k] === "object" &&
      result[k] !== null &&
      !Array.isArray(result[k])
    ) {
      result[k] = deepMerge(result[k] as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result as T;
}

// ─── Format detection ─────────────────────────────────────────────────────────

export type KnownFormat = "openapi" | "unknown";

export interface FormatDetectionResult {
  isOpenApi: boolean;
  /** "3.0" | "3.1" | null */
  version: string | null;
  /** "json" | "yaml" — the serialization used */
  serialization: "json" | "yaml";
  reason: string;
}


export function CheckOpenApiFormat(content: string): FormatDetectionResult {
  if (!content || content.trim().length === 0) {
    return { isOpenApi: false, version: null, serialization: "json", reason: "Empty content" };
  }

  const trimmed = content.trimStart();
  const serialization: "json" | "yaml" =
    trimmed.startsWith("{") || trimmed.startsWith("[") ? "json" : "yaml";

  const head = content.slice(0, 2048);

  const swaggerPattern =
    serialization === "json"
      ? /"swagger"\s*:\s*"2\./
      : /^swagger\s*:\s*['"]?2\./m;

  if (swaggerPattern.test(head)) {
    return {
      isOpenApi: false,
      version: null,
      serialization,
      reason: "Swagger 2.0 is not supported. Only OpenAPI v3.x is accepted.",
    };
  }

  const openapiPattern =
    serialization === "json"
      ? /"openapi"\s*:\s*"(3\.\d+(?:\.\d+)?)"/
      : /^openapi\s*:\s*['"]?(3\.\d+(?:\.\d+)?)['"]?/m;

  const match = openapiPattern.exec(head);

  if (!match) {
    return {
      isOpenApi: false,
      version: null,
      serialization,
      reason:
        serialization === "json"
          ? 'No "openapi" field with a 3.x version found in the first 2 KB.'
          : "No `openapi: 3.x` field found in the first 2 KB.",
    };
  }

  const version = match[1]; // e.g. "3.0.3" or "3.1.0"
  const majorMinor = version.split(".").slice(0, 2).join("."); // "3.0" | "3.1"

  return {
    isOpenApi: true,
    version: majorMinor,
    serialization,
    reason: `Detected OpenAPI ${version} (${serialization.toUpperCase()})`,
  };
}
