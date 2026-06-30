import { deepClone } from "../../common.helper";
import { formatDate } from "../../dateTime.helper";
import { IAuth, GrantType, ClientAuth } from "../../../types/auth.types";
import { ICollections, IVariable, IHistory, IFolder, ISettings } from "../../../types/sidebar.types";
import { InitialBody, InitialTest, InitialSetVar, InitialPreFetch, InitialAuth } from "../../../consts/initialValues.consts";
import { InsomniaResource, InsomniaExport, InsomniaEnvironment, InsomniaHeader, InsomniaParameter, InsomniaAuthentication, InsomniaBody, InsomniaRequest, InsomniaRequestGroup, InsomniaWorkspace, INSOMNIA_EXPORT_FORMAT_4, INSOMNIA_EXPORT_FORMAT_5 } from "../../../types/insomnia.types";
import { IRequestModel, MethodType, IBodyData } from "../../../types/request.types";
import { isJson } from "../../tests.helper";
import { ITableData } from "../../../types/common.types";
import { v4 as uuidv4 } from 'uuid';
import { writeLog } from "../../logger/logger";
import { XMLValidator } from "fast-xml-parser";

export interface InsomniaImportResult {
  fcCollection: ICollections;
  fcRequests: IRequestModel[];
  fcVariables: IVariable | null;
}

// -Internal constants =======================================================

const EMPTY_TABLE_ROW: ITableData = { isChecked: false, key: "", value: "" };

/** Valid HTTP methods accepted by Fetch Client. */
const VALID_METHODS = new Set<string>(["get", "post", "put", "patch", "delete"]);

/** Newline-normalisation regex used when detecting raw body language. */
const NEWLINE_RE = /(?:\r\n|[\r\n])+?/g;

/** Maximum number of resources accepted from a single export (DoS guard). */
const MAX_RESOURCES = 10_000;

/** Maximum folder nesting depth (stack-overflow guard). */
const MAX_DEPTH = 50;

/** Keys that must never be stored as variable names (prototype-pollution guard). */
const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** CRLF characters used to detect header-injection attempts. */
const CRLF_RE = /[\r\n]/g;

// -Helpers ==================================================================

function normaliseMethod(raw: string | undefined): MethodType {
  const lower = (raw ?? "get").toLowerCase().trim();
  return (VALID_METHODS.has(lower) ? lower : "get") as MethodType;
}

/**
 * Normalise Insomnia Nunjucks-style template variables (`{{ var }}`) to
 * Fetch Client style (`{{var}}`) so variables resolve correctly after import.
 */
function normaliseTplVars(input: string): string {
  // Remove internal whitespace: {{ var }} → {{var}}
  return input.replace(/\{\{\s+([^}]+?)\s+\}\}/g, "{{$1}}");
}

/**
 * Strip CR and LF characters from a header name or value to prevent
 * HTTP response-splitting / header-injection attacks.
 */
function sanitiseHeaderPart(input: string): string {
  return input.replace(CRLF_RE, "");
}

// -Main importer class ======================================================

export class InsomniaImport {
  private readonly resources: InsomniaResource[];

  /** O(1) lookup: parentId → children */
  private readonly byParent: Map<string, InsomniaResource[]>;

  constructor(export_: InsomniaExport) {
    const raw = export_.resources ?? [];

    if (raw.length > MAX_RESOURCES) {
      throw new Error(
        `Insomnia export contains ${raw.length} resources, ` +
        `which exceeds the limit of ${MAX_RESOURCES}.`
      );
    }

    this.resources = raw;
    this.byParent = new Map();

    for (const r of this.resources) {
      const pid = r.parentId ?? "__root__";
      const bucket = this.byParent.get(pid) ?? [];
      bucket.push(r);
      this.byParent.set(pid, bucket);
    }
  }

  // -Variables ============================================================

