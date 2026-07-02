import { ConvertCurlToRequest } from "../../fetch-client-core/utils/curlToRequest";
import { executeTests } from "../../fetch-client-core/helpers/tests.helper";
import { ExportFormat } from "../types/export.types";
import { FetchConfig, apiFetch, updateVariables } from "../../fetch-client-core/utils/fetchUtil";
import { findParentSettings, Col_Repository_GetAllCollections } from "../../fetch-client-core/db/collectionDB.repository";
import { formatDate } from "../../fetch-client-core/helpers/dateTime.helper";
import { getTimeOutConfiguration, getHeadersConfiguration } from "../../fetch-client-core/utils/vscodeConfig";
import { History_Repository_InsertHistory } from "../../fetch-client-core/db/history.repository";
import { IFolder, IHistory, ICollections, IVariable, ISettings } from "../../fetch-client-core/types/sidebar.types";
import { IPreFetchResponse, IReponseModel, ITestResult } from "../../fetch-client-core/types/response.types";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { ITableData } from "../../fetch-client-core/types/common.types";
import { Main_Repository_GetRequestItem, Main_Repository_GetCollectionRequests, Main_Repository_SaveRequest } from "../../fetch-client-core/db/mainDB.repository";
import { PreFetchRunner } from "../../fetch-client-core/utils/preFetchRunner";
import { printRunResult, printRunSummary, printSection, red, RunResult } from "../utils/display";
import { v4 as uuidv4 } from 'uuid';
import { Var_Repository_FindAll, Var_Repository_FindById, Var_Repository_FindByIdSync } from "../../fetch-client-core/db/variableDB.repository";
import { writeConsoleLog, wrtieConsleError } from "../utils/logger";
import { writeExportReport } from "../utils/export/report";

function isFolder(item: any): item is IFolder {
  return item.data !== undefined;
}

interface RequestLeaf {
  id: string;
  name: string;
  method: string;
  url: string;
  folderId: string;
}

// --- Tree walkers ------------------------------------------------------------

/** Recursively collect all leaf request entries inside a node. */
function collectLeaves(
  node: { data?: (IHistory | IFolder)[] },
  parentFolderId: string,
  out: RequestLeaf[]
): void {
  if (!node.data) { return; }

  for (const item of node.data) {
    if (isFolder(item)) {
      collectLeaves(item, item.id, out);
    } else {
      out.push({
        id: item.id,
        name: item.name,
        method: (item as IHistory).method ?? 'get',
        url: (item as IHistory).url ?? '',
        folderId: parentFolderId,
      });
    }
  }
}

/** Find a leaf request anywhere in the collection tree by name (case-insensitive). */
function findLeafByName(
  collections: ICollections[],
  name: string
): { leaf: RequestLeaf; collection: ICollections } | null {

  const lower = name.toLowerCase();

  for (const col of collections) {
    const leaves: RequestLeaf[] = [];
    collectLeaves(col, '', leaves);

    const match = leaves.find(
      l => l.name.toLowerCase() === lower
    );

    if (match) {
      return { leaf: match, collection: col };
    }
  }

  return null;
}

/** Find a leaf by id anywhere in the collection tree. */
function findLeafById(
  collections: ICollections[],
  id: string
): { leaf: RequestLeaf; collection: ICollections } | null {

  for (const col of collections) {
    const leaves: RequestLeaf[] = [];
    collectLeaves(col, '', leaves);

    const match = leaves.find(l => l.id === id);

    if (match) {
      return { leaf: match, collection: col };
    }
  }

  return null;
}

// --- Variable + settings resolution ------------------------------------------

async function resolveVariableByName(name: string): Promise<IVariable | null> {
  const all = await Var_Repository_FindAll();
  const lower = name.toLowerCase();
  return all.find(v => v.name.toLowerCase() === lower) ?? null;
}

/**
 * Resolves the variable set to use for a run command in a single DB read.
 * - If the item already has a linked variable, that takes priority.
 * - An info message is printed when the user also supplied --var-id/--var-name.
 * - Otherwise the user-supplied --var-id or --var-name is used.
 */
