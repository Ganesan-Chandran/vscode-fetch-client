import { CheckOpenApiFormat } from "../helpers/importers/openapi/v3/utils";
import { createAutoDBCache } from "./dbManager";
import { ExportBuilderV2 } from "../helpers/exporters/fetchClient/fetchClientExporter_2_0";
import { FetchClientDataProxy } from "../helpers/validators/fetchClientCollectionValidator";
import { fetchClientImporter } from "../helpers/importers/fetchClient/fetchClientImporter_1_0";
import { fetchClientV2Importer, isFetchClientV2 } from "../helpers/importers/fetchClient/fetchClientImporter_2_0";
import { formatDate } from "../helpers/dateTime.helper";
import { getCollectionDB, saveCollectionDB } from "./collectionDB.repository";
import { getExportCollectionConfiguration } from "../utils/vscodeConfig";
import { ICollections, IFolder, IVariable } from "../types/sidebar.types";
import { IFetchClientExportV2 } from "../types/fetchClient_2_0_types";
import { ImportType } from "../consts/import.consts";
import { InitialSettings } from "../consts/initialValues.consts";
import { INSOMNIA_EXPORT_FORMAT_4, INSOMNIA_EXPORT_FORMAT_5, InsomniaExport } from "../types/insomnia.types";
import { insomniaImporter } from "../helpers/importers/insomnia/insomniaImporter";
import { IRequestModel } from "../types/request.types";
import { isFolder } from "../helpers/common.helper";
import { isJson } from "../helpers/tests.helper";
import { mainDBPath } from "./dbHelper";
import { openApiImporter } from "../helpers/importers/openapi/v3/openApiImporter";
import { postmanImporter } from "../helpers/importers/postman/postmanImporter_2_1";
import { PostmanSchema_2_1, POSTMAN_SCHEMA_V2_1 } from "../types/postman_2_1.types";
import { ThunderClient_Schema_1_2 } from "../types/thunderClient_1_2_types";
import { thunderClientImporter } from "../helpers/importers/thunderClient/thunderClientImporter_1_2";
import { Var_Repository_FindById, Var_Repository_Insert } from "./variableDB.repository";
import { writeLog } from "../helpers/logger/logger";
import loki, { Collection } from "lokijs";

const { getLoadedDB: getMainDB, saveDB: saveMainDB, flush: flushMainDB, invalidate: invalidateMainDB } = createAutoDBCache(mainDBPath);
export { getMainDB, saveMainDB, flushMainDB, invalidateMainDB };

export type ImportResult = {
  fcCollection: ICollections;
  fcRequests: IRequestModel[];
  fcVariables?: IVariable;
};

export type ExportPayload = {
  app: string;
  id: string;
  name: string;
  version: string;
  type: string;
  createdTime: unknown;
  exportedDate: string;
  data: unknown[];
  settings: unknown;
};

function getRequestCollection(db: loki): Collection<IRequestModel> {
  return db.getCollection("apiRequests");
}

function findItem(source: { data: any[] }, id: string): any | null {
  for (const entry of source.data) {
    if (entry.id === id) { return entry; }
    if (isFolder(entry)) {
      const found = findItem(entry, id);
      if (found) { return found; }
    }
  }
  return null;
}

function exportItemFromFolder(
  source: { data: any[] },
  apiRequests: Collection<any>,
  isSub: boolean
): any {
  const subFolders: any[] = [];
  const leafIds: string[] = [];

  for (const item of source.data) {
    if (item.data !== undefined) {
      subFolders.push(exportItemFromFolder(item, apiRequests, true));
    } else {
      leafIds.push(item.id);
    }
  }

  const leafRequests = apiRequests
    .chain()
    .find({ id: { $in: leafIds } })
    .data({ removeMeta: true });

  const merged = [...subFolders, ...leafRequests];

  if (isSub) {
    source.data = merged;
    return source;
  }

  return merged;
}

