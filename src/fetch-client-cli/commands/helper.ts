import { cliConfig } from "../config";
import { CollectionRunContext, FolderRunContext, RequestRunContext } from "../types/common.types";
import { executeTests } from "../../fetch-client-core/helpers/tests.helper";
import { ExportFormat } from "../../fetch-client-core/consts/export.consts";
import { FetchConfig, apiFetch, updateVariables } from "../../fetch-client-core/utils/fetchUtil";
import { findParentSettings } from "../../fetch-client-core/helpers/settings.helper";
import { getTimeOutConfiguration, getHeadersConfiguration } from "../../fetch-client-core/utils/vscodeConfig";
import { ICollections, ISettings } from "../../fetch-client-core/types/sidebar.types";
import { IPreFetchContextProvider } from "../../fetch-client-core/utils/preFetchService/preFetch.types.ts";
import { IPreFetchResponse, IReponseModel, ITestResult } from "../../fetch-client-core/types/response.types";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { ITableData } from "../../fetch-client-core/types/common.types";
import { PreFetchRunner } from "../../fetch-client-core/utils/preFetchService/preFetchRunner";
import { printSection, printRunResult, printRunSummary } from "../utils/display";
import { RunResult } from "../../fetch-client-core/types/cli.types";
import { Var_Repository_FindByIdSync } from "../../fetch-client-core/db/variableDB.repository";
import { writeConsoleLog } from "../utils/logger";
import { writeExportReport } from "../utils/export/report";

// --- Execution helpers -------------------------------------------------------

const DEFAULT_FETCH_CONFIG: FetchConfig = {
  timeOut: getTimeOutConfiguration(),
  headersCase: getHeadersConfiguration(),
};

export async function executeRequest(
  request: IRequestModel,
  variableData: ITableData[],
  settings: ISettings,
  varId?: string,
  parent?: string,
  key?: string,
  provider?: IPreFetchContextProvider,
): Promise<RunResult> {
  const preFetchResponses: IPreFetchResponse[] = [];
  let isVariableUpdated = false;

  // Run parent (collection/folder) pre-fetch
  if (settings.preFetch?.requests?.length > 0) {
    const runner = new PreFetchRunner(DEFAULT_FETCH_CONFIG, request.id, provider);
    await runner.RunPreRequests(settings.preFetch, 0, request.name, true);
    preFetchResponses.push(...runner.preFetchResponses);
    if (!runner.allow) {
      return {
        id: request.id,
        name: request.name || request.url,
        method: request.method,
        url: request.url,
        parent,
        status: 0,
        statusText: "Pre-Request Failed",
        duration: 0,
        size: 0,
        responseData: runner.message,
        isError: true,
        testResults: [],
        preFetchResponses,
      };
    }
    isVariableUpdated = true;
  }

  // Run request-level pre-fetch
  if (
    request.preFetch?.requests?.length > 0 &&
    request.preFetch.requests[0]?.reqId
  ) {
    const runner = new PreFetchRunner(DEFAULT_FETCH_CONFIG, request.id, provider);
    await runner.RunPreRequests(request.preFetch, 0, request.name, false);
    preFetchResponses.push(...runner.preFetchResponses);
    if (!runner.allow) {
      return {
        id: request.id,
        name: request.name || request.url,
        method: request.method,
        url: request.url,
        parent,
        status: 0,
        statusText: "Pre-Request Failed",
        duration: 0,
        size: 0,
        responseData: runner.message,
        isError: true,
        testResults: [],
        preFetchResponses,
      };
    }
    isVariableUpdated = true;
  }

  // Reload variables from DB if pre-fetch may have updated them
  if (isVariableUpdated) {
    const updatedVariable = provider?.getVariable();

    if (updatedVariable) {
      variableData = updatedVariable.data;
    }
    else if (varId) {
      const updated = await Var_Repository_FindByIdSync(varId, key);

      if (updated?.data) {
        variableData = updated.data;
      }
    }
  }

  const raw = await apiFetch(
    request,
    variableData,
    settings,
    null,
    DEFAULT_FETCH_CONFIG,
  );

  const responseModel: IReponseModel = {
    id: request.id,
    response: {
      duration: raw.response.duration,
      isError: raw.response.isError,
      responseData: raw.response.responseData,
      responseType: raw.response.responseType,
      size: raw.response.size as string,
      status: raw.response.status,
      statusText: raw.response.statusText,
    },
    headers: raw.headers,
    cookies: raw.cookies,
    loading: false,
    testResults: [],
  };

  let testResults: ITestResult[] = [];

  if (request.tests && request.tests.length > 0) {
    testResults = executeTests(request.tests, responseModel, variableData);
  }

  request = updateVariables(request, variableData);

  return {
    id: request.id,
    name: request.name || request.url,
    method: request.method,
    url: request.url,
    parent,
    status: raw.response.status,
    statusText: raw.response.statusText,
    duration: raw.response.duration,
    size:
      typeof raw.response.size === "number"
        ? raw.response.size
        : parseInt(raw.response.size, 10) || 0,
    responseData: raw.response.responseType?.isBinaryFile
      ? ""
      : raw.response.isError
        ? String(raw.response.responseData)
        : typeof raw.response.responseData === "string"
          ? raw.response.responseData
          : (JSON.stringify(raw.response.responseData) ?? ""),
    responseType: raw.response.responseType,
    isError: raw.response.isError,
    testResults,
    preFetchResponses:
      preFetchResponses.length > 0 ? preFetchResponses : undefined,
  };
}