async function resolveEffectiveForRun(
  linkedVarId: string,
  contextName: string,
  opts: { varId?: string; varName?: string }
): Promise<{ effectiveVarId: string; variableData: ITableData[] }> {

  if (linkedVarId) {
    const varSet = await Var_Repository_FindByIdSync(linkedVarId);
    if (opts.varId || opts.varName) {
      console.info(
        red(
          `Info: '${contextName}' is already linked to variable set '${varSet?.name ?? linkedVarId
          }'. The --var-id/--var-name option has no effect here.`
        )
      );
    }

    return { effectiveVarId: linkedVarId, variableData: varSet?.data ?? [] };
  }

  if (opts.varId) {
    const varSet = await Var_Repository_FindByIdSync(opts.varId);
    if (!varSet) {
      wrtieConsleError(`Variable set with id '${opts.varId}' not found.`);
      process.exit(1);
    }
    return { effectiveVarId: opts.varId, variableData: varSet?.data ?? [] };
  }

  if (opts.varName) {
    const found = await resolveVariableByName(opts.varName);
    if (!found) {
      wrtieConsleError(`Variable set named '${opts.varName}' not found.`);
      process.exit(1);
    }

    const globalVars = await Var_Repository_FindById('', true);
    if (globalVars && globalVars.length > 0) {
      return { effectiveVarId: globalVars[0].id, variableData: globalVars[0]?.data ?? [] };
    }

    return { effectiveVarId: found.id, variableData: found?.data ?? [] };
  }

  return { effectiveVarId: '', variableData: [] };;
}

function resolveSettings(
  collection: ICollections,
  folderId: string
): ISettings {

  if (folderId) {
    return (
      findParentSettings(collection, folderId) ??
      collection.settings
    );
  }

  return collection.settings;
}

// --- Execution helpers -------------------------------------------------------

const DEFAULT_FETCH_CONFIG: FetchConfig = {
  timeOut: getTimeOutConfiguration(),
  headersCase: getHeadersConfiguration(),
};

