import * as vscode from "vscode";
import loki, { LokiFsAdapter } from "lokijs";
import { v4 as uuidv4 } from "uuid";
import { IRequestModel } from "../../fetch-client-ui/components/RequestUI/redux/types";
import { responseTypes } from "../configuration";
import { writeLog } from "../logger/logger";
import fs from "fs";
import {
  ICollections,
  IFolder,
  IHistory,
} from "../../fetch-client-ui/components/SideBar/redux/types";
import { formatDate } from "../helper";
import { FetchClientDataProxy } from "../ImportDataValidator";
import { isFolder } from "../../fetch-client-ui/components/SideBar/util";
import { InitialSettings } from "../../fetch-client-ui/components/SideBar/redux/reducer";
import { collectionDBPath, mainDBPath } from "./dbPaths";

function getDB(): loki {
  const idbAdapter = new LokiFsAdapter();
  const db = new loki(mainDBPath(), { adapter: idbAdapter });
  return db;
}

function getCollectionDB(): loki {
  const idbAdapter = new LokiFsAdapter();
  const db = new loki(collectionDBPath(), { adapter: idbAdapter });
  return db;
}

export function SaveRequest(reqData: IRequestModel) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const apiRequests = db.getCollection("apiRequests");
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
      const apiRequests = db.getCollection("apiRequests");
      var req = apiRequests.findOne({ id: reqData.id });
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
      apiRequests.update(req);
      db.saveDatabase();
    });
  } catch (err) {
    writeLog("error::UpdateRequest(): " + err);
    throw err;
  }
}

export function GetExitingItem(webview: vscode.Webview, id: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const results = db.getCollection('apiRequests').chain().find({ 'id': id }).data();
      webview.postMessage({ type: responseTypes.openExistingItemResponse, item: results });
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
      db.getCollection("apiRequests").findAndRemove({ id: id });
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
      db.getCollection("apiRequests").findAndRemove({ id: { $in: ids } });
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
        const apiRequests = db.getCollection("apiRequests");
        let exportData = {
          app: "Fetch Client",
          id: cols[0].id,
          name: cols[0].name.toUpperCase().trim() === "DEFAULT" ? "Default Export" : cols[0].name,
          version: "1.0",
          type: "collections",
          createdTime: cols[0].createdTime,
          exportedDate: formatDate(),
          data: [],
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
      let req = db.getCollection("apiRequests").find({ id: id });
      if (req && req.length > 0) {
        req[0].name = name;
        db.saveDatabase();
      }
    });
  } catch (err) {
    writeLog("error::RenameRequestItem(): " + err);
  }
}

function ValidateData(data: string): boolean {
  try {
    if (!data || data.length === 0) {
      vscode.window.showErrorMessage("Could not import the collection - Empty Data.");
      writeLog("error::Import::ValidateData() " + "Error Message : Could not import the collection - Empty Data.");
      return false;
    }

    FetchClientDataProxy.Parse(data);

    return true;
  }
  catch (err) {
    vscode.window.showErrorMessage("Could not import the collection - Invalid Data.");
    writeLog("error::Import::ValidateData() " + "Error Message : Could not import the collection - " + err);
    return false;
  }
}

function ImportFolder(source: any, importData: any, reqData: any): any {
  for (let i = 0; i < source.data.length; i++) {
    if (isFolder(source.data[i])) {
      let folder: IFolder = {
        id: uuidv4(),
        name: source.data[i].name,
        createdTime: formatDate(),
        type: "folder",
        data: [],
        settings: source.data[i].settings ? source.data[i].settings : InitialSettings
      };
      let result = ImportFolder(source.data[i], folder, reqData);
      importData.data.push(result.importData);
    } else {
      source.data[i].id = uuidv4();
      source.data[i].createdTime = formatDate();
      let his: IHistory = {
        id: source.data[i].id,
        method: source.data[i].method,
        name: source.data[i].name,
        url: source.data[i].url,
        createdTime: source.data[i].createdTime,
      };
      reqData.push(source.data[i]);
      importData.data.push(his);
    }
  }

  return { importData, reqData };
}

export function Import(webviewView: vscode.WebviewView, path: string) {
  try {
    const db = getDB();
    const colDB = getCollectionDB();

    const data = fs.readFileSync(path, "utf8");

    if (!ValidateData(data)) {
      return;
    }

    const parsedData = JSON.parse(data);

    let importedData = parsedData.data;
    let reqData = [];

    let colData: ICollections = {
      id: uuidv4(),
      name: parsedData.name,
      createdTime: formatDate(),
      variableId: "",
      data: [],
      settings: parsedData.settings ? parsedData.settings : InitialSettings,
    };

    importedData.forEach((item) => {
      item.id = uuidv4();
      item.createdTime = formatDate();
      if (isFolder(item)) {
        let importData: any;
        let folder: IFolder = {
          id: uuidv4(),
          name: item.name,
          createdTime: formatDate(),
          type: "folder",
          data: [],
          settings: item.settings ? item.settings : InitialSettings,
        };
        ({ importData, reqData } = ImportFolder(item, folder, reqData));
        colData.data.push(importData);
      } else {
        item.id = uuidv4();
        item.createdTime = formatDate();
        reqData.push(item);
        let his: IHistory = {
          id: item.id,
          method: item.method,
          name: item.name,
          url: item.url,
          createdTime: formatDate(),
        };
        colData.data.push(his);
      }
    });

    db.loadDatabase({}, function () {
      const apiRequests = db.getCollection("apiRequests");
      apiRequests.insert(reqData);
      db.saveDatabase();

      colDB.loadDatabase({}, function () {
        const userCollections = colDB.getCollection("userCollections");
        userCollections.insert(colData);
        colDB.saveDatabase();

        webviewView.webview.postMessage({ type: responseTypes.importResponse, data: colData });
      });
    });
  } catch (err) {
    vscode.window.showErrorMessage("Could not import the collection - Invalid data.");
    writeLog("error::Import(): - Error Mesaage : " + err);
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