function buildExportPayload(
  cols: any[],
  apiRequests: Collection<any>,
  hisId: string,
  folderId: string
): ExportPayload {
  const col = cols[0];

  const exportData: ExportPayload = {
    app: "Fetch Client",
    id: col.id,
    name: col.name.toUpperCase().trim() === "DEFAULT" ? "Default Export" : col.name,
    version: "1.0",
    type: "collections",
    createdTime: col.createdTime,
    exportedDate: formatDate(),
    data: [],
    settings: col.settings ?? JSON.parse(JSON.stringify(InitialSettings)),
  };

  if (hisId) {
    const results = apiRequests
      .chain()
      .find({ id: { $in: [hisId] } })
      .data({ removeMeta: true });

    if (folderId) {
      const folder = findItem(col, folderId);
      (folder as IFolder).data = results;
      exportData.data.push(folder);
    } else {
      exportData.data.push(results[0]);
    }
  } else if (folderId) {
    const folder = findItem(col, folderId);
    const results = exportItemFromFolder(folder, apiRequests, false);
    if (results) {
      (folder as IFolder).data = results;
      exportData.data.push(folder);
    }
  } else {
    const results = exportItemFromFolder(col, apiRequests, false);
    if (results) {
      exportData.data = results;
    }
  }

  return exportData;
}

function validateImportData(data: string): ImportType | null {
  if (!data || data.length === 0 || !isJson(data)) {
    writeLog("error::validateImportData() - Empty Data.");
    throw new Error("Empty or invalid JSON data.");
  }

  let parsedData = JSON.parse(data);

  try {
    if (isFetchClientV2(parsedData)) {
      return ImportType.FetchClient_2_0;
    }
  } catch (fcErr) {
    writeLog("error::validateImportData() " + fcErr);
  }

  try {
    FetchClientDataProxy.Parse(data);
    return ImportType.FetchClient_1_0;
  } catch (fcErr) {
    writeLog("error::validateImportData() " + fcErr);
  }

  try {
    const postmanData = parsedData as PostmanSchema_2_1;
    if (postmanData.info?._postman_id && postmanData.info?.schema === POSTMAN_SCHEMA_V2_1) {
      return ImportType.Postman_2_1;
    }

    const thunderData = parsedData as ThunderClient_Schema_1_2;
    if (thunderData.clientName === "Thunder Client") {
      if (thunderData.version !== "1.2") {
        throw new Error("Invalid Thunder Client version.");
      }
      return ImportType.ThunderClient_1_2;
    }

    const insomniaData = JSON.parse(data) as InsomniaExport;
    const fmt = Number(insomniaData.__export_format);
    if (insomniaData._type === "export" && (fmt === INSOMNIA_EXPORT_FORMAT_4 || fmt === INSOMNIA_EXPORT_FORMAT_5)) {
      return ImportType.Insomnia_4_5;
    }

    const detection = CheckOpenApiFormat(data);
    if (detection.isOpenApi) {
      return ImportType.OpenAPI_V_3;
    }
  } catch (parseErr) {
    writeLog("error::validateImportData() - " + parseErr);
    throw new Error("Could not parse import data.");
  }

  return null;
}

export async function Main_Repository_SaveRequest(reqData: IRequestModel): Promise<void> {
  try {
    const db = await getMainDB();
    getRequestCollection(db).insert(reqData);
    saveMainDB(db);
  } catch (err) {
    writeLog("error::SaveRequest(): " + err);
  }
}

export async function Main_Repository_UpdateRequest(reqData: IRequestModel): Promise<void> {
  try {
    const db = await getMainDB();
    const collection = getRequestCollection(db);
    const req = collection.findOne({ id: reqData.id });

    if (!req) {
      writeLog("error::UpdateRequest(): record not found - id=" + reqData.id);
      return;
    }

    req.url = reqData.url;
    req.name = reqData.name;
    req.method = reqData.method;
    req.params = reqData.params;
    req.auth = reqData.auth;
    req.headers = reqData.headers;
    req.body = reqData.body;
    req.tests = reqData.tests;
    req.setvar = reqData.setvar;
    req.notes = reqData.notes;
    req.preFetch = reqData.preFetch;
    req.modifiedTime = formatDate();

    collection.update(req);
    saveMainDB(db);
  } catch (err) {
    writeLog("error::UpdateRequest(): " + err);
    throw err;
  }
}

export async function Main_Repository_GetRequestItem(reqId: string): Promise<IRequestModel | null> {
  try {
    const db = await getMainDB();
    const results = getRequestCollection(db)
      .chain()
      .find({ id: reqId })
      .data({ forceClones: true, removeMeta: true });
    return results.length > 0 ? (results[0] as IRequestModel) : null;
  } catch (err) {
    writeLog("error::GetRequestItem(): " + err);
    return null;
  }
}

