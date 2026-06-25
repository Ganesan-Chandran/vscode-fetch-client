// --- Type helpers ------------------------------------------------------------

import { findParentSettings, Col_Repository_GetAllCollections } from "../../fetch-client-core/db/collectionDB.repository";
import { Main_Repository_GetRequestItem, Main_Repository_GetCollectionRequests } from "../../fetch-client-core/db/mainDB.repository";
import { Var_Repository_FindByIdSync } from "../../fetch-client-core/db/variableDB.repository";
import { ITableData } from "../../fetch-client-core/types/common.types";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { IReponseModel, ITestResult } from "../../fetch-client-core/types/response.types";
import { IFolder, IHistory, ICollections, IVariable, ISettings } from "../../fetch-client-core/types/sidebar.types";
import { executeTests } from "../../fetch-client-core/helpers/tests.helper";
import { ConvertCurlToRequest } from "../../fetch-client-core/utils/curlToRequest";
import { FetchConfig, apiFetch } from "../../fetch-client-core/utils/fetchUtil";
import { getTimeOutConfiguration, getHeadersConfiguration } from "../../fetch-client-core/utils/vscodeConfig";
import { printRunResult, printRunSummary, printSection, RunResult } from "../utils/display";

function isFolder(item: any): item is IFolder {
  return item.data !== undefined;
}

interface RequestLeaf {
  id: string;
  name: string;
  method: string;
  url: string;
  /** Nearest parent folder id (empty = direct collection child) */
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

async function resolveVariable(varId: string): Promise<ITableData[]> {
  if (!varId) { return []; }

  const varSet: IVariable | null = await Var_Repository_FindByIdSync(varId);

  return varSet?.data ?? [];
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
  settings: ISettings
): Promise<RunResult> {

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
    testResults: [],
  };

  let testResults: ITestResult[] = [];

  if (request.tests && request.tests.length > 0) {
    testResults = executeTests(
      request.tests,
      responseModel,
      variableData
    );
  }

  return {
    name: request.name || request.url,
    method: request.method,
    url: request.url,
    status: raw.response.status,
    statusText: raw.response.statusText,
    duration: raw.response.duration,
    size:
      typeof raw.response.size === 'number'
        ? raw.response.size
        : parseInt(raw.response.size, 10) || 0,
    responseData: raw.response.isError
      ? String(raw.response.responseData)
      : '',
    isError: raw.response.isError,
    testResults,
  };
}

// --- run --req ---------------------------------------------------------------

export async function runRequest(
  opts: { name?: string; id?: string }
): Promise<void> {

  const all: ICollections[] =
    await Col_Repository_GetAllCollections();

  let reqId: string | undefined;
  let collection: ICollections | undefined;
  let folderId = '';

  if (opts.id) {

    const found = findLeafById(all, opts.id);

    if (!found) {
      console.error(
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
      console.error(
        `Request named '${opts.name}' not found.`
      );
      process.exit(1);
    }

    reqId = found.leaf.id;
    collection = found.collection;
    folderId = found.leaf.folderId;

  } else {
    console.error(
      'Provide --name or --id to identify the request.'
    );
    process.exit(1);
  }

  const request =
    await Main_Repository_GetRequestItem(reqId);

  if (!request) {
    console.error(
      `Request data not found in DB for id '${reqId}'.`
    );
    process.exit(1);
  }

  const variableData =
    await resolveVariable(collection.variableId);

  const settings =
    resolveSettings(collection, folderId);

  printSection(
    `Running: ${request.name || request.url}`
  );

  const result = await executeRequest(
    request,
    variableData,
    settings
  );

  printRunResult(result);
  printRunSummary([result]);
}

// --- run --col ---------------------------------------------------------------

export async function runCollection(
  opts: { all?: boolean; name?: string; id?: string }
): Promise<void> {

  const all: ICollections[] =
    await Col_Repository_GetAllCollections();

  let targets: ICollections[] = [];

  if (opts.all) {

    targets = all;

  } else if (opts.id) {

    const col = all.find(c => c.id === opts.id);

    if (!col) {
      console.error(
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
      console.error(
        `Collection named '${opts.name}' not found.`
      );
      process.exit(1);
    }

    targets = [col];

  } else {
    console.error(
      'Provide --all, --name, or --id to identify the collection.'
    );
    process.exit(1);
  }

  const allResults: RunResult[] = [];

  for (const col of targets) {

    const leaves: RequestLeaf[] = [];
    collectLeaves(col, '', leaves);

    if (leaves.length === 0) {
      console.log(
        `Collection '${col.name}' is empty, skipping.`
      );
      continue;
    }

    printSection(
      `Collection: ${col.name} (${leaves.length} requests)`
    );

    const variableData =
      await resolveVariable(col.variableId);

    const reqIds = leaves.map(l => l.id);

    const requestModels =
      await Main_Repository_GetCollectionRequests(reqIds);

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
        settings
      );

      printRunResult(result);
      allResults.push(result);
    }
  }

  printRunSummary(allResults);
}

// --- run --fol ---------------------------------------------------------------

export async function runFolder(
  opts: { name?: string; id?: string }
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
      console.error(
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
      console.error(
        `Folder named '${opts.name}' not found.`
      );
      process.exit(1);
    }

  } else {
    console.error(
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
    console.log(
      `Folder '${match.folder.name}' is empty.`
    );
    return;
  }

  printSection(
    `Folder: ${match.folder.name} (${leaves.length} requests)`
  );

  const variableData =
    await resolveVariable(
      match.collection.variableId
    );

  const reqIds = leaves.map(l => l.id);

  const requestModels =
    await Main_Repository_GetCollectionRequests(reqIds);

  const reqMap =
    new Map<string, IRequestModel>(
      requestModels.map(r => [r.id, r])
    );

  const allResults: RunResult[] = [];

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
      settings
    );

    printRunResult(result);
    allResults.push(result);
  }

  printRunSummary(allResults);
}

// --- run --curl --------------------------------------------------------------

export async function runCurl(
  curlString: string
): Promise<void> {

  const request =
    ConvertCurlToRequest(curlString);

  if (!request) {
    console.error(
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

  printRunResult(result);
  printRunSummary([result]);
}
