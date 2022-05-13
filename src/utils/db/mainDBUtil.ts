import * as vscode from 'vscode';
import loki, { LokiFsAdapter } from 'lokijs';
import { v4 as uuidv4 } from 'uuid';
import { IRequestModel } from '../../fetch-client-ui/components/RequestUI/redux/types';
import { collectionDBPath, mainDBPath } from "./consts";
import { responseTypes } from '../configuration';
import { writeLog } from '../logger/logger';
import fs from "fs";
import { ICollections, IHistory } from '../../fetch-client-ui/components/SideBar/redux/types';
import { formatDate } from '../helper';
import { FetchClientDataProxy } from '../ImportDataValidator';
import { getGlobalPath } from '../../extension';

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
    const db = getDB();

    db.loadDatabase({}, function () {
      db.getCollection('apiRequests').findAndRemove({ 'id': { '$in': ids } });
      db.saveDatabase();
    });

  } catch (err) {
    writeLog("error::DeleteExitingItems(): " + err);
  }
}

export function Export(path: string, cols: ICollections, hisId: string) {
  try {
    const db = getDB();
    db.loadDatabase({}, function () {
      const apiRequests = db.getCollection('apiRequests');
      const ids = hisId ? [hisId] : cols.data.map(item => item.id);
      let results = apiRequests.chain().find({ 'id': { '$in': ids } }).data({ forceClones: true, removeMeta: true });
      let exportData = {
        app: "Fetch Client",
        id: cols.id,
        name: cols.name.toUpperCase().trim() === "DEFAULT" ? "Default Export" : cols.name,
        version: "1.0",
        type: "collections",
        createdTime: cols.createdTime,
        exportedDate: formatDate(),
        data: results
      };

      fs.writeFile(path, JSON.stringify(exportData), (error) => {
        if (error) {
          vscode.window.showErrorMessage("Could not save to '" + path + "'. Error Message : " + error.message);
          writeLog("error::ExportItem()::FileWrite()" + error.message);
        } else {
          vscode.window.showInformationMessage("Successfully saved to '" + path + "'.");
        }
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

export function Import(webviewView: vscode.WebviewView, path: string) {
  try {
    const db = getDB();
    const colDB = getCollectionDB();

    const data = fs.readFileSync(path, "utf8");

    if (!ValidateData(data)) {
      return;
    }

    const parsedData = JSON.parse(data);

    let reqData = parsedData.data as IRequestModel[];

    reqData.forEach(item => {
      item.id = uuidv4();
      item.createdTime = formatDate();
    });

    let colData: ICollections = {
      id: uuidv4(),
      name: parsedData.name,
      createdTime: formatDate(),
      variableId: "",
      data: reqData.map(item => {
        let his: IHistory = {
          id: item.id,
          method: item.method,
          name: item.name,
          url: item.url,
          createdTime: formatDate()
        };
        return his;
      })
    };

    db.loadDatabase({}, function () {
      const apiRequests = db.getCollection('apiRequests');
      apiRequests.insert(reqData);
      db.saveDatabase();

      colDB.loadDatabase({}, function () {
        const userCollections = colDB.getCollection('userCollections');
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

export function GetColsRequests(ids: string[], webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
     const apiRequests = db.getCollection('apiRequests').find({ 'id': { '$in': ids } });
      webview.postMessage({ type: responseTypes.getCollectionsByIdResponse, collections: apiRequests });
    });

  } catch (err) {
    writeLog("error::GetColsRequests(): " + err);
  }
}