  /**
   * Convert an Insomnia environment (the "Base Environment" of a workspace)
   * into a Fetch Client variable set.
   *
   * Sub-environments (private or named environments that inherit from others)
   * are ignored because they cannot be merged safely without user input.
   */
  private importEnvironment(
    env: InsomniaEnvironment,
    workspaceName: string,
  ): IVariable | null {

    if (!env.data || Object.keys(env.data).length === 0) {
      return null;
    }

    const varData: ITableData[] = Object.entries(env.data)
      // Block empty keys and prototype-pollution keys
      .filter(([key]) => !!key && !BLOCKED_KEYS.has(key))
      .map(([key, value]) => ({
        isChecked: true,
        key,

        // null/undefined → "", strings are normalised; objects are
        // stringified then normalised in case they embed template vars.
        value:
          value === null
            ? ""
            : typeof value === "string"
              ? normaliseTplVars(value)
              : normaliseTplVars(JSON.stringify(value)),
      }));

    if (varData.length === 0) {
      return null;
    }

    // Use the workspace name so the variable set is identifiable
    const variableName =
      env.name === "Base Environment" || !env.name
        ? workspaceName
        : env.name;

    return {
      id: uuidv4(),
      name: variableName,
      createdTime: formatDate(),
      modifiedTime: formatDate(),
      isActive: true,
      data: varData,
    };
  }

  // -Headers ==============================================================

  private getHeaders(
    headers: InsomniaHeader[] | undefined
  ): ITableData[] {

    const result: ITableData[] = (headers ?? [])
      .filter(h => !!h.name)
      .map(h => ({
        isChecked: !h.disabled,

        // Strip CRLF to prevent header-injection attacks
        key: sanitiseHeaderPart(h.name),

        value: sanitiseHeaderPart(
          normaliseTplVars(h.value ?? "")
        ),
      }));

    result.push({
      ...EMPTY_TABLE_ROW
    });

    return result;
  }

  // -Query parameters

  private getParams(params: InsomniaParameter[] | undefined): ITableData[] {
    const result: ITableData[] = (params ?? []).map(p => ({
      isChecked: !p.disabled,
      key: p.name ?? "",
      value: normaliseTplVars(p.value ?? ""),
    }));

    result.push({ ...EMPTY_TABLE_ROW });
    return result;
  }

  // -Authentication

  /**
   * Map Insomnia authentication schemes to Fetch Client's `IAuth` model.
   *
   * Edge cases handled:
   * - `disabled: true` auth blocks -> treated as "noauth"
   * - Unknown/unrecognised types -> treated as "noauth"
   * - Bearer prefix falls back to "Bearer" when absent
   * - OAuth2 grant types that Fetch Client does not support are skipped
   * - AWS uses `accessKeyId` field (Insomnia) mapped to `accessKey` (FC)
   */
  private getAuthDetails(auth?: InsomniaAuthentication | null): IAuth {
    const fcAuth: IAuth = deepClone(InitialAuth);

    if (!auth || auth.disabled || !auth.type || auth.type === "none") {
      return fcAuth; // default: noauth
    }

    const type = auth.type.toLowerCase().trim();

    switch (type) {

      // -HTTP Basic / Digest / NTLM
      case "basic":
      case "digest":
      case "ntlm": {
        fcAuth.userName = auth.username ?? "";
        fcAuth.password = auth.password ?? "";
        fcAuth.authType = "basic";
        return fcAuth;
      }

      // -Bearer token
      case "bearer": {
        fcAuth.password = normaliseTplVars(auth.token ?? "");
        fcAuth.tokenPrefix = (auth.prefix || "Bearer").trim();
        fcAuth.authType = "bearertoken";
        return fcAuth;
      }

      // -API key
      case "apikey": {
        fcAuth.userName = auth.key ?? "";
        fcAuth.password = normaliseTplVars(auth.value ?? "");

        // Insomnia uses "queryParams"; Fetch Client uses "queryparams"
        fcAuth.addTo =
          auth.addTo === "queryParams"
            ? "queryparams"
            : "header";

        fcAuth.authType = "apikey";
        return fcAuth;
      }

      // -OAuth 2
      case "oauth2": {
        const grantType = (auth.grantType ?? "").toLowerCase();

        if (
          grantType !== "client_credentials" &&
          grantType !== "password_credentials" &&
          grantType !== "password"
        ) {
          // Unsupported grant type (e.g. authorisation_code) - skip
          return fcAuth;
        }

        fcAuth.oauth!.grantType =
          grantType === "client_credentials"
            ? GrantType.Client_Crd
            : GrantType.PWD_Crd;

        fcAuth.oauth!.clientId =
          normaliseTplVars(auth.clientId ?? "");

        fcAuth.oauth!.clientSecret =
          normaliseTplVars(auth.clientSecret ?? "");

        fcAuth.oauth!.tokenUrl =
          normaliseTplVars(auth.accessTokenUrl ?? "");

        fcAuth.oauth!.scope =
          normaliseTplVars(auth.scope ?? "");

        fcAuth.oauth!.username =
          normaliseTplVars(auth.username ?? "");

        fcAuth.oauth!.password =
          normaliseTplVars(auth.password ?? "");

        fcAuth.oauth!.clientAuth =
          auth.credentialsInBody
            ? ClientAuth.Body
            : ClientAuth.Header;

        fcAuth.oauth!.advancedOpt.audience =
          normaliseTplVars(auth.audience ?? "");

        fcAuth.oauth!.advancedOpt.resource =
          normaliseTplVars(auth.resource ?? "");

        fcAuth.authType = "oauth2";
        return fcAuth;
      }

      // -AWS Signature v4
      case "aws":
      case "iam":
      case "awsv4": {
        if (!fcAuth.aws) {
          return fcAuth;
        }

        fcAuth.aws.accessKey =
          normaliseTplVars(auth.accessKeyId ?? "");

        fcAuth.aws.secretAccessKey =
          normaliseTplVars(auth.secretAccessKey ?? "");

        fcAuth.aws.region =
          normaliseTplVars(auth.region ?? "");

        fcAuth.aws.service =
          normaliseTplVars(auth.service ?? "");

        fcAuth.aws.sessionToken =
          normaliseTplVars(auth.sessionToken ?? "");

        fcAuth.authType = "aws";
        return fcAuth;
      }

      // -Inherit / unknown
      default:
        return fcAuth;
    }
  }
  // -Request body ------------------------------------------------------------