async function executeRequest(
  request: IRequestModel,
  variableData: ITableData[],
  settings: ISettings,
  varId?: string,
  parent?: string
): Promise<RunResult> {

  const preFetchResponses: IPreFetchResponse[] = [];
  let isVariableUpdated = false;

  // Run parent (collection/folder) pre-fetch
  if (settings.preFetch?.requests?.length > 0) {
    const runner = new PreFetchRunner(DEFAULT_FETCH_CONFIG, request.id);
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
        statusText: 'Pre-Request Failed',
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
  if (request.preFetch?.requests?.length > 0 && request.preFetch.requests[0]?.reqId) {
    const runner = new PreFetchRunner(DEFAULT_FETCH_CONFIG, request.id);
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
        statusText: 'Pre-Request Failed',
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
  if (isVariableUpdated && varId) {
    const updated = await Var_Repository_FindByIdSync(varId);

    if (updated?.data) {
      variableData = updated.data;
    }
  }

  const raw = await apiFetch(
    request,
    variableData,
    settings,
    null,
    DEFAULT_FETCH_CONFIG
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
    testResults: []
  };

  let testResults: ITestResult[] = [];

  if (request.tests && request.tests.length > 0) {
    testResults = executeTests(
      request.tests,
      responseModel,
      variableData
    );
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
      typeof raw.response.size === 'number'
        ? raw.response.size
        : parseInt(raw.response.size, 10) || 0,
    responseData: raw.response.responseType?.isBinaryFile ? ''
      : raw.response.isError
        ? String(raw.response.responseData)
        : typeof raw.response.responseData === 'string'
          ? raw.response.responseData
          : JSON.stringify(raw.response.responseData) ?? '',
    responseType: raw.response.responseType,
    isError: raw.response.isError,
    testResults,
    preFetchResponses: preFetchResponses.length > 0 ? preFetchResponses : undefined
  };
}

// --- run --req ---------------------------------------------------------------

export async function runRequest(
  opts: { name?: string; id?: string; varId?: string; varName?: string; exportFormat?: ExportFormat; exportPath?: string }
): Promise<void> {

  const all: ICollections[] =
    await Col_Repository_GetAllCollections();

  let reqId: string | undefined;
  let collection: ICollections | undefined;
  let folderId = '';

  if (opts.id) {

    const found = findLeafById(all, opts.id);

    if (!found) {
      wrtieConsleError(
        `Request with id '${opts.id}' not found.`
      );
      process.exit(1);
    }

    reqId = found.leaf.id;
    collection = found.collection;
    folderId = found.leaf.folderId;

  } else if (opts.name) {

    const found = findLeafByName(all, opts.name);

    if (!found) {
      wrtieConsleError(
        `Request named '${opts.name}' not found.`
      );
      process.exit(1);
    }

    reqId = found.leaf.id;
    collection = found.collection;
    folderId = found.leaf.folderId;

  } else {
    wrtieConsleError(
      'Provide --name or --id to identify the request.'
    );
    process.exit(1);
  }

  const request =
    await Main_Repository_GetRequestItem(reqId);

  if (!request) {
    wrtieConsleError(
      `Request data not found in DB for id '${reqId}'.`
    );
    process.exit(1);
  }

  const { effectiveVarId, variableData } = await resolveEffectiveForRun(collection.variableId, request.name || request.url, opts);

  const settings = resolveSettings(collection, folderId);

  printSection(`Running: ${request.name || request.url}`);

  const result = await executeRequest(
    request,
    variableData,
    settings,
    effectiveVarId,
    collection.name
  );

  printRunResult(result);
  printRunSummary([result]);

  if (opts.exportFormat) {
    const filePath = await writeExportReport(
      [result],
      opts.exportFormat,
      { scope: 'request', name: request.name || request.url },
      opts.exportPath
    );
    writeConsoleLog(`Report exported to: ${filePath}`);
  }
}

// --- run --col ---------------------------------------------------------------

export async function runCollection(
  opts: {
    all?: boolean; name?: string; id?: string; varId?: string; varName?: string;
    exportFormat?: ExportFormat; exportPath?: string;
  }
): Promise<void> {

  const all: ICollections[] =
    await Col_Repository_GetAllCollections();

  let targets: ICollections[] = [];

  if (opts.all) {

    targets = all;

  } else if (opts.id) {

    const col = all.find(c => c.id === opts.id);

    if (!col) {
      wrtieConsleError(
        `Collection with id '${opts.id}' not found.`
      );
      process.exit(1);
    }

    targets = [col];

  } else if (opts.name) {

    const lower = opts.name.toLowerCase();

    const col = all.find(
      c => c.name.toLowerCase() === lower
    );

    if (!col) {
      wrtieConsleError(
        `Collection named '${opts.name}' not found.`
      );
      process.exit(1);
    }

    targets = [col];

  } else {
    wrtieConsleError(
      'Provide --all, --name, or --id to identify the collection.'
    );
    process.exit(1);
  }

  const allResults: RunResult[] = [];
  let count = 0;

  for (const col of targets) {

    const leaves: RequestLeaf[] = [];
    collectLeaves(col, '', leaves);

    if (leaves.length === 0) {
      writeConsoleLog(`Collection '${col.name}' is empty, skipping.`);
      continue;
    }

    printSection(`Collection: ${col.name} (${leaves.length} requests)`);

    const { effectiveVarId, variableData } = await resolveEffectiveForRun(col.variableId, col.name, opts);

    const reqIds = leaves.map(l => l.id);

    const requestModels = await Main_Repository_GetCollectionRequests(reqIds);

    const reqMap =
      new Map<string, IRequestModel>(
        requestModels.map(r => [r.id, r])
      );

    for (const leaf of leaves) {

      const request = reqMap.get(leaf.id);

      if (!request) { continue; }

      const settings =
        resolveSettings(col, leaf.folderId);

      const result = await executeRequest(
        request,
        variableData,
        settings,
        effectiveVarId,
        col.name
      );

      count++;
      printSection(`Request ${count}`);
      printRunResult(result);
      allResults.push(result);
    }
  }

  printRunSummary(allResults);

  if (opts.exportFormat) {
    if (allResults.length === 0) {
      writeConsoleLog('Nothing to export — no requests were run.');
    } else {
      const exportName = opts.all ? 'All-Collections' : (targets[0]?.name ?? 'Collection');
      const filePath = await writeExportReport(
        allResults,
        opts.exportFormat,
        { scope: 'collection', name: exportName },
        opts.exportPath
      );
      writeConsoleLog(`Report exported to: ${filePath}`);
    }
  }
}

// --- run --fol ---------------------------------------------------------------

export async function runFolder(
  opts: { name?: string; id?: string; varId?: string; varName?: string; exportFormat?: ExportFormat; exportPath?: string }
): Promise<void> {

  const all: ICollections[] =
    await Col_Repository_GetAllCollections();

  interface FolderMatch {
    folder: IFolder;
    collection: ICollections;
  }

  const allFolderMatches: FolderMatch[] = [];

  for (const col of all) {
    for (const item of col.data ?? []) {
      if (isFolder(item)) {
        allFolderMatches.push({
          folder: item,
          collection: col,
        });

        collectNestedFolders(
          item,
          col,
          allFolderMatches
        );
      }
    }
  }

  function collectNestedFolders(
    parentFolder: IFolder,
    col: ICollections,
    result: FolderMatch[]
  ): void {

    for (const item of parentFolder.data ?? []) {
      if (isFolder(item)) {
        result.push({
          folder: item,
          collection: col,
        });

        collectNestedFolders(
          item,
          col,
          result
        );
      }
    }
  }

  let match: FolderMatch | undefined;

  if (opts.id) {

    match = allFolderMatches.find(
      m => m.folder.id === opts.id
    );

    if (!match) {
      wrtieConsleError(
        `Folder with id '${opts.id}' not found.`
      );
      process.exit(1);
    }

  } else if (opts.name) {

    const lower = opts.name.toLowerCase();

    match = allFolderMatches.find(
      m => m.folder.name.toLowerCase() === lower
    );

    if (!match) {
      wrtieConsleError(
        `Folder named '${opts.name}' not found.`
      );
      process.exit(1);
    }

  } else {
    wrtieConsleError(
      'Provide --name or --id to identify the folder.'
    );
    process.exit(1);
  }

  const leaves: RequestLeaf[] = [];

  collectLeaves(
    match.folder,
    match.folder.id,
    leaves
  );

  if (leaves.length === 0) {
    writeConsoleLog(
      `Folder '${match.folder.name}' is empty.`
    );
    return;
  }

  printSection(
    `Folder: ${match.folder.name} (${leaves.length} requests)`
  );

  const { effectiveVarId, variableData } = await resolveEffectiveForRun(match.collection.variableId, match.folder.name, opts);

  const reqIds = leaves.map(l => l.id);

  const requestModels =
    await Main_Repository_GetCollectionRequests(reqIds);

  const reqMap =
    new Map<string, IRequestModel>(
      requestModels.map(r => [r.id, r])
    );

  const allResults: RunResult[] = [];
  let count = 0;

  for (const leaf of leaves) {

    const request = reqMap.get(leaf.id);

    if (!request) { continue; }

    const settings = resolveSettings(
      match.collection,
      leaf.folderId
    );

    const result = await executeRequest(
      request,
      variableData,
      settings,
      effectiveVarId,
      match.folder.name
    );

    count++;
    printSection(`Request ${count}`);
    printRunResult(result);
    allResults.push(result);
  }

  printRunSummary(allResults);

  if (opts.exportFormat) {
    const filePath = await writeExportReport(
      allResults,
      opts.exportFormat,
      { scope: 'folder', name: match.folder.name },
      opts.exportPath
    );
    writeConsoleLog(`Report exported to: ${filePath}`);
  }
}

// --- run --curl --------------------------------------------------------------

export async function runCurl(
  curlString: string
): Promise<void> {

  const request = ConvertCurlToRequest(curlString);

  if (!request) {
    wrtieConsleError(
      'Failed to parse the curl command.'
    );
    process.exit(1);
  }

  printSection(
    `Running curl: ${request.method.toUpperCase()} ${request.url}`
  );

  const emptySettings: ISettings = {
    auth: { authType: 'noauth' } as any,
  };

  const result = await executeRequest(
    request,
    [],
    emptySettings
  );

  request.id = uuidv4();
  await Main_Repository_SaveRequest(request);

  const historyItem: IHistory = {
    id: request.id,
    method: request.method,
    name: request.name ? request.name : request.url,
    url: request.url,
    createdTime: request.createdTime ? request.createdTime : formatDate(),
    modifiedTime: request.modifiedTime ? request.modifiedTime : formatDate()
  };
  await History_Repository_InsertHistory(historyItem);

  printRunResult(result);
  printRunSummary([result]);
}
