import { buildHistoryEntry } from "./utils";
import { formatDate } from "../../dateTime.helper";
import { IAuth, IAwsAuth, IAdvancedOAuth, IOAuth, ClientAuth, GrantType } from "../../../types/auth.types";
import { ICollections, IFolder, ISettings, IVariable } from "../../../types/sidebar.types";
import { IExportRequest, IExportFolder, IExportCollectionSettings, IExportFolderDefaults, IExportAuth, IExportBody, IExportKeyValue, IExportAssertion, IExportVariableExtractor, IExportPreRunRequest, AssertionSource, IFetchClientExportV2 } from "../../../types/fetchClient_2_0_types";
import { IImportResult } from "./fetchClientImporter_1_0";
import { IRequestModel, IBodyData } from "../../../types/request.types";
import { ITableData } from "../../../types/common.types";
import { ITest, ISetVar, IPreFetch, IRunRequest } from "../../../types/prefetch.types";
import { v4 as uuidv4 } from "uuid";
import { writeLog } from "../../logger/logger";

/**
 * Returns true when the parsed JSON is a valid Fetch Client v2 export.
 * Gate on `schemaVersion === 2` — that is the single authoritative signal.
 */
export function isFetchClientV2(parsed: unknown): parsed is IFetchClientExportV2 {
  if (typeof parsed !== "object" || parsed === null) {
    return false;
  }
  const obj = parsed as Record<string, unknown>;
  return (
    obj.schemaVersion === 2 &&
    typeof obj.metadata === "object" &&
    Array.isArray(obj.items)
  );
}

/**
 * Converts a parsed Fetch Client v2 export into the internal collection and requests
 */