  private getRawBodyLang(data: string): string {
    const trimmed = data.replace(NEWLINE_RE, "");
    if (isJson(trimmed) === "true") {
      return "json";
    }
    if (XMLValidator.validate(trimmed) === true) {
      return "xml";
    }
    if (this.isHtml(trimmed)) {
      return "html";
    }
    return "text";
  }

  private isHtml(str: string): boolean {
    return !(str || "")
      .replace(/<([^>]+?)([^>]*?)>(.*?)<\/\1/gi, "")
      .replace(/<([^>]+)>/gi, "")
      .trim();
  }

  /**
   * Map an Insomnia body object to Fetch Client's `IBodyData`.
   *
   * mimeType mapping:
   *   multipart/form-data                -> formdata
   *   application/x-www-form-urlencoded  -> formurlencoded
   *   application/graphql                -> graphql
   *   application/octet-stream           -> binary
   *   everything else                    -> raw (lang auto-detected)
   */
  private getBody(body: InsomniaBody | undefined): IBodyData {
    const fcBody: IBodyData = deepClone(InitialBody);

    if (!body || body.mimeType === undefined) {
      return fcBody; // bodyType stays "none"
    }

    // Strip charset and parameter suffixes:
    // "application/json; charset=utf-8" -> "application/json"
    const mime = (body.mimeType ?? "").toLowerCase().split(";")[0].trim();

    switch (mime) {

      // -Multipart form data --------------------------------------------

      case "multipart/form-data": {
        fcBody.bodyType = "formdata";
        fcBody.formdata!.shift(); // remove placeholder row

        for (const p of body.params ?? []) {
          const isFile = (p.type ?? "").toLowerCase() === "file";

          fcBody.formdata!.push({
            isChecked: !p.disabled,
            key: p.name ?? "",
            value: isFile
              ? (p.fileName ?? "")
              : normaliseTplVars(p.value ?? ""),
            type: isFile ? "File" : "Text",
          });
        }

        fcBody.formdata!.push({
          isChecked: false,
          key: "",
          value: "",
          type: "Text",
        });

        return fcBody;
      }

      // -URL-encoded form -----------------------------------------------

      case "application/x-www-form-urlencoded": {
        fcBody.bodyType = "formurlencoded";
        fcBody.urlencoded!.shift();

        for (const p of body.params ?? []) {
          fcBody.urlencoded!.push({
            isChecked: !p.disabled,
            key: p.name ?? "",
            value: normaliseTplVars(p.value ?? ""),
          });
        }

        fcBody.urlencoded!.push({
          ...EMPTY_TABLE_ROW,
        });

        return fcBody;
      }

      // -GraphQL ---------------------------------------------------------

      case "application/graphql":
      case "application/graphql+json":
      case "application/json": {
        // application/json ma be a GraphQL body when the text contains a "query" field
        if (mime === "application/json") {
          try {
            const parsed = JSON.parse(body.text ?? "{}") as Record<string, unknown>;
            if (typeof parsed.query !== "string") {
              const rawData = normaliseTplVars(body.text ?? "");
              fcBody.bodyType = "raw";
              fcBody.raw!.data = rawData;
              fcBody.raw!.lang = this.getRawBodyLang(rawData);
              return fcBody;
            }
          } catch {
            // Invalid JSON - treat as raw
            const rawData = normaliseTplVars(body.text ?? "");
            fcBody.bodyType = "raw";
            fcBody.raw!.data = rawData;
            fcBody.raw!.lang = this.getRawBodyLang(rawData);
            return fcBody;
          }
        }
        fcBody.bodyType = "graphql";

        try {
          const parsed = JSON.parse(body.text ?? "{}") as Record<string, unknown>;

          fcBody.graphql!.query =
            typeof parsed.query === "string"
              ? parsed.query
              : JSON.stringify(parsed.query ?? "");

          fcBody.graphql!.variables =
            typeof parsed.variables === "string"
              ? parsed.variables
              : JSON.stringify(parsed.variables ?? "");
        } catch {
          // text is the raw query string when it is not JSON-wrapped
          fcBody.graphql!.query = body.text ?? "";
          fcBody.graphql!.variables = "";
        }

        return fcBody;
      }

      // -Binary / file upload -------------------------------------------
      case "application/octet-stream":
      case "application/binary": {
        fcBody.bodyType = "binary";
        fcBody.binary!.data = "";
        fcBody.binary!.fileName = body.fileName ?? "";
        fcBody.binary!.contentTypeOption = "manual";

        return fcBody;
      }

      // -Empty body (no content) ----------------------------------------
      case "": {
        return fcBody; // bodyType = "none"
      }

      // -Raw (JSON, XML, HTML, plain text, etc.) ------------------------
      default: {
        const rawData = normaliseTplVars(body.text ?? "");
        fcBody.bodyType = "raw";
        fcBody.raw!.data = rawData;
        fcBody.raw!.lang = this.getRawBodyLang(rawData);

        return fcBody;
      }
    }
  }

