import * as vscode from 'vscode';
import { collectionDBPath, mainDBPath, variableDBPath } from "./consts";
import { FetchClientDataProxy } from '../validators/fetchClientCollectionValidator';
import { fetchClientImporter } from '../importers/fetchClientImporter_1_0';
import { formatDate } from '../helper';
import { getGlobalPath } from '../../extension';
import { ICollections, IFolder, IHistory } from '../../fetch-client-ui/components/SideBar/redux/types';
import { InitialSettings } from '../../fetch-client-ui/components/SideBar/redux/reducer';
import { IRequestModel } from '../../fetch-client-ui/components/RequestUI/redux/types';
import { isFolder } from '../../fetch-client-ui/components/SideBar/util';
import { isJson } from '../../fetch-client-ui/components/TestUI/TestPanel/helper';
import { postmanImporter } from '../importers/postmanImporter_2_1';
import { PostmanSchema_2_1, POSTMAN_SCHEMA_V2_1 } from '../importers/postman_2_1.types';
import { responseTypes } from '../configuration';
import { writeLog } from '../logger/logger';
import fs from "fs";
import loki, { LokiFsAdapter } from 'lokijs';

function getDB(): loki {
  const idbAdapter = new LokiFsAdapter();
  const db = new loki(getGlobalPath() + "\\" + mainDBPath, { adapter: idbAdapter });
  return db;
}

function getCollectionDB(): loki {
  const idbAdapter = new LokiFsAdapter();
  const db = new loki(getGlobalPath() + "\\" + collectionDBPath, { adapter: idbAdapter });
  return db;
}

function getVariableDB(): loki {
  const idbAdapter = new LokiFsAdapter();
  const db = new loki(getGlobalPath() + "\\" + variableDBPath, { adapter: idbAdapter });
  return db;
}

export function SaveRequest(reqData: IRequestModel) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const apiRequests = db.getCollection('apiRequests');
      apiRequests.insert(reqData);
      db.saveDatabase();
    });

  } catch (err) {
    writeLog("error::SaveRequest(): " + err);
  }
}

export function UpdateRequest(reqData: IRequestModel) {
  try {
    const db = getDB();
    db.loadDatabase({}, function () {
      const apiRequests = db.getCollection('apiRequests');
      var req = apiRequests.findOne({ 'id': reqData.id });
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
      apiRequests.update(req);
      db.saveDatabase();
    });

  } catch (err) {
    writeLog("error::UpdateRequest(): " + err);
    throw err;
  }
}

export function GetRequestItem(reqId: string) {
  try {
    return new Promise<IRequestModel>((resolve, _reject) => {
      const db = getDB();
      db.loadDatabase({}, function (err: any) {
        if(err){
          resolve(null);
        }
        const results = db.getCollection('apiRequests').chain().find({ 'id': reqId }).data();
        resolve(results && results.length > 0 ? results[0] as IRequestModel : null);
      });
    });
  } catch (err) {
    writeLog("error::GetRequestItem(): " + err);
  }
}

export function GetExitingItem(webview: vscode.Webview, id: string, callback: any = null) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const results = db.getCollection('apiRequests').chain().find({ 'id': id }).data();
      if (webview) {
        webview.postMessage({ type: responseTypes.openExistingItemResponse, item: results });
      }

      if (callback) {
        callback(results);
      }
    });

  } catch (err) {
    writeLog("error::GetExitingItem(): " + err);
  }
}

export function CopyExitingItems(oldIds: string[], ids: any) {
  try {

    if (oldIds.length === 0) {
      return;
    }

    const db = getDB();

    db.loadDatabase({}, function () {
      let apiRequests = db.getCollection('apiRequests');
      const results = apiRequests.chain().find({ 'id': { '$in': oldIds } }).data({ forceClones: true, removeMeta: true });

      if (results && results.length > 0) {
        results.forEach(item => {
          item.id = ids[item.id];
        });

        apiRequests.insert(results);
        db.saveDatabase();
      }
    });

  } catch (err) {
    writeLog("error::CopyExitingItems(): " + err);
  }
}

export function DeleteExitingItem(id: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      db.getCollection('apiRequests').findAndRemove({ 'id': id });
      db.saveDatabase();
    });

  } catch (err) {
    writeLog("error::DeleteExitingItem(): " + err);
  }
}