export function resolveSettings(
  collection: ICollections,
  folderId: string,
): ISettings {
  if (folderId) {
    return findParentSettings(collection, folderId) ?? collection.settings;
  }

  return collection.settings;
}

export async function executeSingleRequest(
  context: RequestRunContext,
  opts: {
    exportFormat?: ExportFormat;
    exportPath?: string;
  },
  provider: IPreFetchContextProvider
): Promise<void> {
  const {
    request,
    collection,
    folderId,
    variable,
    effectiveVarId
  } = context;

  const settings = resolveSettings(collection, folderId);

  printSection(`Running: ${request.name || request.url}`);

  const result = await executeRequest(
    request,
    variable?.data ?? [],
    settings,
    effectiveVarId,
    collection.name,
    cliConfig.encryptionKey,
    provider
  );

  printRunResult(result);
  printRunSummary([result]);

  if (!opts.exportFormat) {
    return;
  }

  const filePath = await writeExportReport(
    [result],
    opts.exportFormat,
    {
      scope: "request",
      name: request.name || request.url,
    },
    opts.exportPath,
  );

  writeConsoleLog(`Report exported to: ${filePath}`);
}

export async function executeCollection(
  contexts: CollectionRunContext[],
  opts: {
    all?: boolean;
    exportFormat?: ExportFormat;
    exportPath?: string;
  },
  provider: IPreFetchContextProvider
): Promise<void> {

  const allResults: RunResult[] = [];
  let count = 0;

  for (const context of contexts) {

    const {
      collection,
      leaves,
      requestMap,
      variable,
      effectiveVarId,
    } = context;

    if (leaves.length === 0) {
      writeConsoleLog(
        `Collection '${collection.name}' is empty, skipping.`,
      );
      continue;
    }

    printSection(
      `Collection: ${collection.name} (${leaves.length} requests)`,
    );

    for (const leaf of leaves) {

      const request = requestMap.get(leaf.id);

      if (!request) {
        continue;
      }

      const settings = resolveSettings(
        collection,
        leaf.folderId,
      );

      const result = await executeRequest(
        request,
        variable?.data ?? [],
        settings,
        effectiveVarId,
        collection.name,
        cliConfig.encryptionKey,
        provider
      );

      count++;

      printSection(`Request ${count}`);
      printRunResult(result);

      allResults.push(result);
    }
  }

  printRunSummary(allResults);

  if (!opts.exportFormat) {
    return;
  }

  if (allResults.length === 0) {
    writeConsoleLog("Nothing to export - no requests were run.");
    return;
  }

  const exportName =
    opts.all
      ? "All-Collections"
      : (contexts[0]?.collection.name ?? "Collection");

  const filePath = await writeExportReport(
    allResults,
    opts.exportFormat,
    {
      scope: "collection",
      name: exportName,
    },
    opts.exportPath,
  );

  writeConsoleLog(`Report exported to: ${filePath}`);
}

export async function executeFolder(
  context: FolderRunContext,
  opts: {
    exportFormat?: ExportFormat;
    exportPath?: string;
  },
  provider: IPreFetchContextProvider
): Promise<void> {
  const {
    folder,
    collection,
    leaves,
    requestMap,
    variable,
    effectiveVarId,
  } = context;

  if (leaves.length === 0) {
    writeConsoleLog(`Folder '${folder.name}' is empty.`);
    return;
  }

  printSection(`Folder: ${folder.name} (${leaves.length} requests)`);

  const allResults: RunResult[] = [];
  let count = 0;

  for (const leaf of leaves) {
    const request = requestMap.get(leaf.id);

    if (!request) {
      continue;
    }

    const settings = resolveSettings(collection, leaf.folderId);

    const result = await executeRequest(
      request,
      variable?.data ?? [],
      settings,
      effectiveVarId,
      folder.name,
      cliConfig.encryptionKey,
      provider
    );

    count++;

    printSection(`Request ${count}`);
    printRunResult(result);

    allResults.push(result);
  }

  printRunSummary(allResults);

  if (!opts.exportFormat) {
    return;
  }

  if (allResults.length === 0) {
    writeConsoleLog("Nothing to export - no requests were run.");
    return;
  }

  const filePath = await writeExportReport(
    allResults,
    opts.exportFormat,
    {
      scope: "folder",
      name: folder.name,
    },
    opts.exportPath,
  );

  writeConsoleLog(`Report exported to: ${filePath}`);
}
