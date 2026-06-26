import { InitialPreFetch } from "../../../../consts/initialValues.consts";
import { IAuth, IOAuth, ClientAuth, GrantType } from "../../../../types/auth.types";
import { ITableData } from "../../../../types/common.types";
import {
  OpenAPIV3Document,
  OpenAPIV3Operation,
  OpenAPIV3Parameter,
  OpenAPIV3RequestBody,
  OpenAPIV3MediaType,
  OpenAPIV3SecurityScheme,
  OpenAPIV3Reference,
  HttpMethod,
  HTTP_METHODS,
} from "../../../../types/openApi.v3.types";
import { IBodyData, IRequestModel, MethodType } from "../../../../types/request.types";
import { IRawData } from "../../../../types/requestBody.types";
import { deepClone } from "../../../common.helper";
import { isRef, resolveRef, generateExampleFromSchema } from "./openApiParser";
import { v4 as uuidv4 } from 'uuid';


const EMPTY_TABLE_ROW: ITableData = { isChecked: false, key: "", value: "" };

// ─── Auth conversion ──────────────────────────────────────────────────────────

function buildDefaultAuth(): IAuth {
  return {
    authType: "none",
    userName: "",
    password: "",
    addTo: "header",
    showPwd: false,
    tokenPrefix: "Bearer",
  };
}

/**
 * Resolve the effective security requirements for an operation.
 * Operation-level security overrides global security.
 * An empty array `[]` explicitly disables auth.
 */
function resolveSecurityRequirements(
  operation: OpenAPIV3Operation,
  doc: OpenAPIV3Document
): Array<Record<string, string[]>> {
  // Operation-level override (even empty array is explicit)
  if (operation.security !== undefined) { return operation.security; }
  // Global
  if (doc.security !== undefined) { return doc.security; }
  return [];
}

function convertSecurityScheme(
  scheme: OpenAPIV3SecurityScheme,
  scopes: string[]
): IAuth {
  const auth = buildDefaultAuth();

  switch (scheme.type) {
    case "http":
      if (scheme.scheme?.toLowerCase() === "basic") {
        auth.authType = "basic";
      } else if (scheme.scheme?.toLowerCase() === "bearer") {
        auth.authType = "bearer";
        auth.tokenPrefix = scheme.bearerFormat ? `Bearer` : "Bearer";
      } else if (scheme.scheme?.toLowerCase() === "digest") {
        auth.authType = "digest";
      } else {
        auth.authType = "bearer";
      }
      break;

    case "apiKey":
      auth.authType = "apiKey";
      auth.addTo = scheme.in === "query" ? "query" : scheme.in === "cookie" ? "cookie" : "header";
      // The actual key name is stored as userName for later rendering
      auth.userName = scheme.name ?? "";
      break;

    case "oauth2": {
      auth.authType = "oauth2";
      const flows = scheme.flows ?? {};
      const oauthBase: IOAuth = {
        clientAuth: ClientAuth.Header,
        clientId: "",
        clientSecret: "",
        grantType: GrantType.Client_Crd,
        scope: scopes.join(" "),
        tokenName: "access_token",
        tokenUrl: "",
        advancedOpt: { audience: "", resource: "" },
      };

      if (flows.password) {
        oauthBase.grantType = GrantType.PWD_Crd;
        oauthBase.tokenUrl = flows.password.tokenUrl ?? "";
        oauthBase.username = "";
        oauthBase.password = "";
      } else if (flows.clientCredentials) {
        oauthBase.grantType = GrantType.Client_Crd;
        oauthBase.tokenUrl = flows.clientCredentials.tokenUrl ?? "";
      } else if (flows.authorizationCode) {
        oauthBase.grantType = GrantType.Client_Crd; // closest mapping
        oauthBase.tokenUrl = flows.authorizationCode.tokenUrl ?? "";
      } else if (flows.implicit) {
        oauthBase.grantType = GrantType.Client_Crd;
        oauthBase.tokenUrl = flows.implicit.authorizationUrl ?? "";
      }

      auth.oauth = oauthBase;
      break;
    }

    case "openIdConnect":
      // Map to bearer; the OIDC discovery URL becomes tokenPrefix hint
      auth.authType = "bearer";
      auth.tokenPrefix = "Bearer";
      break;

    default:
      auth.authType = "none";
  }

  return auth;
}