export async function Main_Repository_GetExistingItem(id: string): Promise<IRequestModel[]> {
  try {
    const db = await getMainDB();
    return getRequestCollection(db)
      .chain()
      .find({ id })
      .data({ forceClones: true, removeMeta: true }) as IRequestModel[];
  } catch (err) {
    writeLog("error::GetExistingItem(): " + err);
    return [];
  }
}

export async function Main_Repository_CopyExistingItems(oldIds: string[], ids: Record<string, string>): Promise<void> {
  if (oldIds.length === 0) { return; }

  try {
    const db = await getMainDB();
    const collection = getRequestCollection(db);
    const clones = collection
      .chain()
      .find({ id: { $in: oldIds } })
      .data({ forceClones: true, removeMeta: true });

    if (clones.length === 0) { return; }

    clones.forEach(item => {
      item.id = ids[item.id];
      item.name = item.name + " (Copy)";
    });

    collection.insert(clones);
    saveMainDB(db);
  } catch (err) {
    writeLog("error::CopyExistingItems(): " + err);
  }
}

export async function Main_Repository_DeleteExistingItem(id: string): Promise<void> {
  try {
    const db = await getMainDB();
    getRequestCollection(db).findAndRemove({ id });
    saveMainDB(db);
  } catch (err) {
    writeLog("error::DeleteExistingItem(): " + err);
  }
}

export async function Main_Repository_DeleteExistingItems(ids: string[]): Promise<void> {
  if (ids.length === 0) { return; }

  try {
    const db = await getMainDB();
    getRequestCollection(db).findAndRemove({ id: { $in: ids } });
    saveMainDB(db);
  } catch (err) {
    writeLog("error::DeleteExistingItems(): " + err);
  }
}

export async function Main_Repository_RenameRequestItem(id: string, name: string): Promise<void> {
  try {
    const db = await getMainDB();
    const collection = getRequestCollection(db);
    const req = collection.findOne({ id });

    if (!req) { return; }

    req.name = name;
    collection.update(req);
    saveMainDB(db);
  } catch (err) {
    writeLog("error::RenameRequestItem(): " + err);
  }
}

export async function Main_Repository_GetCollectionRequests(ids: string[]): Promise<IRequestModel[]> {
  try {
    const db = await getMainDB();
    return getRequestCollection(db)
      .chain()
      .find({ id: { $in: ids } })
      .data({ forceClones: true, removeMeta: true }) as IRequestModel[];
  } catch (err) {
    writeLog("error::GetCollectionRequests(): " + err);
    return [];
  }
}

export async function Main_Repository_BuildExport(colId: string, hisId: string, folderId: string): Promise<ExportPayload> {
  const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);

  const cols = colDB
    .getCollection('userCollections')
    .chain()
    .find({ id: colId })
    .data({ forceClones: true, removeMeta: true });

  return buildExportPayload(cols, getRequestCollection(db), hisId, folderId);
}

export async function Main_Repository_BuildBulkExport(selectedCols: string[]): Promise<ExportPayload[]> {
  const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);
  const apiRequests = getRequestCollection(db);

  return selectedCols.map((colId) => {
    const cols = colDB
      .getCollection('userCollections')
      .chain()
      .find({ id: colId })
      .data({ forceClones: true, removeMeta: true });

    return buildExportPayload(cols, apiRequests, "", "");
  });
}

export async function Main_Repository_BuildExport_V2(colId: string, hisId: string, folderId: string, key: string): Promise<IFetchClientExportV2> {
  const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);

  const cols = colDB
    .getCollection('userCollections')
    .chain()
    .find({ id: colId })
    .data({ forceClones: true, removeMeta: true });

  const linkedVariables = getExportCollectionConfiguration();
  const variableId = linkedVariables ? cols[0].variableId : "";
  const variables = variableId ? await Var_Repository_FindById(variableId, false, key) : [];
  return ExportBuilderV2(cols[0], getRequestCollection(db), hisId, folderId, variables.length > 0 ? variables[0] : null);
}

export async function Main_Repository_BuildBulkExportV2(selectedCols: string[], key: string): Promise<IFetchClientExportV2[]> {
  const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);
  const apiRequests = getRequestCollection(db);

  const linkedVariables = getExportCollectionConfiguration();
  const result: IFetchClientExportV2[] = [];

  for (const colId of selectedCols) {
    const cols = colDB
      .getCollection("userCollections")
      .chain()
      .find({ id: colId })
      .data({ forceClones: true, removeMeta: true });

    const variableId = linkedVariables ? cols[0].variableId : "";
    const variables = variableId ? await Var_Repository_FindById(variableId, false, key) : [];
    result.push(ExportBuilderV2(cols[0], apiRequests, "", "", variables.length > 0 ? variables[0] : null));
  }

  return result;
}