export function DeleteExitingItems(ids: string[]) {
  try {

    if (ids.length === 0) {
      return;
    }

    const db = getDB();

    db.loadDatabase({}, function () {
      db.getCollection('apiRequests').findAndRemove({ 'id': { '$in': ids } });
      db.saveDatabase();
    });

  } catch (err) {
    writeLog("error::DeleteExitingItems(): " + err);
  }
}

function findItem(source: any, Id: string) {
  let pos = source.data.findIndex((el: any) => el.id === Id);

  if (pos !== -1) {
    return source.data[pos];
  }

  for (let i = 0; i < source.data.length; i++) {
    if (isFolder(source.data[i])) {
      return findItem(source.data[i], Id);
    }
  }

  return "";
}

function ExportItemFromFolder(source: any, apiRequests: any, exportData: any[], isSub: boolean, level: number): any {
  let totalResults = [];

  source.data.filter(item => item.data !== undefined).forEach((item) => {
    let currentResults = ExportItemFromFolder(item, apiRequests, [exportData], true, level + 1);
    totalResults.push(currentResults);
  });

  const ids = source.data.filter(item => item.data === undefined).map(itm => itm.id);
  let results = apiRequests.chain().find({ 'id': { '$in': ids } }).data({ forceClones: true, removeMeta: true });

  if (isSub) {
    source.data = totalResults.length > 0 ? [...totalResults, ...results] : results;
  } else {
    exportData = [...totalResults, ...results];
    return exportData;
  }

  return source;
}

export function Export(path: string, colId: string, hisId: string, folderId: string) {
  try {
    const db = getDB();
    const colDB = getCollectionDB();

    colDB.loadDatabase({}, function () {
      const cols = colDB.getCollection('userCollections').chain().find({ "id": colId }).data({ forceClones: true, removeMeta: true });

      db.loadDatabase({}, function () {
        const apiRequests = db.getCollection('apiRequests');
        let exportData = {
          app: "Fetch Client",
          id: cols[0].id,
          name: cols[0].name.toUpperCase().trim() === "DEFAULT" ? "Default Export" : cols[0].name,
          version: "1.0",
          type: "collections",
          createdTime: cols[0].createdTime,
          exportedDate: formatDate(),
          data: [],
          settings: cols[0].settings ? cols[0].settings : JSON.parse(JSON.stringify(InitialSettings))
        };

        if (hisId) {
          if (folderId) {
            let item = findItem(cols[0], folderId);
            let results = apiRequests.chain().find({ 'id': { '$in': [hisId] } }).data({ forceClones: true, removeMeta: true });
            (item as IFolder).data = results;
            exportData.data.push(item);
          } else {
            let results = apiRequests.chain().find({ 'id': { '$in': [hisId] } }).data({ forceClones: true, removeMeta: true });
            exportData.data.push(results[0]);
          }
        } else {
          if (folderId) {
            let folder = findItem(cols[0], folderId);
            let results = ExportItemFromFolder(folder, apiRequests, [], false, 0);
            if (results) {
              (folder as IFolder).data = results;
              exportData.data.push(folder);
            }
          } else {
            let results = ExportItemFromFolder(cols[0], apiRequests, [], false, 0);
            if (results) {
              exportData.data = results;
            }
          }
        }

        fs.writeFile(path, JSON.stringify(exportData), (error) => {
          if (error) {
            vscode.window.showErrorMessage("Could not save to '" + path + "'. Error Message : " + error.message);
            writeLog("error::ExportItem()::FileWrite()" + error.message);
          } else {
            vscode.window.showInformationMessage("Successfully saved to '" + path + "'.");
          }
        });
      });
    });

  } catch (err) {
    writeLog("error::Export(): " + err);
  }
}

export function RenameRequestItem(id: string, name: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      let req = db.getCollection('apiRequests').find({ 'id': id });
      if (req && req.length > 0) {
        req[0].name = name;
        db.saveDatabase();
      }
    });

  } catch (err) {
    writeLog("error::RenameRequestItem(): " + err);
  }
}

enum ImportType {
  FetchClient_1_0 = "FetchClient_1_0",
  Postman_2_1 = "Postman_2_1",
}