/**
 * Pick the best auth from the first security requirement that resolves to a
 * known scheme. Falls back to `none`.
 */
function resolveAuth(
  operation: OpenAPIV3Operation,
  doc: OpenAPIV3Document
): IAuth {
  const requirements = resolveSecurityRequirements(operation, doc);
  const schemes = doc.components?.securitySchemes ?? {};

  for (const req of requirements) {
    for (const [schemeName, scopes] of Object.entries(req)) {
      const raw = schemes[schemeName];
      if (!raw) { continue; }
      const scheme: OpenAPIV3SecurityScheme = isRef(raw)
        ? (resolveRef<OpenAPIV3SecurityScheme>((raw as OpenAPIV3Reference).$ref, doc) ?? ({} as any))
        : (raw as OpenAPIV3SecurityScheme);
      return convertSecurityScheme(scheme, scopes);
    }
  }

  return buildDefaultAuth();
}

// ─── Parameter conversion ─────────────────────────────────────────────────────

function resolveParameter(
  paramOrRef: OpenAPIV3Parameter | OpenAPIV3Reference,
  doc: OpenAPIV3Document
): OpenAPIV3Parameter | null {
  if (isRef(paramOrRef)) {
    return resolveRef<OpenAPIV3Parameter>((paramOrRef as OpenAPIV3Reference).$ref, doc);
  }
  return paramOrRef as OpenAPIV3Parameter;
}

function paramToTableData(param: OpenAPIV3Parameter, doc: OpenAPIV3Document): ITableData {
  // Determine a sensible default value
  let value = "";
  if (param.example !== undefined) {
    value = String(param.example);
  } else if (param.schema) {
    const schema = isRef(param.schema)
      ? resolveRef<any>((param.schema as any).$ref, doc)
      : param.schema;
    if (schema?.example !== undefined) { value = String(schema.example); }
    else if (schema?.default !== undefined) { value = String(schema.default); }
    else if (schema?.enum?.[0] !== undefined) { value = String(schema.enum[0]); }
    else {
      switch (schema?.type) {
        case "integer":
        case "number":
          value = "0";
          break;
        case "boolean":
          value = "false";
          break;
        default:
          value = "";
      }
    }
  }

  return {
    key: param.name,
    value,
    isChecked: param.required ?? false,
    isFixed: false,
    type: param.schema
      ? (isRef(param.schema) ? "string" : (param.schema as any).type ?? "string")
      : "string",
  };
}

function convertParameters(
  pathParams: Array<OpenAPIV3Parameter | OpenAPIV3Reference> | undefined,
  opParams: Array<OpenAPIV3Parameter | OpenAPIV3Reference> | undefined,
  doc: OpenAPIV3Document
): { queryParams: ITableData[]; headers: ITableData[] } {
  // Merge: operation params override path params with the same name+in
  const merged = new Map<string, OpenAPIV3Parameter>();

  const addParams = (list: Array<OpenAPIV3Parameter | OpenAPIV3Reference> | undefined) => {
    for (const raw of list ?? []) {
      const p = resolveParameter(raw, doc);
      if (!p) { continue; }
      const key = `${p.in}::${p.name}`;
      merged.set(key, p);
    }
  };

  addParams(pathParams);
  addParams(opParams);

  const queryParams: ITableData[] = [];
  const headers: ITableData[] = [];

  for (const param of merged.values()) {
    switch (param.in) {
      case "query":
        queryParams.push(paramToTableData(param, doc));
        break;
      case "header":
        // Skip standard headers that are managed automatically
        if (!["authorization", "content-type", "accept"].includes(param.name.toLowerCase())) {
          headers.push(paramToTableData(param, doc));
        }
        break;
      case "path":
        // Path params are kept in the URL template as {name}; also stored as
        // query params so the user can see and edit them in the params panel.
        queryParams.push({
          ...paramToTableData(param, doc),
          isFixed: true, // mark path params so the UI can render them specially
          type: "path",
        });
        break;
      case "cookie":
        // Represent cookies as a header for simplicity
        headers.push({
          key: "Cookie",
          value: `${param.name}=${paramToTableData(param, doc).value}`,
          isChecked: param.required ?? false,
        });
        break;
    }
  }

  return { queryParams, headers };
}

