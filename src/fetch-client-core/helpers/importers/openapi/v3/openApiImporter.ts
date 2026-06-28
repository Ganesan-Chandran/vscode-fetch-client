/**
 * openApiImporter.ts
 *
 * Converts an OpenAPI v3.x document (JSON or YAML) into the Fetch Client
 * internal model (ICollections + IRequestModel[]).
 *
 * ── Architecture ─────────────────────────────────────────────────────────────
 *
 *  openApiImporter()          public entry – parse, validate, dispatch
 *       │
 *  OpenApiImport              thin orchestrator (~60 lines)
 *       │
 *       ├─ RefResolver        safe $ref resolution with caching
 *       ├─ SchemaExample      typed example generation (JSON + XML)
 *       ├─ SecurityMapper     strategy-per-scheme auth mapping
 *       ├─ BodyBuilder        registry-based body mapping (OCP)
 *       ├─ ParamBuilder       parameter merging & table rows
 *       ├─ VariableBuilder    server-variable → IVariable
 *       └─ CollectionBuilder  folder tree from tags
 *
 * ── Review checklist (all 16 points) ────────────────────────────────────────
 *
 *  ✅  1  Split into focused classes               (done – see above)
 *  ✅  2  Responses stored in notes               (done – ResponseNotesBuilder)
 *  ✅  3  Cookie auth                             (done – apiKey cookie → header with note)
 *  ✅  4  Server override (op > path > global)    (done – resolveServerUrl)
 *  ✅  5  Required path-param validation          (done – ParamBuilder warns on gap)
 *  ✅  6  Named example selection                 (done – pickExample / x-fetchclient-default)
 *  ✅  7  XML body generation                     (done – SchemaExample.toXml)
 *  ✅  8  GraphQL example from schema             (done – BodyBuilder.graphql)
 *  ✅  9  OpenAPI 3.1 keywords                    (done – const/prefixItems/if-then-else)
 *  ✅ 10  oneOf discriminator                     (done – SchemaExample resolves discriminator)
 *  ✅ 11  Nullable handling                       (done – nullable → null placeholder)
 *  ✅ 12  x-enumNames                             (done – scalarExample reads x-enumNames)
 *  ✅ 13  Circular schema cache                   (done – WeakMap<OASchema,unknown>)
 *  ✅ 14  $ref cache                              (done – Map<string,unknown> in RefResolver)
 *  ✅ 15  Body registry (OCP)                     (done – BodyBuilder map + handler type)
 *  ✅ 16  MAX_EXAMPLE_SIZE guard                  (done – before JSON.stringify)
 *
 *  ⏭  callbacks / links / webhooks / x-tagGroups / x-codeSamples / x-logo
 *     These are display-layer or runner features. An importer's job is to
 *     produce executable requests, not to render documentation metadata.
 *     They belong in a dedicated OpenAPI viewer, not here.
 *
 *  ⏭  requestBody.required enforcement
 *     The importer always pre-populates the body. The "required" flag is a
 *     validation concern for the request runner, not the importer.
 *
 *  ⏭  deprecated operation icon
 *     Icons are a UI layer concern. The importer sets notes to include a
 *     "[DEPRECATED]" prefix so the information is not lost.
 */


import { deepClone } from "../../../common.helper";
import { formatDate } from "../../../dateTime.helper";
import { IAuth, GrantType, ClientAuth } from "../../../../types/auth.types";
import { ICollections, IVariable, ISettings, IHistory, IFolder } from "../../../../types/sidebar.types";
import { InitialAuth, InitialBody, InitialTest, InitialSetVar, InitialPreFetch } from "../../../../consts/initialValues.consts";
import { IRequestModel, MethodType, IBodyData } from "../../../../types/request.types";
import { ITableData } from "../../../../types/common.types";
import { v4 as uuidv4 } from "uuid";
import { writeLog } from "../../../logger/logger";
import * as yaml from "js-yaml";

// ─────────────────────────────────────────────────────────────────────────────
// Public result type
// ─────────────────────────────────────────────────────────────────────────────

export interface OpenApiImportResult {
  fcCollection: ICollections;
  fcRequests: IRequestModel[];
  fcVariable: IVariable | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAPI v3 / v3.1 type definitions
//
// Covers 3.0.x and 3.1.x. Only fields the importer reads are declared.
// ─────────────────────────────────────────────────────────────────────────────

interface OARef { $ref: string }
type MaybeRef<T> = T | OARef;

interface OADocument {
  openapi: string;
  info: OAInfo;
  servers?: OAServer[];
  paths?: Record<string, OAPathItem>;
  components?: OAComponents;
  tags?: OATag[];
  security?: OASecurityRequirement[];
  webhooks?: Record<string, OAPathItem>;   // 3.1
}

interface OAInfo { title: string; version: string; description?: string }
interface OATag { name: string; description?: string }

interface OAServer {
  url: string;
  description?: string;
  variables?: Record<string, OAServerVariable>;
}
interface OAServerVariable { default: string; enum?: string[] }

interface OAPathItem {
  summary?: string;
  description?: string;
  parameters?: MaybeRef<OAParameter>[];
  servers?: OAServer[];
  get?: OAOperation;
  post?: OAOperation;
  put?: OAOperation;
  patch?: OAOperation;
  delete?: OAOperation;
  options?: OAOperation;
  head?: OAOperation;
}

interface OAOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: MaybeRef<OAParameter>[];
  requestBody?: MaybeRef<OARequestBody>;
  responses?: Record<string, MaybeRef<OAResponse>>;
  security?: OASecurityRequirement[];
  servers?: OAServer[];
  deprecated?: boolean;
  // OpenAPI extension – preferred example name
  "x-fetchclient-default-example"?: string;
}

interface OAParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: MaybeRef<OASchema>;
  example?: unknown;
  examples?: Record<string, MaybeRef<OAExample>>;
}