async function importPostman(data: string, key: string): Promise<ImportResult> {
  const convertedData = postmanImporter(data);
  if (!convertedData?.fcCollection || !convertedData?.fcRequests) {
    throw new Error("Postman import produced incomplete data.");
  }

  const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);

  getRequestCollection(db).insert(convertedData.fcRequests);
  saveMainDB(db);

  if (convertedData.fcVariables) {
    await Var_Repository_Insert(convertedData.fcVariables, key);
  }

  colDB.getCollection('userCollections').insert(convertedData.fcCollection);
  saveCollectionDB(colDB);

  return {
    fcCollection: convertedData.fcCollection,
    fcRequests: convertedData.fcRequests,
    fcVariables: convertedData.fcVariables,
  };
}

async function importThunderClient(data: string): Promise<ImportResult> {
  const convertedData = thunderClientImporter(data);
  if (!convertedData?.fcCollection || !convertedData?.fcRequests) {
    throw new Error("Thunder Client import produced incomplete data.");
  }

  const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);

  getRequestCollection(db).insert(convertedData.fcRequests);
  saveMainDB(db);

  colDB.getCollection('userCollections').insert(convertedData.fcCollection);
  saveCollectionDB(colDB);

  return {
    fcCollection: convertedData.fcCollection,
    fcRequests: convertedData.fcRequests,
  };
}

async function importInsomnia(data: string, key: string): Promise<ImportResult> {
  const convertedData = insomniaImporter(data);
  if (!convertedData?.fcCollection || !convertedData?.fcRequests) {
    throw new Error("Insomnia import produced incomplete data.");
  }

  const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);

  getRequestCollection(db).insert(convertedData.fcRequests);
  saveMainDB(db);

  if (convertedData.fcVariables) {
    await Var_Repository_Insert(convertedData.fcVariables, key);
  }

  colDB.getCollection('userCollections').insert(convertedData.fcCollection);
  saveCollectionDB(colDB);

  return {
    fcCollection: convertedData.fcCollection,
    fcRequests: convertedData.fcRequests,
    fcVariables: convertedData.fcVariables,
  };
}

async function importOpenAPI(data: string): Promise<ImportResult> {
  const convertedData = openApiImporter(data);
  if (!convertedData?.fcCollection || !convertedData?.fcRequests) {
    throw new Error("Fetch Client import produced incomplete data.");
  }

  const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);

  getRequestCollection(db).insert(convertedData.fcRequests);
  saveMainDB(db);

  colDB.getCollection('userCollections').insert(convertedData.fcCollection);
  saveCollectionDB(colDB);

  return {
    fcCollection: convertedData.fcCollection,
    fcRequests: convertedData.fcRequests,
  };
}

async function importFC(data: string, verison: number, key: string): Promise<ImportResult> {
  const parsedData = JSON.parse(data);
  const convertedData = verison === 1 ? fetchClientImporter(parsedData) : fetchClientV2Importer(parsedData);
  if (!convertedData?.fcCollection || !convertedData?.fcRequests) {
    throw new Error("Fetch Client import produced incomplete data.");
  }

  const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);

  getRequestCollection(db).insert(convertedData.fcRequests);
  saveMainDB(db);

  colDB.getCollection('userCollections').insert(convertedData.fcCollection);
  saveCollectionDB(colDB);

  if (convertedData.fcVariables) {
    await Var_Repository_Insert(convertedData.fcVariables, key);
  }

  return {
    fcCollection: convertedData.fcCollection,
    fcRequests: convertedData.fcRequests,
    fcVariables: convertedData.fcVariables
  };
}

export async function Main_Repository_Import(data: string, key: string): Promise<ImportResult> {
  const type = validateImportData(data);

  switch (type) {
    case ImportType.FetchClient_1_0: return importFC(data, 1, key);
    case ImportType.FetchClient_2_0: return importFC(data, 2, key);
    case ImportType.Postman_2_1: return importPostman(data, key);
    case ImportType.ThunderClient_1_2: return importThunderClient(data);
    case ImportType.OpenAPI_V_3: return importOpenAPI(data);
    case ImportType.Insomnia_4_5: return importInsomnia(data, key);
    default:
      throw new Error("Unrecognised import format.");
  }
}