  // -Collection-level settings -----------------------------------------------

  /**
   * Build an `ISettings` block for a collection root or folder.
   * Folder-level authentication is mapped; pre-fetch list starts empty.
   */
  private buildSettings(auth?: InsomniaAuthentication | null): ISettings {
    return {
      auth: this.getAuthDetails(auth),
      preFetch: {
        requests: [],
      },
      headers: [
        {
          key: "User-Agent",
          value: "Fetch Client",
          isChecked: true,
        },
        {
          ...EMPTY_TABLE_ROW,
        },
      ],
    };
  }

  // -Request builder —————————————————————————————————————————————

  private buildRequest(resource: InsomniaRequest,): { history: IHistory; model: IRequestModel } {
    const id = uuidv4();
    const url = normaliseTplVars(resource.url ?? "");
    const method = normaliseMethod(resource.method);

    const history: IHistory = {
      id,
      name: resource.name || "Untitled Request",
      method,
      url,
      createdTime: formatDate(),
      modifiedTime: formatDate(),
    };

    const model: IRequestModel = {
      id,
      url,
      name: history.name,
      createdTime: history.createdTime,
      modifiedTime: history.modifiedTime,
      method,
      params: this.getParams(resource.parameters),
      auth: this.getAuthDetails(resource.authentication),
      headers: this.getHeaders(resource.headers),
      body: this.getBody(resource.body),
      tests: deepClone(InitialTest),
      setvar: deepClone(InitialSetVar),
      notes: resource.description ?? "",
      preFetch: deepClone(InitialPreFetch),
    };

    return { history, model };
  }

  // -Tree builder (recursive) —————————————————————————————————————————————