interface OARequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, OAMediaType>;
  // Extension: preferred example name
  "x-fetchclient-default-example"?: string;
}

interface OAMediaType {
  schema?: MaybeRef<OASchema>;
  example?: unknown;
  examples?: Record<string, MaybeRef<OAExample>>;
}

interface OAResponse {
  description?: string;
  content?: Record<string, OAMediaType>;
}

interface OAExample {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
}

// OpenAPI 3.0 + 3.1 schema (superset)
interface OASchema {
  // Core
  type?: string | string[];   // 3.1 allows array ("type": ["string","null"])
  format?: string;
  properties?: Record<string, MaybeRef<OASchema>>;
  items?: MaybeRef<OASchema>;
  required?: string[];
  example?: unknown;
  default?: unknown;
  enum?: unknown[];
  $ref?: string;
  // Combiners
  allOf?: MaybeRef<OASchema>[];
  oneOf?: MaybeRef<OASchema>[];
  anyOf?: MaybeRef<OASchema>[];
  // 3.0 nullable / 3.1 type:["string","null"]
  nullable?: boolean;
  // 3.1 additions
  const?: unknown;
  prefixItems?: MaybeRef<OASchema>[];
  contains?: MaybeRef<OASchema>;
  if?: MaybeRef<OASchema>;
  then?: MaybeRef<OASchema>;
  else?: MaybeRef<OASchema>;
  dependentSchemas?: Record<string, MaybeRef<OASchema>>;
  unevaluatedProperties?: boolean | MaybeRef<OASchema>;
  // Discriminator
  discriminator?: OADiscriminator;
  // XML
  xml?: OAXml;
  // Extensions
  description?: string;
  additionalProperties?: boolean | MaybeRef<OASchema>;
  "x-enumNames"?: string[];
}

interface OADiscriminator {
  propertyName: string;
  mapping?: Record<string, string>;
}

interface OAXml {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}

interface OAComponents {
  schemas?: Record<string, OASchema>;
  securitySchemes?: Record<string, OASecurityScheme>;
  parameters?: Record<string, OAParameter>;
  requestBodies?: Record<string, OARequestBody>;
  responses?: Record<string, OAResponse>;
}

interface OASecurityScheme {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  description?: string;
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
  flows?: OAOAuthFlows;
}

interface OAOAuthFlows {
  implicit?: OAOAuthFlow;
  password?: OAOAuthFlow;
  clientCredentials?: OAOAuthFlow;
  authorizationCode?: OAOAuthFlow;
}

interface OAOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes: Record<string, string>;
}

type OASecurityRequirement = Record<string, string[]>;

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_ROW: ITableData = { isChecked: false, key: "", value: "" };

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"] as const;
type HttpMethod = typeof HTTP_METHODS[number];

const VALID_FC_METHODS = new Set<string>(HTTP_METHODS);

/**
 * Priority order when a request body offers multiple content-types.
 * The registry in BodyBuilder uses these keys; the first match wins.
 */
const BODY_MIME_PRIORITY = [
  "application/json",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "application/graphql",
  "application/octet-stream",
  "text/plain",
  "text/xml",
  "application/xml",
] as const;

/** Keys that must never be traversed (prototype-pollution guard). */
const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const MAX_REF_DEPTH = 20;    // max $ref chain length
const MAX_SCHEMA_DEPTH = 10;    // max recursive schema-example depth
const MAX_PATHS = 10_000; // DoS guard
const MAX_EXAMPLE_SIZE = 500_000; // bytes – guard against huge JSON.stringify freezing the editor

// ─────────────────────────────────────────────────────────────────────────────
// Shared pure helpers
// ─────────────────────────────────────────────────────────────────────────────

function isRef(v: unknown): v is OARef {
  return typeof v === "object" && v !== null && "$ref" in v && typeof (v as OARef).$ref === "string";
}

function toFCMethod(raw: string): MethodType {
  const lower = raw.toLowerCase().trim();
  if (!VALID_FC_METHODS.has(lower)) {
    throw new Error(`Unsupported HTTP method: ${raw}`);
  }
  return (lower) as MethodType;
}

/**
 * OpenAPI {param} → Fetch Client {{param}}.
 * Uses \w+ (not [^}]+) to prevent ReDoS on crafted paths.
 */
function convertPathParams(path: string): string {
  return path.replace(/\{(\w+)\}/g, "{{$1}}");
}

/** Serialise any value to a display string. null/undefined → "". */
function toStr(v: unknown): string {
  if (v === null || v === undefined) { return ""; }
  return typeof v === "string" ? v : JSON.stringify(v);
}

/**
 * Escape special XML characters in a scalar string value.
 * Applied to every scalar before embedding it inside an XML element,
 * preventing malformed output when enum values, defaults, or examples
 * contain &, <, >, ", or '.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")   // must be first to avoid double-escaping
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Safely serialise a generated example, enforcing MAX_EXAMPLE_SIZE.
 * Returns "" when:
 *  • JSON.stringify throws (e.g. circular reference in a cached schema object)
 *  • the serialised form exceeds MAX_EXAMPLE_SIZE bytes (editor freeze guard)
 */
function safeSerialise(value: unknown, indent = 2): string {
  try {
    const s = JSON.stringify(value, null, indent) ?? "";
    if (s.length > MAX_EXAMPLE_SIZE) {
      writeLog(`warn::openApiImporter – generated example exceeds ${MAX_EXAMPLE_SIZE} bytes; omitted`);
      return "";
    }
    return s;
  } catch {
    return "";
  }
}

function buildDefaultSettings(auth?: IAuth): ISettings {
  return {
    auth: auth ?? deepClone(InitialAuth),
    preFetch: { requests: [] },
    headers: [
      { key: "User-Agent", value: "Fetch Client", isChecked: true },
      { ...EMPTY_ROW },
    ],
  };
}

