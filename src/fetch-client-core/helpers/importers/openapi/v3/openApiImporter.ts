/**
 * openApiImporter.ts
 * ──────────────────
 * Public API for importing OpenAPI v3 JSON / YAML into the app's data model.
 *
 * Usage:
 *   import { importOpenApi } from "./openApiImporter";
 *
 *   const result = await importOpenApi(fileContent);
 *   if (result.success) {
 *     // Persist result.requests  → your requests DB
 *     // Persist result.collection → your collections DB
 *     console.log(result.summary);
 *   } else {
 *     console.error(result.errors);
 *   }
 */

import { parseOpenApiDocument } from "./openApiParser";
import { convertAllOperations } from "./converter";
import { buildCollection } from "./collectionBuilder";
import { detectFormat } from "./utils";
import { IRequestModel } from "../../../../types/request.types";
import { ICollections, IFolder } from "../../../../types/sidebar.types";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ImportSuccess {
  success: true;
  /** All converted request models — persist these to your requests DB */
  requests: IRequestModel[];
  /** The collection hierarchy — persist this to your collections DB */
  collection: ICollections;
  /** Human-readable summary */
  summary: ImportSummary;
}

export interface ImportFailure {
  success: false;
  errors: string[];
}

export type OpenAPIImportResult = ImportSuccess | ImportFailure;

export interface ImportSummary {
  title: string;
  version: string;
  totalRequests: number;
  /** Requests that were skipped due to conversion errors */
  skippedCount: number;
  deprecatedCount: number;
  authTypes: string[];
  bodyTypes: string[];
  /** Tag/group names that will become collection folders */
  groups: string[];
  warnings: string[];
}

export interface ImportOptions {
  /** Force format detection instead of auto-detecting */
  format?: "json" | "yaml";
  /**
   * When true, deprecated operations are included in the output.
   * Default: true
   */
  includeDeprecated?: boolean;
  /**
   * Base URL override – replaces the first server URL from the spec.
   * Useful when importing a spec pointing to a staging environment but you
   * want to hit production.
   */
  baseUrlOverride?: string;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Import an OpenAPI v3 document (JSON or YAML string) into the app's model.
 *
 * @param content   Raw file content as a string
 * @param options   Optional import configuration
 */
export async function importOpenApi(
  content: string,
  options: ImportOptions = {}
): Promise<OpenAPIImportResult> {
  // 1. Parse
  const format = options.format ?? detectFormat(content);
  const parsed = parseOpenApiDocument(content, format);
  if (!parsed.success) {
    return { success: false, errors: (parsed as ImportFailure).errors };
  }

  let doc = parsed.document;

  // 2. Apply base URL override
  if (options.baseUrlOverride) {
    doc = {
      ...doc,
      servers: [{ url: options.baseUrlOverride }, ...(doc.servers ?? []).slice(1)],
    };
  }

  // 3. Convert all operations
  const warnings: string[] = [];
  const allConverted = convertAllOperations(doc);

  // 4. Filter deprecated if requested
  const includeDeprecated = options.includeDeprecated !== false;
  const converted = includeDeprecated
    ? allConverted
    : allConverted.filter((c) => {
      if (c.deprecated) {
        warnings.push(`Skipped deprecated: ${c.method.toUpperCase()} ${c.path}`);
        return false;
      }
      return true;
    });

  if (converted.length === 0) {
    return {
      success: false,
      errors: ["No operations found in the document after filtering."],
    };
  }

  // 5. Build collection
  const { collection, requests } = buildCollection(converted, doc);

  // 6. Build summary
  const authTypes = [...new Set(requests.map((r) => r.auth.authType))];
  const bodyTypes = [...new Set(requests.map((r) => r.body.bodyType))];
  const groups = (collection.data ?? []).filter((i): i is IFolder => 'type' in i).map((f) => f.name);
  const deprecatedCount = allConverted.filter((c) => c.deprecated).length;
  const skippedCount = allConverted.length - converted.length;

  const summary: ImportSummary = {
    title: doc.info.title,
    version: doc.info.version,
    totalRequests: requests.length,
    skippedCount,
    deprecatedCount,
    authTypes,
    bodyTypes,
    groups,
    warnings,
  };

  return { success: true, requests, collection, summary };
}