export function fetchClientV2Importer(
  parsed: IFetchClientExportV2
): IImportResult | null {
  try {
    const reqData: IRequestModel[] = [];

    // Build an id-lookup so we can resolve parentId references in O(1)
    const itemMap = new Map(parsed.items.map((item) => [item.id, item]));

    // Separate root-level items (no parentId), sorted by order
    const rootItems = parsed.items
      .filter((item) => item.parentId === undefined)
      .sort((a, b) => a.order - b.order);

    const colData: ICollections = {
      id: uuidv4(),
      name: parsed.metadata.name,
      createdTime: formatDate(),
      variableId: "",
      data: [],
      settings: mapCollectionSettings(parsed.settings),
    };

    for (const item of rootItems) {
      if (item.type === "folder") {
        colData.data!.push(
          importV2Folder(item, itemMap, reqData)
        );
      } else {
        const id = uuidv4();
        const model = mapRequest(item as IExportRequest, id);
        reqData.push(model);
        colData.data!.push(buildHistoryEntry(id, model));
      }
    }

    let variable: IVariable;

    if (parsed.variables) {
      const newVariableId = uuidv4();
      variable = {
        id: newVariableId,
        name: parsed.variables.name,
        createdTime: formatDate(),
        isActive: true,
        data: []
      };
      for (const item of parsed.variables.items) {
        variable.data.push({
          key: item.key,
          value: item.value,
          isChecked: true
        });
      }
      colData.variableId = newVariableId;
    }

    return { fcCollection: colData, fcRequests: reqData, fcVariables: parsed.variables ? variable : null };
  } catch (err) {
    writeLog(
      `error::fetchClientV2Importer() - ${err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Folder importer  (recursive)
// ─────────────────────────────────────────────────────────────────────────────

function importV2Folder(
  exportFolder: IExportFolder,
  itemMap: Map<string, IExportFolder | IExportRequest>,
  reqData: IRequestModel[]
): IFolder {
  const folder: IFolder = {
    id: uuidv4(),
    name: exportFolder.name,
    createdTime: formatDate(),
    type: "folder",
    data: [],
    settings: mapFolderDefaults(exportFolder.defaults),
  };

  // Find direct children of this folder, sorted by order
  const children = [...itemMap.values()]
    .filter((item) => item.parentId === exportFolder.id)
    .sort((a, b) => a.order - b.order);

  for (const child of children) {
    if (child.type === "folder") {
      folder.data!.push(importV2Folder(child, itemMap, reqData));
    } else {
      const id = uuidv4();
      const model = mapRequest(child as IExportRequest, id);
      reqData.push(model);
      folder.data!.push(buildHistoryEntry(id, model));
    }
  }

  return folder;
}

// ─────────────────────────────────────────────────────────────────────────────
// IExportRequest → IRequestModel
// ─────────────────────────────────────────────────────────────────────────────

function mapRequest(req: IExportRequest, newId: string): IRequestModel {
  return {
    id: newId,
    name: req.name,
    url: req.url,
    createdTime: formatDate(),
    method: req.method.toLowerCase() as IRequestModel["method"],
    params: mapKeyValues(req.queryParams),
    headers: mapKeyValues(req.headers),
    auth: mapAuth(req.auth),
    body: mapBody(req.body),
    tests: mapAssertions(req.assertions),
    setvar: mapVariableExtractors(req.variableExtractors),
    preFetch: mapPreRunRequests(req.preRunRequests),
    notes: req.notes ?? "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings mappers
// ─────────────────────────────────────────────────────────────────────────────

function mapCollectionSettings(
  settings: IExportCollectionSettings
): ISettings {
  return {
    auth: mapAuth(settings.auth),
    headers: mapKeyValues(settings.headers),
    preFetch: mapPreRunRequests(settings.preRunRequests),
  };
}

function mapFolderDefaults(defaults: IExportFolderDefaults): ISettings {
  return {
    auth: mapAuth(defaults.auth),
    headers: mapKeyValues(defaults.headers),
    preFetch: mapPreRunRequests(defaults.preRunRequests),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth mapper  IExportAuth → IAuth
// ─────────────────────────────────────────────────────────────────────────────

function mapAuth(exportAuth: IExportAuth): IAuth {
  // Base scaffold — fields not relevant to a given authType stay as empty strings
  const base: IAuth = {
    authType: exportAuth.type,
    userName: "",
    password: "",
    addTo: "queryparams",
    showPwd: false,
    tokenPrefix: "Bearer",
  };

  switch (exportAuth.type) {
    case "noauth":
    case "inherit":
      return base;

    case "basic":
      return {
        ...base,
        userName: exportAuth.credentials.username,
        password: exportAuth.credentials.password,
      };

    case "bearertoken":
      return {
        ...base,
        password: exportAuth.credentials.token,
        tokenPrefix: exportAuth.credentials.prefix,
      };

    case "apikey":
      return {
        ...base,
        userName: exportAuth.credentials.key,
        password: exportAuth.credentials.value,
        addTo: exportAuth.credentials.addTo,
      };

    case "aws": {
      const aws: IAwsAuth = {
        service: exportAuth.credentials.service,
        region: exportAuth.credentials.region,
        accessKey: exportAuth.credentials.accessKey,
        secretAccessKey: exportAuth.credentials.secretAccessKey,
        sessionToken: exportAuth.credentials.sessionToken ?? "",
      };
      return { ...base, aws };
    }

    case "oauth2": {
      const creds = exportAuth.credentials;
      const advanced: IAdvancedOAuth = {
        audience: creds.advanced?.audience ?? "",
        resource: creds.advanced?.resource ?? "",
      };
      const oauth: IOAuth = {
        clientAuth: creds.clientAuth as ClientAuth,
        clientId: creds.clientId,
        clientSecret: creds.clientSecret,
        grantType: creds.grantType as GrantType,
        scope: creds.scope,
        tokenName: creds.tokenName,
        tokenUrl: creds.tokenUrl,
        username: creds.username ?? "",
        password: creds.password ?? "",
        advancedOpt: advanced,
      };
      return { ...base, oauth };
    }

    default:
      return base;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Body mapper  IExportBody → IBodyData
// ─────────────────────────────────────────────────────────────────────────────

/** Empty scaffold — ensures all optional body sub-fields are always present */
function emptyBodyScaffold(): IBodyData {
  return {
    bodyType: "none",
    formdata: [{ key: "", value: "", isChecked: false }],
    urlencoded: [{ key: "", value: "", isChecked: false }],
    raw: { data: "", lang: "json" },
    binary: { fileName: "", data: {}, contentTypeOption: "manual" },
    graphql: { query: "", variables: "" },
  };
}

function mapBody(exportBody: IExportBody): IBodyData {
  const scaffold = emptyBodyScaffold();

  switch (exportBody.type) {
    case "none":
      return { ...scaffold, bodyType: "none" };

    case "formdata":
      return {
        ...scaffold,
        bodyType: "formdata",
        formdata: mapKeyValues(exportBody.fields),
      };

    case "formurlencoded":
      return {
        ...scaffold,
        bodyType: "formurlencoded",
        urlencoded: mapKeyValues(exportBody.fields),
      };

    case "raw":
      return {
        ...scaffold,
        bodyType: "raw",
        raw: { data: exportBody.content, lang: exportBody.language },
      };

    case "binary":
      return {
        ...scaffold,
        bodyType: "binary",
        binary: {
          fileName: exportBody.fileName,
          data: {},
          contentTypeOption: exportBody.contentTypeOption,
        },
      };

    case "graphql":
      return {
        ...scaffold,
        bodyType: "graphql",
        graphql: {
          query: exportBody.query,
          variables: exportBody.variables,
        },
      };

    default:
      return scaffold;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Key-value mapper  IExportKeyValue[] → ITableData[]
// ─────────────────────────────────────────────────────────────────────────────

function mapKeyValues(rows: IExportKeyValue[] | undefined): ITableData[] {
  if (!rows?.length) {
    return [{ key: "", value: "", isChecked: false }];
  }
  const mapped: ITableData[] = rows.map((r) => ({
    key: r.key,
    value: r.value,
    isChecked: r.enabled,
  }));
  // Always append the empty placeholder row the UI expects
  mapped.push({ key: "", value: "", isChecked: false });
  return mapped;
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertion mapper  IExportAssertion[] → ITest[]
// ─────────────────────────────────────────────────────────────────────────────

function mapAssertions(
  assertions: IExportAssertion[] | undefined
): ITest[] {
  if (!assertions?.length) {
    return [{ parameter: "", action: "", expectedValue: "" }];
  }

  const mapped: ITest[] = assertions.map((a) => {
    const { parameter, customParameter } = resolveParameter(a.source, a.path);
    return {
      parameter,
      action: a.action,
      expectedValue: a.expectedValue,
      ...(customParameter !== undefined && { customParameter }),
    };
  });

  mapped.push({ parameter: "", action: "", expectedValue: "" });
  return mapped;
}

// ─────────────────────────────────────────────────────────────────────────────
// Variable extractor mapper  IExportVariableExtractor[] → ISetVar[]
// ─────────────────────────────────────────────────────────────────────────────

function mapVariableExtractors(
  extractors: IExportVariableExtractor[] | undefined
): ISetVar[] {
  if (!extractors?.length) {
    return [{ parameter: "", key: "", variableName: "" }];
  }

  const mapped: ISetVar[] = extractors.map((e) => {
    const { parameter, customParameter } = resolveParameter(e.source, e.path);
    return {
      parameter,
      key: customParameter ?? "",
      variableName: e.variableName,
    };
  });

  mapped.push({ parameter: "", key: "", variableName: "" });
  return mapped;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-run requests mapper  IExportPreRunRequest[] → IPreFetch
// ─────────────────────────────────────────────────────────────────────────────

function mapPreRunRequests(
  preRunRequests: IExportPreRunRequest[] | undefined
): IPreFetch {
  if (!preRunRequests?.length) {
    return { requests: [] };
  }

  const requests: IRunRequest[] = preRunRequests.map((r) => {
    const condition: ITest[] = r.condition
      ? (() => {
        const { parameter, customParameter } = resolveParameter(
          r.condition.source,
          r.condition.path
        );
        return [
          {
            parameter,
            action: r.condition.action,
            expectedValue: r.condition.expectedValue,
            ...(customParameter !== undefined && { customParameter }),
          },
        ];
      })()
      : [{ parameter: "", action: "", expectedValue: "" }];

    return {
      reqId: r.requestId,
      parentId: "",   // resolved at runtime, not stored in export
      colId: "",      // resolved at runtime, not stored in export
      order: r.order,
      condition,
    };
  });

  return { requests };
}

// ─────────────────────────────────────────────────────────────────────────────
// Source resolver  (inverse of resolveAssertionSource in export-v2.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts an export `AssertionSource` + optional `path` back to the internal
 * `parameter` string (and optional `customParameter`) that the UI understands.
 */
function resolveParameter(
  source: AssertionSource,
  path?: string
): { parameter: string; customParameter?: string } {
  switch (source) {
    case "response.status":
      return { parameter: "Response Code" };
    case "response.body":
      return { parameter: "Response Body" };
    case "response.duration":
      return { parameter: "Response Time" };
    case "headers.Content-Type":
      return { parameter: "Content-Type" };
    case "headers.Content-Length":
      return { parameter: "Content-Length" };
    case "headers.Content-Encoding":
      return { parameter: "Content-Encoding" };
    case "headers.custom":
      return { parameter: "Header", customParameter: path };
    case "body.jsonPath":
      return { parameter: "JSON", customParameter: path };
    case "variable":
      return { parameter: "Variable", customParameter: path };
    default:
      return { parameter: "" };
  }
}