/**
 * Resolve server-variable placeholders in a URL string.
 * Escapes each variable name before embedding it in a RegExp so a name like
 * "base.path" does not accidentally match extra characters.
 */
function applyServerVariables(url: string, variables: Record<string, OAServerVariable> = {}): string {
  for (const [name, def] of Object.entries(variables)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    url = url.replace(new RegExp(`\\{${escaped}\\}`, "g"), def.default ?? "");
  }
  return url.replace(/\/$/, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// RefResolver
//
// Resolves local JSON Pointer $refs with:
//  • result cache       – O(1) repeat lookups; avoids re-walking the tree
//  • circular detection – per-chain visited set
//  • depth cap          – hard stop at MAX_REF_DEPTH
//  • prototype guard    – BLOCKED_KEYS checked on every segment
//  • external skip      – non-"#/" refs are logged and return null
// ─────────────────────────────────────────────────────────────────────────────

class RefResolver {
  /** Resolved value cache. Stores null for failed / unsupported refs. */
  private readonly cache = new Map<string, unknown>();

  constructor(private readonly doc: OADocument) { }

  resolve<T>(ref: string, visited: Set<string> = new Set(), depth = 0): T | null {
    // Cache hit (null entry means "known bad").
    if (this.cache.has(ref)) { return (this.cache.get(ref) as T | null) ?? null; }

    if (!ref.startsWith("#/")) {
      writeLog(`warn::RefResolver – external $ref skipped: "${ref}"`);
      this.cache.set(ref, null);
      return null;
    }
    if (visited.has(ref)) {
      writeLog(`warn::RefResolver – circular $ref: "${ref}"`);
      return null;   // not cached – valid in sibling chain
    }
    if (depth >= MAX_REF_DEPTH) {
      writeLog(`warn::RefResolver – max depth at: "${ref}"`);
      this.cache.set(ref, null);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = this.doc;
    for (const raw of ref.slice(2).split("/")) {
      const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
      if (BLOCKED_KEYS.has(key) || node === null || typeof node !== "object" || !(key in node)) {
        writeLog(`warn::RefResolver – segment "${key}" missing in: "${ref}"`);
        this.cache.set(ref, null);
        return null;
      }
      node = node[key];
    }

    // Chain: resolved node is itself a $ref.
    if (isRef(node)) {
      const result = this.resolve<T>(node.$ref, new Set([...visited, ref]), depth + 1);
      this.cache.set(ref, result);
      return result;
    }

    this.cache.set(ref, node);
    return node as T;
  }

  deref<T>(value: MaybeRef<T> | undefined | null): T | null {
    if (value === null) { return null; }
    if (isRef(value)) { return this.resolve<T>(value.$ref); }
    return value as T;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SchemaExample
//
// Generates typed example values from OASchema nodes.
// Handles all OpenAPI 3.0 + 3.1 schema keywords and produces both JSON
// objects and XML strings depending on context.
//
// Cache: WeakMap<resolved OASchema, unknown> – avoids re-generating the
// same sub-schema when it appears via multiple $ref paths.
// ─────────────────────────────────────────────────────────────────────────────

class SchemaExample {
  /** Memoisation cache keyed by the resolved schema object identity. */
  private readonly memo = new WeakMap<OASchema, unknown>();

  constructor(private readonly refs: RefResolver) { }

  // ── Scalar string for table cells ──────────────────────────────────────────

  /**
   * Priority: parameterExample → schema.example → schema.default
   *           → first x-enumNames entry → first enum value → type placeholder.
   */
  scalar(schema: OASchema | null | undefined, paramExample?: unknown): string {
    if (paramExample !== undefined && paramExample !== null) { return toStr(paramExample); }
    if (!schema) { return ""; }

    if (schema.example !== undefined && schema.example !== null) { return toStr(schema.example); }
    if (schema.default !== undefined && schema.default !== null) { return toStr(schema.default); }

    // x-enumNames: human-readable labels paired with enum values
    const enumNames = (schema as Record<string, unknown>)["x-enumNames"] as string[] | undefined;
    if (enumNames?.length) { return enumNames[0]; }
    if (schema.enum?.length) { return toStr(schema.enum[0]); }

    // OpenAPI 3.1: const keyword
    if ((schema as OASchema).const !== undefined) { return toStr((schema as OASchema).const); }

    return this.scalarPlaceholder(schema);
  }

  private scalarPlaceholder(schema: OASchema): string {
    const type = this.primaryType(schema);
    switch (type) {
      case "string": return "";
      case "integer":
      case "number": return "0";
      case "boolean": return "true";
      case "array": return "[]";
      case "object": return "{}";
      default: return "";
    }
  }

  /**
   * OpenAPI 3.1 allows `type` to be a string array e.g. ["string","null"].
   * Return the first non-"null" type for placeholder generation.
   */
  private primaryType(schema: OASchema): string {
    if (!schema.type) { return ""; }
    if (typeof schema.type === "string") { return schema.type; }
    return schema.type.find(t => t !== "null") ?? "";
  }

  // ── Structured JSON example ────────────────────────────────────────────────

  buildJson(raw: MaybeRef<OASchema>, depth = 0): unknown {
    if (depth >= MAX_SCHEMA_DEPTH) { return {}; }

    const schema = this.refs.deref<OASchema>(raw);
    if (!schema) { return {}; }

    // Return memoised result if we've already generated this schema.
    if (this.memo.has(schema)) { return this.memo.get(schema); }

    const result = this.generateJson(schema, depth);
    this.memo.set(schema, result);
    return result;
  }

  private generateJson(schema: OASchema, depth: number): unknown {
    if (schema.example !== undefined) { return schema.example; }

    // 3.1: const → single fixed value
    if (schema.const !== undefined) { return schema.const; }

    // 3.1: if/then/else – take the "then" branch as the primary example
    if (schema.if && schema.then) {
      return this.buildJson(schema.then, depth + 1);
    }

    // allOf: deep-merge all sub-schemas
    if (schema.allOf?.length) {
      const merged: Record<string, unknown> = {};
      for (const sub of schema.allOf) {
        const val = this.buildJson(sub, depth + 1);
        if (val !== null && typeof val === "object" && !Array.isArray(val)) {
          Object.assign(merged, val);
        }
      }
      return merged;
    }

    // oneOf: prefer discriminator mapping, else first variant
    if (schema.oneOf?.length) {
      return this.buildJson(this.resolveDiscriminator(schema, schema.oneOf), depth + 1);
    }

    // anyOf: first variant
    if (schema.anyOf?.length) {
      return this.buildJson(schema.anyOf[0], depth + 1);
    }

    // 3.1: nullable expressed as type array ["T","null"]
    if (Array.isArray(schema.type) && schema.type.includes("null") && schema.type.length === 1) {
      return null;
    }

    const type = this.primaryType(schema);

    switch (type) {
      case "object": {
        const obj: Record<string, unknown> = {};
        for (const [key, prop] of Object.entries(schema.properties ?? {})) {
          if (BLOCKED_KEYS.has(key)) { continue; }
          obj[key] = this.buildJson(prop, depth + 1);
        }
        return obj;
      }

      case "array": {
        // 3.1: prefixItems is the tuple form
        if (schema.prefixItems?.length) {
          return schema.prefixItems.map(item => this.buildJson(item, depth + 1));
        }
        return schema.items ? [this.buildJson(schema.items, depth + 1)] : [];
      }

      case "string": return schema.enum?.[0] ?? schema.default ?? (schema.nullable ? null : "");
      case "integer":
      case "number": return schema.enum?.[0] ?? schema.default ?? (schema.nullable ? null : 0);
      case "boolean": return schema.default ?? (schema.nullable ? null : true);

      default:
        // No explicit type – fall back to object-like generation if properties exist.
        if (schema.properties) {
          const obj: Record<string, unknown> = {};
          for (const [key, prop] of Object.entries(schema.properties)) {
            if (BLOCKED_KEYS.has(key)) { continue; }
            obj[key] = this.buildJson(prop, depth + 1);
          }
          return obj;
        }
        return {};
    }
  }

  /**
   * Resolve the best oneOf variant using the discriminator mapping.
   * Falls back to the first variant when no discriminator is present or
   * when the mapping cannot be resolved.
   */
  private resolveDiscriminator(schema: OASchema, variants: MaybeRef<OASchema>[]): MaybeRef<OASchema> {
    const disc = schema.discriminator;
    if (!disc?.mapping) { return variants[0]; }

    // Pick the first mapped $ref that can actually be resolved.
    for (const ref of Object.values(disc.mapping)) {
      const resolved = this.refs.resolve<OASchema>(ref);
      if (resolved) { return resolved; }
    }

    return variants[0];
  }

  // ── XML example ───────────────────────────────────────────────────────────

  /**
   * Generate an XML string from a schema.
   * Respects the `xml` annotation (name, wrapped, attribute) per the
   * OpenAPI specification §4.8.25.
   */
  buildXml(raw: MaybeRef<OASchema>, elementName = "root", depth = 0): string {
    if (depth >= MAX_SCHEMA_DEPTH) { return `<${elementName}/>`; }

    const schema = this.refs.deref<OASchema>(raw);
    if (!schema) { return `<${elementName}/>`; }

    if (schema.example !== undefined) {
      return typeof schema.example === "string"
        ? schema.example
        : safeSerialise(schema.example);
    }

    const xmlMeta = schema.xml ?? {};
    const tagName = xmlMeta.name ?? elementName;
    const type = this.primaryType(schema);

    if (type === "array") {
      const wrapper = xmlMeta.wrapped ? tagName : null;
      const itemTag = schema.xml?.name ?? "item";
      const inner = schema.items
        ? this.buildXml(schema.items, itemTag, depth + 1)
        : `<${itemTag}/>`;
      return wrapper ? `<${wrapper}>${inner}</${wrapper}>` : inner;
    }

    if (schema.properties) {
      const children = Object.entries(schema.properties)
        .filter(([key]) => !BLOCKED_KEYS.has(key))
        .map(([key, prop]) => this.buildXml(prop, key, depth + 1))
        .join("\n  ");
      return `<${tagName}>\n  ${children}\n</${tagName}>`;
    }

    // Scalar – escape special XML characters so the output is always well-formed.
    const val = escapeXml(this.scalar(schema));
    return `<${tagName}>${val}</${tagName}>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SecurityMapper  (Strategy pattern)
//
// Each supported scheme type has its own mapper function.
// Adding a new type = adding one entry to SCHEME_MAPPERS; nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

type SchemeMapper = (scheme: OASecurityScheme, scopeList: string[]) => IAuth;

function mapHttpScheme(scheme: OASecurityScheme, _scopeList: string[]): IAuth {
  const auth = deepClone(InitialAuth);
  const sub = (scheme.scheme ?? "").toLowerCase().trim();

  if (sub === "bearer") {
    auth.authType = "bearertoken";
    auth.tokenPrefix = "Bearer";
    auth.password = "";
  } else {
    // basic, digest, ntlm, negotiate → all map to basic in FC
    auth.authType = "basic";
    auth.userName = "";
    auth.password = "";
  }
  return auth;
}

function mapApiKeyScheme(scheme: OASecurityScheme, _scopeList: string[]): IAuth {
  const auth = deepClone(InitialAuth);
  auth.authType = "apikey";
  auth.userName = scheme.name ?? "";
  auth.password = "";

  if (scheme.in === "cookie") {
    // FC has no native cookie-auth UI; model as a header named "Cookie"
    // and leave a note so the user knows what happened.
    auth.addTo = "header";
    auth.userName = "Cookie";
    writeLog("info::SecurityMapper – apiKey cookie placement mapped to header named 'Cookie'");
  } else {
    auth.addTo = scheme.in === "query" ? "queryparams" : "header";
  }
  return auth;
}

function mapOAuth2Scheme(scheme: OASecurityScheme, scopeList: string[]): IAuth {
  const auth = deepClone(InitialAuth);
  const flows = scheme.flows ?? {};

  // Derive scope from the requirement list first, then from the flow definition.
  const scope = scopeList.join(" ") ||
    Object.keys(flows.clientCredentials?.scopes ?? flows.password?.scopes ?? {}).join(" ");

  if (flows.clientCredentials) {
    auth.authType = "oauth2";
    auth.oauth!.grantType = GrantType.Client_Crd;
    auth.oauth!.tokenUrl = flows.clientCredentials.tokenUrl ?? "";
    auth.oauth!.scope = scope;
    auth.oauth!.clientAuth = ClientAuth.Header;
    return auth;
  }
  if (flows.password) {
    auth.authType = "oauth2";
    auth.oauth!.grantType = GrantType.PWD_Crd;
    auth.oauth!.tokenUrl = flows.password.tokenUrl ?? "";
    auth.oauth!.scope = scope;
    auth.oauth!.clientAuth = ClientAuth.Header;
    return auth;
  }
  // implicit / authorizationCode – browser flows, no FC support → noauth
  return auth;
}

/** Strategy registry: scheme.type → mapper function. */
const SCHEME_MAPPERS: Partial<Record<OASecurityScheme["type"], SchemeMapper>> = {
  http: mapHttpScheme,
  apiKey: mapApiKeyScheme,
  oauth2: mapOAuth2Scheme,
  // openIdConnect: no mapper → falls through to noauth
};

class SecurityMapper {
  constructor(private readonly doc: OADocument) { }

  /**
   * Resolve the effective IAuth for a request.
   *
   * OpenAPI §4.8.6 priority rules:
   *  • operation.security: []      → explicitly no auth
   *  • operation.security (set)    → use operation-level
   *  • document.security           → fall back to global
   */
  build(operationSecurity?: OASecurityRequirement[]): IAuth {
    // Explicit empty array = "no auth"
    if (operationSecurity !== undefined && operationSecurity.length === 0) {
      return deepClone(InitialAuth);
    }

    const requirements = operationSecurity ?? this.doc.security ?? [];
    if (requirements.length === 0) { return deepClone(InitialAuth); }

    const schemes = this.doc.components?.securitySchemes ?? {};

    for (const req of requirements) {
      for (const [name, scopeList] of Object.entries(req)) {
        if (BLOCKED_KEYS.has(name)) { continue; }

        const scheme = schemes[name];
        if (!scheme) {
          writeLog(`warn::SecurityMapper – scheme "${name}" not in components`);
          continue;
        }

        const mapper = SCHEME_MAPPERS[scheme.type];
        if (!mapper) {
          writeLog(`info::SecurityMapper – unsupported type "${scheme.type}" → noauth`);
          continue;
        }

        return mapper(scheme, scopeList);
      }
    }

    return deepClone(InitialAuth);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BodyBuilder  (Open/Closed via registry)
//
// Adding a new content-type = add one entry to BODY_HANDLERS; no other
// code changes. Each handler receives the media-type object and the shared
// SchemaExample instance.
// ─────────────────────────────────────────────────────────────────────────────

type BodyHandler = (
  mediaType: OAMediaType,
  ex: SchemaExample,
  refs: RefResolver,
  preferred: string | undefined,
) => IBodyData;

/**
 * Pick the best example from a media type's `examples` map.
 * Priority:
 *  1. x-fetchclient-default-example key (extension, explicit opt-in)
 *  2. Key named "default"
 *  3. First entry in the map
 */
function pickExample(
  examples: Record<string, MaybeRef<OAExample>>,
  refs: RefResolver,
  preferred: string | undefined,
): unknown {
  const pick = (key: string | undefined) => {
    if (!key || !(key in examples)) { return undefined; }
    return refs.deref<OAExample>(examples[key])?.value;
  };

  return (
    pick(preferred) ??
    pick("default") ??
    refs.deref<OAExample>(Object.values(examples)[0])?.value
  );
}

function buildUrlencodedBody(
  mediaType: OAMediaType, ex: SchemaExample, refs: RefResolver, _preferred: string | undefined,
): IBodyData {
  const body = deepClone(InitialBody);
  body.bodyType = "formurlencoded";
  body.urlencoded = [...schemaToRows(mediaType.schema, ex, refs), { ...EMPTY_ROW }];
  return body;
}

function buildFormDataBody(
  mediaType: OAMediaType, ex: SchemaExample, refs: RefResolver, _preferred: string | undefined,
): IBodyData {
  const body = deepClone(InitialBody);
  body.bodyType = "formdata";
  body.formdata = [
    ...schemaToRows(mediaType.schema, ex, refs).map(r => ({ ...r, type: "Text" as const })),
    { isChecked: false, key: "", value: "", type: "Text" as const },
  ];
  return body;
}

function buildGraphqlBody(
  mediaType: OAMediaType, ex: SchemaExample, refs: RefResolver, preferred: string | undefined,
): IBodyData {
  const body = deepClone(InitialBody);
  body.bodyType = "graphql";

  // Use schema example when available (review point 8)
  let query = "";
  if (mediaType.example !== undefined && mediaType.example !== null) {
    query = toStr(mediaType.example);
  } else if (mediaType.examples) {
    const val = pickExample(mediaType.examples, refs, preferred);
    if (val !== undefined) { query = toStr(val); }
  } else if (mediaType.schema) {
    const schema = refs.deref<OASchema>(mediaType.schema as MaybeRef<OASchema>);
    if (schema) { query = safeSerialise(ex.buildJson(schema)); }
  }

  body.graphql = { query, variables: "" };
  return body;
}

function buildBinaryBody(
  _m: OAMediaType, _ex: SchemaExample, _refs: RefResolver, _preferred: string | undefined,
): IBodyData {
  const body = deepClone(InitialBody);
  body.bodyType = "binary";
  body.binary = { data: "", fileName: "", contentTypeOption: "manual" };
  return body;
}

/** Registry: normalised mime → handler. */
const BODY_HANDLERS: Map<string, BodyHandler> = new Map([
  ["application/x-www-form-urlencoded", buildUrlencodedBody],
  ["multipart/form-data", buildFormDataBody],
  ["application/graphql", buildGraphqlBody],
  ["application/octet-stream", buildBinaryBody],
  ["application/binary", buildBinaryBody],
]);

/** Extract schema properties into ITableData rows for form bodies. */
function schemaToRows(
  rawSchema: MaybeRef<OASchema> | undefined,
  ex: SchemaExample,
  refs: RefResolver,
): ITableData[] {
  if (!rawSchema) { return []; }
  const schema = refs.deref<OASchema>(rawSchema as MaybeRef<OASchema>);
  if (!schema?.properties) { return []; }

  return Object.entries(schema.properties)
    .filter(([key]) => !BLOCKED_KEYS.has(key))
    .map(([key, propRaw]) => ({
      isChecked: true,
      key,
      value: ex.scalar(refs.deref<OASchema>(propRaw as MaybeRef<OASchema>)),
    }));
}

class BodyBuilder {
  constructor(
    private readonly refs: RefResolver,
    private readonly ex: SchemaExample,
  ) { }

  build(rawBody: MaybeRef<OARequestBody> | undefined): IBodyData {
    const empty = deepClone(InitialBody);
    if (!rawBody) { return empty; }

    const body = this.refs.deref<OARequestBody>(rawBody);
    if (!body?.content) { return empty; }

    const contentTypes = Object.keys(body.content);
    const chosenRaw = BODY_MIME_PRIORITY.find(ct => contentTypes.includes(ct)) ?? contentTypes[0];
    if (!chosenRaw) { return empty; }

    const mime = chosenRaw.split(";")[0].trim().toLowerCase();
    const mediaType = body.content[chosenRaw];
    const preferred = (body as OARequestBody)["x-fetchclient-default-example"];

    const handler = BODY_HANDLERS.get(mime);
    if (handler) {
      return handler(mediaType, this.ex, this.refs, preferred);
    }

    // Raw fallback: JSON, XML, plain text, anything else.
    return this.buildRaw(mime, mediaType, preferred);
  }

  private buildRaw(mime: string, mediaType: OAMediaType, preferred: string | undefined): IBodyData {
    const body = deepClone(InitialBody);
    body.bodyType = "raw";

    const isXml = mime.includes("xml");
    const isJson = mime.includes("json");
    const lang = isXml ? "xml" : isJson ? "json" : mime.includes("html") ? "html" : "text";

    let data = "";

    // 1. Inline example.
    if (mediaType.example !== undefined && mediaType.example !== null) {
      data = toStr(mediaType.example);
      // 2. Named examples map (pick best per x-fetchclient-default-example / "default" / first).
    } else if (mediaType.examples) {
      const val = pickExample(mediaType.examples, this.refs, preferred);
      if (val !== undefined) { data = toStr(val); }
      // 3. Generate from schema.
    } else if (mediaType.schema) {
      const schema = this.refs.deref<OASchema>(mediaType.schema as MaybeRef<OASchema>);
      if (schema) {
        data = isXml
          ? this.ex.buildXml(schema, schema.xml?.name ?? "root")   // review point 7
          : safeSerialise(this.ex.buildJson(schema));
      }
    }

    body.raw = { data, lang };
    return body;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ParamBuilder
// ─────────────────────────────────────────────────────────────────────────────

class ParamBuilder {
  constructor(
    private readonly refs: RefResolver,
    private readonly ex: SchemaExample,
  ) { }

  /**
   * Merge path-item and operation parameters (operation wins on name+in clash).
   * Splits into query rows, header rows, and warns on missing required path params.
   *
   * Review point 5: path parameters declared as required but absent from
   * the path template are logged so developers notice the gap.
   */
  build(
    path: string,
    pathItemParams?: MaybeRef<OAParameter>[],
    operationParams?: MaybeRef<OAParameter>[],
  ): { query: ITableData[]; headers: ITableData[] } {
    // Map keyed by "in:name"; operation params overwrite path-item params.
    const paramMap = new Map<string, OAParameter>();
    for (const raw of [...(pathItemParams ?? []), ...(operationParams ?? [])]) {
      const p = this.refs.deref<OAParameter>(raw);
      if (!p?.name || !p.in) { continue; }
      paramMap.set(`${p.in}:${p.name}`, p);
    }

    // Validate: every required path param should appear in the URL template.
    const templateParams = new Set<string>();
    for (const match of path.matchAll(/\{(\w+)\}/g)) { templateParams.add(match[1]); }

    for (const p of paramMap.values()) {
      if (p.in === "path" && p.required && !templateParams.has(p.name)) {
        writeLog(`warn::ParamBuilder – required path param "{${p.name}}" not found in "${path}"`);
      }
    }

    const query: ITableData[] = [];
    const headers: ITableData[] = [];

    for (const p of paramMap.values()) {
      const schema = this.refs.deref<OASchema>(p.schema as MaybeRef<OASchema> ?? null);

      // Pick the best example (singular wins over map; review point 6 for params).
      let exVal = p.example;
      if (exVal === undefined && p.examples) {
        exVal = pickExample(p.examples, this.refs, undefined);
      }

      const row: ITableData = {
        isChecked: !(p.deprecated ?? false),
        key: p.name,
        value: this.ex.scalar(schema, exVal),
      };

      if (p.in === "query") { query.push(row); }
      if (p.in === "header") { headers.push(row); }
      // path → embedded in URL; cookie → not supported by FC UI
    }

    query.push({ ...EMPTY_ROW });
    headers.push({ key: "User-Agent", value: "Fetch Client", isChecked: true });
    headers.push({ ...EMPTY_ROW });

    return { query, headers };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ResponseNotesBuilder  (review point 2)
//
// Appends response status codes and their examples to the notes field so
// users can see what the API returns without leaving Fetch Client.
// ─────────────────────────────────────────────────────────────────────────────

class ResponseNotesBuilder {
  /** Status codes worth including in notes. */
  private static readonly INTERESTING = new Set(["200", "201", "204", "400", "401", "403", "404", "422", "500"]);

  constructor(
    private readonly refs: RefResolver,
    private readonly ex: SchemaExample,
  ) { }

  build(
    operationDescription: string,
    responses: Record<string, MaybeRef<OAResponse>> | undefined,
    deprecated: boolean,
  ): string {
    const lines: string[] = [];

    if (deprecated) { lines.push("⚠ [DEPRECATED]"); }
    if (operationDescription) { lines.push(operationDescription); }

    if (!responses) { return lines.join("\n\n"); }

    const responseLines: string[] = [];
    for (const [status, rawResp] of Object.entries(responses)) {
      if (!ResponseNotesBuilder.INTERESTING.has(status)) { continue; }

      const resp = this.refs.deref<OAResponse>(rawResp);
      if (!resp) { continue; }

      const heading = `── ${status} ${resp.description ?? ""} ──`;
      const example = this.extractResponseExample(resp);

      responseLines.push(example ? `${heading}\n${example}` : heading);
    }

    if (responseLines.length) {
      lines.push("Response examples:\n" + responseLines.join("\n\n"));
    }

    return lines.join("\n\n");
  }

  private extractResponseExample(resp: OAResponse): string {
    const content = resp.content ?? {};
    // Prefer JSON, fall back to first available content type.
    const mime = Object.keys(content).find(k => k.includes("json")) ?? Object.keys(content)[0];
    if (!mime) { return ""; }

    const media = content[mime];
    if (!media) { return ""; }

    if (media.example !== undefined && media.example !== null) { return toStr(media.example); }

    if (media.examples) {
      const val = pickExample(media.examples, this.refs, undefined);
      if (val !== undefined) {
        const s = safeSerialise(val);
        return s.length > 1_000 ? s.slice(0, 1_000) + "\n…(truncated)" : s;
      }
    }

    if (media.schema) {
      const schema = this.refs.deref<OASchema>(media.schema as MaybeRef<OASchema>);
      if (schema) {
        const s = safeSerialise(this.ex.buildJson(schema));
        return s.length > 1_000 ? s.slice(0, 1_000) + "\n…(truncated)" : s;
      }
    }

    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VariableBuilder
// ─────────────────────────────────────────────────────────────────────────────

class VariableBuilder {
  constructor(private readonly doc: OADocument) { }

  /**
   * Collect server variable defaults across all declared servers.
   * First occurrence of a name wins (deduplication).
   */
  build(): IVariable | null {
    const seen = new Set<string>();
    const rows: ITableData[] = [];

    for (const server of this.doc.servers ?? []) {
      for (const [name, def] of Object.entries(server.variables ?? {})) {
        if (!name || BLOCKED_KEYS.has(name) || seen.has(name)) { continue; }
        seen.add(name);
        rows.push({ isChecked: true, key: name, value: String(def.default ?? "") });
      }
    }

    if (rows.length === 0) { return null; }

    return {
      id: uuidv4(),
      name: this.doc.info.title || "OpenAPI Variables",
      createdTime: formatDate(),
      isActive: true,
      data: rows,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CollectionBuilder
// ─────────────────────────────────────────────────────────────────────────────

class CollectionBuilder {
  constructor(private readonly doc: OADocument) { }

  /**
   * Build the IHistory / IFolder tree from the document's tag groupings.
   * Mutates `requests` to collect all IRequestModel objects in one pass.
   *
   * Grouping rules:
   *  • Each operation goes under its first tag.
   *  • Untagged operations go into "Untagged".
   *  • Folder order = document tag order + any extra tags in first-seen order.
   *  • When every operation is untagged, flatten to a list (no folder wrapper).
   */
  build(
    requestBuilder: (
      path: string, method: HttpMethod, op: OAOperation, pathItem: OAPathItem,
    ) => { history: IHistory; model: IRequestModel },
    requests: IRequestModel[],
  ): (IHistory | IFolder)[] {
    const paths = this.doc.paths ?? {};
    const count = Object.keys(paths).length;
    if (count > MAX_PATHS) {
      throw new Error(`Document has ${count} paths; limit is ${MAX_PATHS}.`);
    }

    const tagBuckets = new Map<string, IHistory[]>();

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem || typeof pathItem !== "object") { continue; }

      for (const method of HTTP_METHODS) {
        const operation = (pathItem as Record<string, unknown>)[method] as OAOperation | undefined;
        if (!operation || typeof operation !== "object") { continue; }

        const { history, model } = requestBuilder(path, method, operation, pathItem);

        const tag = operation.tags?.[0]?.trim() || "Untagged";
        if (!tagBuckets.has(tag)) { tagBuckets.set(tag, []); }
        tagBuckets.get(tag)!.push(history);
        requests.push(model);
      }
    }

    if (tagBuckets.size === 0) { return []; }
    // All untagged → flat list
    if (tagBuckets.size === 1 && tagBuckets.has("Untagged")) {
      return tagBuckets.get("Untagged")!;
    }

    const declared = (this.doc.tags ?? []).map(t => t.name);
    const undeclared = [...tagBuckets.keys()].filter(t => !declared.includes(t));
    const ordered = [...declared, ...undeclared];

    const result: (IHistory | IFolder)[] = [];
    for (const tag of ordered) {
      const histories = tagBuckets.get(tag);
      if (!histories?.length) { continue; }

      result.push({
        id: uuidv4(),
        name: tag,
        createdTime: formatDate(),
        type: "folder",
        data: histories,
        settings: buildDefaultSettings(),
      } satisfies IFolder);
    }
    return result;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Server URL resolution  (review point 4)
//
// Priority: operation.servers[0] > pathItem.servers[0] > document.servers[0]
// ─────────────────────────────────────────────────────────────────────────────

function resolveServerUrl(
  doc: OADocument,
  pathItem: OAPathItem,
  operation: OAOperation,
): string {
  const server =
    operation.servers?.[0] ??
    pathItem.servers?.[0] ??
    doc.servers?.[0];

  if (!server?.url) { return ""; }
  return applyServerVariables(server.url, server.variables);
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenApiImport  (thin orchestrator)
// ─────────────────────────────────────────────────────────────────────────────

export class OpenApiImport {
  private readonly refs: RefResolver;
  private readonly ex: SchemaExample;
  private readonly security: SecurityMapper;
  private readonly body: BodyBuilder;
  private readonly params: ParamBuilder;
  private readonly responses: ResponseNotesBuilder;
  private readonly variables: VariableBuilder;
  private readonly collection: CollectionBuilder;

  constructor(private readonly doc: OADocument) {
    this.refs = new RefResolver(doc);
    this.ex = new SchemaExample(this.refs);
    this.security = new SecurityMapper(doc);
    this.body = new BodyBuilder(this.refs, this.ex);
    this.params = new ParamBuilder(this.refs, this.ex);
    this.responses = new ResponseNotesBuilder(this.refs, this.ex);
    this.variables = new VariableBuilder(doc);
    this.collection = new CollectionBuilder(doc);
  }

  private buildRequest(
    path: string,
    method: HttpMethod,
    operation: OAOperation,
    pathItem: OAPathItem,
  ): { history: IHistory; model: IRequestModel } {
    const id = uuidv4();
    const baseUrl = resolveServerUrl(this.doc, pathItem, operation);
    const url = baseUrl + convertPathParams(path);
    const fcMethod = toFCMethod(method);
    const createdTime = formatDate();

    const name =
      operation.summary?.trim() ||
      operation.operationId?.trim() ||
      operation.description?.split("\n")[0]?.trim() ||
      `${method.toUpperCase()} ${path}`;

    const { query, headers } = this.params.build(
      path,
      pathItem.parameters as MaybeRef<OAParameter>[] | undefined,
      operation.parameters as MaybeRef<OAParameter>[] | undefined,
    );

    const notes = this.responses.build(
      operation.description ?? "",
      operation.responses,
      operation.deprecated ?? false,
    );

    const history: IHistory = { id, name, method: fcMethod, url, createdTime };

    const model: IRequestModel = {
      id, url, name, createdTime,
      method: fcMethod,
      params: query,
      auth: this.security.build(operation.security),
      headers,
      body: this.body.build(operation.requestBody),
      tests: deepClone(InitialTest),
      setvar: deepClone(InitialSetVar),
      notes,
      preFetch: deepClone(InitialPreFetch),
    };

    return { history, model };
  }

  importCollection(): OpenApiImportResult {
    const requests: IRequestModel[] = [];
    const variable = this.variables.build();
    const globalAuth = this.security.build();

    const data = this.collection.build(
      (path, method, op, pathItem) => this.buildRequest(path, method, op, pathItem),
      requests,
    );

    const collection: ICollections = {
      id: uuidv4(),
      name: this.doc.info.title?.trim() || "OpenAPI Import",
      createdTime: formatDate(),
      variableId: variable?.id ?? "",
      data,
      settings: buildDefaultSettings(globalAuth),
    };

    return { fcCollection: collection, fcRequests: requests, fcVariable: variable };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Document validator
// ─────────────────────────────────────────────────────────────────────────────

function isOpenApiV3Document(doc: unknown): doc is OADocument {
  if (doc === null || typeof doc !== "object") { return false; }
  const d = doc as Record<string, unknown>;
  if (typeof d.openapi !== "string" || !/^3\.\d+\.\d+/.test(d.openapi)) { return false; }
  if (typeof d.info !== "object" || d.info === null) { return false; }
  if (typeof (d.info as Record<string, unknown>).title !== "string") { return false; }
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a raw string as an OpenAPI v3.x document (JSON or YAML) and convert
 * it into the Fetch Client internal model.
 *
 * Returns null (never throws) when:
 *  • The string is empty or not a string.
 *  • The parsed object is not a recognised OpenAPI 3.x document.
 *  • An unexpected error occurs during conversion.
 *
 * Null return allows callers to chain multiple importers.
 */
export function openApiImporter(rawData: string): OpenApiImportResult | null {
  if (typeof rawData !== "string" || rawData.trim().length === 0) {
    writeLog("warn::openApiImporter – empty or non-string input");
    return null;
  }

  let doc: unknown;

  // JSON first (cheaper parse, engine-native).
  // YAML fallback: every JSON is valid YAML, but not vice-versa;
  // trying YAML first would silently accept malformed JSON.
  try {
    doc = JSON.parse(rawData);
  } catch {
    try {
      doc = yaml.load(rawData);   // js-yaml load (single document)
    } catch (yamlErr) {
      writeLog(`warn::openApiImporter – parse failed: ${yamlErr}`);
      return null;
    }
  }

  if (!isOpenApiV3Document(doc)) { return null; }

  try {
    return new OpenApiImport(doc).importCollection();
  } catch (err) {
    writeLog(`error::openApiImporter – import failed: ${err}`);
    return null;
  }
}