// ─── Body conversion ──────────────────────────────────────────────────────────

const CONTENT_TYPE_PRIORITY = [
  "application/json",
  "application/xml",
  "text/xml",
  "text/plain",
  "text/html",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "application/octet-stream",
  "image/*",
  "application/*",
  "*/*",
];

function pickContentType(contentKeys: string[]): string | undefined {
  for (const preferred of CONTENT_TYPE_PRIORITY) {
    const found = contentKeys.find((k) =>
      preferred.endsWith("*")
        ? k.startsWith(preferred.slice(0, -2))
        : k === preferred
    );
    if (found) { return found; }
  }
  return contentKeys[0];
}

function schemaToFormData(
  schema: any,
  doc: OpenAPIV3Document,
  mediaType: OpenAPIV3MediaType
): ITableData[] {
  const rows: ITableData[] = [];

  if (mediaType.example && typeof mediaType.example === "object") {
    for (const [key, val] of Object.entries(mediaType.example as Record<string, unknown>)) {
      rows.push({ key, value: String(val ?? ""), isChecked: true });
    }
    return rows;
  }

  const resolved = isRef(schema) ? resolveRef<any>((schema as any).$ref, doc) : schema;
  if (!resolved?.properties) { return rows; }

  const required = new Set<string>(resolved.required ?? []);
  for (const [key, prop] of Object.entries<any>(resolved.properties)) {
    const example = generateExampleFromSchema(prop, doc);
    rows.push({
      key,
      value: example !== null && example !== undefined ? String(example) : "",
      isChecked: required.has(key),
      type: prop.type ?? "text",
    });
  }
  return rows;
}

function convertRequestBody(
  requestBodyOrRef: OpenAPIV3RequestBody | OpenAPIV3Reference | undefined,
  doc: OpenAPIV3Document
): { body: IBodyData; contentTypeHeader?: ITableData } {
  const emptyBody: IBodyData = { bodyType: "none" };
  if (!requestBodyOrRef) { return { body: emptyBody }; }

  const requestBody: OpenAPIV3RequestBody = isRef(requestBodyOrRef)
    ? (resolveRef<OpenAPIV3RequestBody>((requestBodyOrRef as OpenAPIV3Reference).$ref, doc) ?? { content: {} })
    : (requestBodyOrRef as OpenAPIV3RequestBody);

  const contentTypes = Object.keys(requestBody.content ?? {});
  if (contentTypes.length === 0) { return { body: emptyBody }; }

  const selectedContentType = pickContentType(contentTypes)!;
  const mediaType = requestBody.content[selectedContentType];

  const contentTypeHeader: ITableData = {
    key: "Content-Type",
    value: selectedContentType,
    isChecked: true,
    isFixed: false,
  };

  const ct = selectedContentType.toLowerCase();

  // ── GraphQL ──────────────────────────────────────────────────────────────
  if (ct.includes("graphql")) {
    return {
      body: {
        bodyType: "graphql",
        graphql: { query: "", variables: "" },
      },
      contentTypeHeader,
    };
  }

  // ── Form-data (multipart) ─────────────────────────────────────────────────
  if (ct.includes("multipart/form-data")) {
    return {
      body: {
        bodyType: "formdata",
        formdata: schemaToFormData(mediaType.schema, doc, mediaType),
      },
      contentTypeHeader,
    };
  }

  // ── URL-encoded ───────────────────────────────────────────────────────────
  if (ct.includes("application/x-www-form-urlencoded")) {
    return {
      body: {
        bodyType: "urlencoded",
        urlencoded: schemaToFormData(mediaType.schema, doc, mediaType),
      },
      contentTypeHeader,
    };
  }

  // ── Binary / octet-stream ─────────────────────────────────────────────────
  if (ct.includes("octet-stream") || ct.startsWith("image/") || ct.startsWith("video/") || ct.startsWith("audio/")) {
    return {
      body: {
        bodyType: "binary",
        binary: { fileName: "", data: null, contentTypeOption: selectedContentType },
      },
      contentTypeHeader,
    };
  }

  // ── Raw (JSON, XML, text, …) ──────────────────────────────────────────────
  let lang = "text";
  if (ct.includes("json")) { lang = "json"; }
  else if (ct.includes("xml")) { lang = "xml"; }
  else if (ct.includes("html")) { lang = "html"; }
  else if (ct.includes("javascript")) { lang = "javascript"; }

  let rawData = "";
  if (mediaType.example !== undefined) {
    rawData =
      typeof mediaType.example === "string"
        ? mediaType.example
        : JSON.stringify(mediaType.example, null, 2);
  } else if (mediaType.schema) {
    const example = generateExampleFromSchema(
      isRef(mediaType.schema) ? (resolveRef<any>((mediaType.schema as any).$ref, doc) ?? undefined) : mediaType.schema,
      doc
    );
    if (example !== null && example !== undefined) {
      rawData = lang === "json" ? JSON.stringify(example, null, 2) : String(example);
    }
  }

  const raw: IRawData = { data: rawData, lang };

  return {
    body: { bodyType: "raw", raw },
    contentTypeHeader,
  };
}

