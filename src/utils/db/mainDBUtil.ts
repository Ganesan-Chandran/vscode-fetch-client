import * as vscode from 'vscode';
import loki, { LokiFsAdapter } from 'lokijs';
import { v4 as uuidv4 } from 'uuid';
import { IRequestModel } from '../../fetch-client-ui/components/RequestUI/redux/types';
import { collectionDBPath, mainDBPath } from "./consts";
import { responseTypes } from '../configuration';
import { writeLog } from '../logger/logger';
import fs from "fs";
import { ICollections, IFolder, IHistory } from '../../fetch-client-ui/components/SideBar/redux/types';
import { formatDate } from '../helper';
import { FetchClientDataProxy } from '../ImportDataValidator';
import { getGlobalPath } from '../../extension';
import { isFolder } from '../../fetch-client-ui/components/SideBar/util';

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

export function Export(path: string, cols: ICollections, hisId: string, folderId: string) {
  try {
    const db = getDB();
    db.loadDatabase({}, function () {
      const apiRequests = db.getCollection('apiRequests');
      let exportData = {
        app: "Fetch Client",
        id: cols.id,
        name: cols.name.toUpperCase().trim() === "DEFAULT" ? "Default Export" : cols.name,
        version: "1.0",
        type: "collections",
        createdTime: cols.createdTime,
        exportedDate: formatDate(),
        data: []
      };

      if (hisId) {
        if (folderId) {
          let item = cols.data.filter(item => item.id === folderId);
          let results = apiRequests.chain().find({ 'id': { '$in': [hisId] } }).data({ forceClones: true, removeMeta: true });
          (item[0] as IFolder).data = results;
          exportData.data.push(item[0]);
        } else {
          let results = apiRequests.chain().find({ 'id': { '$in': [hisId] } }).data({ forceClones: true, removeMeta: true });
          exportData.data.push(results[0]);
        }
      } else {
        if (folderId) {
          let item = cols.data.filter(item => item.id === folderId);
          const ids = (item[0] as IFolder).data.map(item => item.id);
          let results = apiRequests.chain().find({ 'id': { '$in': ids } }).data({ forceClones: true, removeMeta: true });
          (item[0] as IFolder).data = results;
          exportData.data.push(item[0]);
        } else {
          let intData = [];
          cols.data.forEach((item) => {
            if (isFolder(item)) {
              const ids = (item as IFolder).data.map(item => item.id);
              if (ids.length > 0) {
                let results = apiRequests.chain().find({ 'id': { '$in': ids } }).data({ forceClones: true, removeMeta: true });
                (item as IFolder).data = results;
              }
              exportData.data.push(item);
            } else {
              let results = apiRequests.chain().find({ 'id': { '$in': [item.id] } }).data({ forceClones: true, removeMeta: true });
              intData.push(results[0]);
            }
          });

          exportData.data = exportData.data.concat(intData);
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

    let importedData = parsedData.data;
    let reqData = [];

    let colData: ICollections = {
      id: uuidv4(),
      name: parsedData.name,
      createdTime: formatDate(),
      variableId: "",
      data: []
    };

    importedData.forEach(item => {
      item.id = uuidv4();
      item.createdTime = formatDate();
      if (isFolder(item)) {
        item.data.forEach((itm, index) => {
          itm.id = uuidv4();
          itm.createdTime = formatDate();
          reqData.push(itm);
          let his: IHistory = {
            id: itm.id,
            method: itm.method,
            name: itm.name,
            url: itm.url,
            createdTime: itm.createdTime
          };
          item.data[index] = his;
        });
        colData.data.push(item);
      } else {
        reqData.push(item);
        let his: IHistory = {
          id: item.id,
          method: item.method,
          name: item.name,
          url: item.url,
          createdTime: formatDate()
        };
        colData.data.push(his);
      }
    });

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