function ValidateData(data: string): ImportType | null {
  try {
    if (!data || data.length === 0 || !isJson(data)) {
      vscode.window.showErrorMessage("Could not import the collection - Empty Data.");
      writeLog("error::Import::ValidateData() " + "Error Message : Could not import the collection - Empty Data.");
      return null;
    }

    try {
      FetchClientDataProxy.Parse(data);
      return ImportType.FetchClient_1_0;
    } catch {
      let postmanData = JSON.parse(data) as PostmanSchema_2_1;
      if (postmanData.info?._postman_id && postmanData.info?.schema === POSTMAN_SCHEMA_V2_1) {
        return ImportType.Postman_2_1;
      }
      return null;
    }
  }
  catch (err) {
    vscode.window.showErrorMessage("Could not import the collection - Invalid Data.");
    writeLog("error::Import::ValidateData() " + "Error Message : Could not import the collection - " + err);
    return null;
  }
}

function insertCollections(colDB: loki, webviewView: vscode.WebviewView, fcCollection: ICollections) {
  colDB.loadDatabase({}, function () {
    const userCollections = colDB.getCollection('userCollections');
    userCollections.insert(fcCollection);
    colDB.saveDatabase();
    webviewView.webview.postMessage({ type: responseTypes.importResponse, data: fcCollection });
  });
}

export function Import(webviewView: vscode.WebviewView, path: string) {
  try {
    const data = fs.readFileSync(path, "utf8");

    console.log(data);

    switch (ValidateData(data)) {
      case ImportType.FetchClient_1_0:
        ImportFC(webviewView, data);
        break;
      case ImportType.Postman_2_1:
        ImportPostman(webviewView, data);
        break;
      default:
        vscode.window.showErrorMessage("Could not import the collection - Invalid data.");
    }

  } catch (err) {
    vscode.window.showErrorMessage("Could not import the collection - Invalid data.");
    writeLog("error::Import(): - Error Message : " + err);
  }
}

function ImportPostman(webviewView: vscode.WebviewView, data: string) {
  try {
    const convertedData = postmanImporter(data);
    if (!convertedData || !convertedData.fcCollection || !convertedData.fcRequests) {
      return;
    }

    const db = getDB();
    const colDB = getCollectionDB();
    const varDB = getVariableDB();

    db.loadDatabase({}, function () {
      const apiRequests = db.getCollection('apiRequests');
      apiRequests.insert(convertedData.fcRequests);
      db.saveDatabase();

      if (convertedData.fcVariable) {
        varDB.loadDatabase({}, function () {
          const userVariables = varDB.getCollection('userVariables');
          userVariables.insert(convertedData.fcVariable);
          varDB.saveDatabase();
          webviewView.webview.postMessage({ type: responseTypes.importVariableResponse, vars: convertedData.fcVariable });
          insertCollections(colDB, webviewView, convertedData.fcCollection);
        });
      } else {
        insertCollections(colDB, webviewView, convertedData.fcCollection);
      }
    });
  } catch (err) {
    vscode.window.showErrorMessage("Could not import the collection - Invalid data.");
    writeLog("error::ImportPostman(): - Error Message : " + err);
  }
}

function ImportFC(webviewView: vscode.WebviewView, data: string) {
  try {
    const parsedData = JSON.parse(data);

    const convertedData = fetchClientImporter(parsedData);
    if (!convertedData || !convertedData.fcCollection || !convertedData.fcRequests) {
      return;
    }

    const db = getDB();
    const colDB = getCollectionDB();

    db.loadDatabase({}, function () {
      const apiRequests = db.getCollection('apiRequests');
      apiRequests.insert(convertedData.fcRequests);
      db.saveDatabase();

      colDB.loadDatabase({}, function () {
        const userCollections = colDB.getCollection('userCollections');
        userCollections.insert(convertedData.fcCollection);
        colDB.saveDatabase();

        webviewView.webview.postMessage({ type: responseTypes.importResponse, data: convertedData.fcCollection });
      });
    });

  } catch (err) {
    vscode.window.showErrorMessage("Could not import the collection - Invalid data.");
    writeLog("error::ImportFC(): - Error Message : " + err);
  }
}

export function GetColsRequests(ids: string[], paths: any, webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const apiRequests = db.getCollection('apiRequests').find({ 'id': { '$in': ids } });
      webview.postMessage({ type: responseTypes.getCollectionsByIdResponse, collections: apiRequests, paths: paths });
    });

  } catch (err) {
    writeLog("error::GetColsRequests(): " + err);
  }
}