// ─── URL building ─────────────────────────────────────────────────────────────

function resolveBaseUrl(doc: OpenAPIV3Document): string {
  const server = doc.servers?.[0];
  if (!server) { return ""; }
  let url = server.url;
  // Replace server variables with their defaults
  for (const [varName, varDef] of Object.entries(server.variables ?? {})) {
    url = url.replace(`{${varName}}`, (varDef as any).default);
  }
  // Remove trailing slash
  return url.replace(/\/$/, "");
}

// ─── Main conversion ──────────────────────────────────────────────────────────

export interface ConvertedRequest {
  request: IRequestModel;
  /** Tags from the OpenAPI operation (used for collection grouping) */
  tags: string[];
  /** True if the operation was marked deprecated */
  deprecated: boolean;
  /** The original path string, e.g. "/pets/{petId}" */
  path: string;
  /** HTTP method */
  method: HttpMethod;
  /** operationId if present */
  operationId?: string;
}

export function convertOperation(
  path: string,
  method: HttpMethod,
  operation: OpenAPIV3Operation,
  doc: OpenAPIV3Document
): ConvertedRequest {
  const baseUrl = resolveBaseUrl(doc);
  const url = `${baseUrl}${path}`;

  // Parameters
  const pathItem = doc.paths?.[path] ?? {};
  const { queryParams, headers: paramHeaders } = convertParameters(
    pathItem.parameters,
    operation.parameters,
    doc
  );

  // Body + Content-Type header
  const { body, contentTypeHeader } = convertRequestBody(operation.requestBody, doc);

  // Build final headers list (deduplicated)
  const headers: ITableData[] = [...paramHeaders];
  if (contentTypeHeader) {
    const existing = headers.findIndex((h) => h.key.toLowerCase() === "content-type");
    if (existing === -1) { headers.push(contentTypeHeader); }
    else { headers[existing] = contentTypeHeader; }
  }

  // Auth
  const auth = resolveAuth(operation, doc);

  // Name: prefer summary → operationId → "METHOD /path"
  const name =
    operation.summary?.trim() ||
    operation.operationId?.trim() ||
    `${method.toUpperCase()} ${path}`;

  queryParams.push({ ...EMPTY_TABLE_ROW });
  headers.push({ ...EMPTY_TABLE_ROW });

  const request: IRequestModel = {
    id: uuidv4(),
    url,
    name,
    createdTime: new Date().toISOString(),
    method: method.toUpperCase() as MethodType,
    params: queryParams,
    auth,
    headers,
    body,
    tests: [],
    setvar: [],
    notes: operation.description?.trim() ?? "",
    preFetch: deepClone(InitialPreFetch),
  };

  return {
    request,
    tags: operation.tags ?? [],
    deprecated: operation.deprecated ?? false,
    path,
    method,
    operationId: operation.operationId,
  };
}

export function convertAllOperations(doc: OpenAPIV3Document): ConvertedRequest[] {
  const results: ConvertedRequest[] = [];

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem) { continue; }

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) { continue; }

      try {
        results.push(convertOperation(path, method, operation, doc));
      } catch (err: any) {
        console.warn(`[OpenAPI Import] Failed to convert ${method.toUpperCase()} ${path}: ${err.message}`);
      }
    }
  }

  return results;
}