  /**
   * Build the collection data tree from `parentId` down.
   *
   * Children are sorted by `metaSortKey` to preserve the order visible in
   * Insomnia. Unsupported resource types (gRPC, WebSocket, API specs, cookies)
   * are silently skipped so the import remains clean.
   *
   * `visited` tracks processed resource IDs to break cyclic parentId graphs.
   * `depth` enforces a maximum nesting depth to prevent stack overflow.
   */
  private buildTree(
    parentId: string,
    requests: IRequestModel[],
    visited: Set<string> = new Set(),
    depth: number = 0,
  ): (IHistory | IFolder)[] {

    if (depth > MAX_DEPTH) {
      writeLog(
        `warn::insomniaImporter::buildTree() - max depth ${MAX_DEPTH} exceeded, truncating subtree under '${parentId}'.`,
      );
      return [];
    }

    const children = [...(this.byParent.get(parentId) ?? [])];

    // Preserve Insomnia sort order
    children.sort((a, b) => {
      const ak = (a as InsomniaRequest).metaSortKey ?? 0;
      const bk = (b as InsomniaRequest).metaSortKey ?? 0;
      return ak - bk;
    });

    const result: (IHistory | IFolder)[] = [];

    for (const child of children) {

      // Cycle guard: skip any resource whose ID we've already processed
      if (visited.has(child._id)) {
        writeLog(
          `warn::insomniaImporter::buildTree() - cyclic reference detected for resource '${child._id}', skipping.`,
        );
        continue;
      }

      visited.add(child._id);

      switch (child._type) {
        case "request": {
          const { history, model } = this.buildRequest(child as InsomniaRequest);
          requests.push(model);
          result.push(history);
          break;
        }

        case "request_group": {
          const group = child as InsomniaRequestGroup;

          const folder: IFolder = {
            id: uuidv4(),
            name: group.name || "Folder",
            createdTime: formatDate(),
            modifiedTime: formatDate(),
            type: "folder",
            data: this.buildTree(group._id, requests, visited, depth + 1),
            settings: this.buildSettings(group.authentication),
          };

          result.push(folder);
          break;
        }

        // Intentionally skip: grpc_request, websocket_request, api_spec,
        // cookie_jar, environment (handled separately)
        default:
          break;
      }
    }

    return result;
  }

  // -Workspace resolver —————————————————————————————————————————————

  /**
   * Resolve the primary workspace to import.
   *
   * Priority:
   * 1. First workspace with scope === "collection"
   * 2. First workspace with no scope (legacy exports)
   * 3. Any workspace present in the file
   */
  private resolveWorkspace(): InsomniaWorkspace {

    const workspaces = this.resources.filter(
      (r): r is InsomniaWorkspace => r._type === "workspace",
    );

    if (workspaces.length === 0) {
      throw new Error("No workspace resource found in Insomnia export.");
    }

    return (
      workspaces.find(w => w.scope === "collection") ??
      workspaces.find(w => !w.scope) ??
      workspaces[0]
    );
  }

  /**
    * Locate the base environment for the given workspace.
    *
    * Insomnia always creates a "Base Environment" directly under the workspace.
    * Sub-environments (those whose `parentId` points to another environment)
    * are ignored to avoid duplicated or conflicting variable entries.
    */
  private resolveBaseEnvironment(workspaceId: string,): InsomniaEnvironment | undefined {
    const directEnvs = (this.byParent.get(workspaceId) ?? []).filter(
      (r): r is InsomniaEnvironment => r._type === "environment",
    );

    // The base environment is the one not marked private and typically named
    // "Base Environment"; fall back to the first environment found.
    return (
      directEnvs.find(e => !e.isPrivate) ??
      directEnvs[0]
    );
  }

  // ── Public entry point ─────────────────────────────────────────────

  importCollection(): InsomniaImportResult {
    const workspace = this.resolveWorkspace();
    const requests: IRequestModel[] = [];
    const data = this.buildTree(workspace._id, requests);

    const baseEnv = this.resolveBaseEnvironment(workspace._id);
    const variable = baseEnv
      ? this.importEnvironment(baseEnv, workspace.name)
      : null;

    const collection: ICollections = {
      id: uuidv4(),
      name: workspace.name || "Insomnia Import",
      createdTime: formatDate(),
      modifiedTime: formatDate(),
      variableId: variable?.id ?? "",
      data,
      settings: this.buildSettings(),
    };

    return {
      fcCollection: collection,
      fcRequests: requests,
      fcVariables: variable
    };
  }
}

// ── Standalone entry function ────────────────────────────────────────

/**
 * Parse a raw JSON string as an Insomnia v4 or v5 export and convert it into
 * Fetch Client's internal model.
 *
 * Returns `null` when the data is not a recognised Insomnia export so callers
 * can try the next importer without throwing.
 */
export const insomniaImporter = (rawData: string): InsomniaImportResult | null => {
  try {
    const export_ = JSON.parse(rawData) as InsomniaExport;
    const fmt = Number(export_?.__export_format);

    if (
      export_?._type === "export" &&
      (fmt === INSOMNIA_EXPORT_FORMAT_4 || fmt === INSOMNIA_EXPORT_FORMAT_5)
    ) {
      return new InsomniaImport(export_).importCollection();
    }
  } catch (err) {
    writeLog("error::insomniaImporter(): - Error Message : " + err);
  }

  return null;
};