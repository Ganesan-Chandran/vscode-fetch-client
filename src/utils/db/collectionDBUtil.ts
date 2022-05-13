import * as vscode from 'vscode';
import loki, { LokiFsAdapter } from 'lokijs';
import { v4 as uuidv4 } from 'uuid';
import fs from "fs";
import { ICollections, IHistory } from "../../fetch-client-ui/components/SideBar/redux/types";
import { collectionDBPath, mainDBPath } from "./consts";
import { responseTypes } from '../configuration';
import { CopyExitingItems, DeleteExitingItem, DeleteExitingItems, GetColsRequests, RenameRequestItem } from './mainDBUtil';
import { IRequestModel } from '../../fetch-client-ui/components/RequestUI/redux/types';
import { writeLog } from '../logger/logger';
import { formatDate } from '../helper';
import { getGlobalPath } from '../../extension';


function getDB(): loki {
  const idbAdapter = new LokiFsAdapter();
  const db = new loki(getGlobalPath() + "\\" + collectionDBPath, { adapter: idbAdapter });
  return db;
}

function getRequestDB(): loki {
  const idbAdapter = new LokiFsAdapter();
  const db = new loki(getGlobalPath() + "\\" + mainDBPath, { adapter: idbAdapter });
  return db;
}

export function AddToCollection(item: ICollections, webview: vscode.Webview, sideBarView: vscode.WebviewView) {
  try {
    const colDB = getDB();
    const reqDB = getRequestDB();
    const reqId = item.data[0].id;
    const newId = uuidv4();

    colDB.loadDatabase({}, function () {
      const userCollections = colDB.getCollection('userCollections');

      reqDB.loadDatabase({}, function () {
        //Add new item to main DB
        const apiRequests = reqDB.getCollection('apiRequests');
        let results = apiRequests.chain().find({ 'id': reqId }).data({ forceClones: true, removeMeta: true });
        if (results && results.length > 0) {
          let reqData = (results[0] as IRequestModel);
          reqData.id = newId;
          apiRequests.insert(reqData);
          reqDB.saveDatabase();

          // Save item to collection DB
          let colItem = userCollections.find({ id: item.id });
          if (colItem === null || colItem.length === 0) {
            item.data[0].id = newId;
            userCollections.insert(item);
          } else {
            if (item && item.data && item.data.length > 0) {
              item.data[0].id = newId;
              colItem[0].data.push(item.data[0]);
            }
          }
          colDB.saveDatabase();

          if (webview) {
            webview.postMessage({ type: responseTypes.addToCollectionsResponse });
          }

          if (sideBarView) {
            sideBarView.webview.postMessage({ type: responseTypes.appendToCollectionsResponse, collection: item });
          }
        }
      });
    });
  } catch (err) {
    writeLog("error::AddToCollection(): " + err);
  }
}

export function NewRequestToCollection(item: IHistory, colId: string, sideBarView: vscode.WebviewView) {
  try {
    const colDB = getDB();

    colDB.loadDatabase({}, function () {
      const results = colDB.getCollection('userCollections').find({ 'id': colId });

      if (results && results.length > 0) {
        results[0].data.push(item);
      }
      
      colDB.saveDatabase();

      if (sideBarView) {
        sideBarView.webview.postMessage({ type: responseTypes.createNewResponse, item: item, id: colId });
      }
      
    });
  } catch (err) {
    writeLog("error::NewRequestToCollection(): " + err);
  }
}

export function CopyToCollection(sourceId: string, destID: string, destName: string, webview: vscode.Webview, sideBarView: vscode.WebviewView) {
  try {
    const colDB = getDB();

    colDB.loadDatabase({}, function () {
      const userCollections = colDB.getCollection('userCollections');
      let collections = userCollections.chain().find({ 'id': sourceId }).data({ forceClones: true, removeMeta: true });

      let colItem = userCollections.find({ id: destID });
      let cols: any;
      let ids = {};

      if (colItem === null || colItem.length === 0) {
        let items: ICollections = {
          id: destID,
          name: destName,
          createdTime: formatDate(),
          variableId: "",
          data: (collections[0] as ICollections).data.length > 0 ? (collections[0] as ICollections).data.map(item => {
            let newId = uuidv4();
            ids[item.id] = newId;
            let his: IHistory = {
              id: newId,
              method: item.method,
              name: item.name,
              url: item.url,
              createdTime: formatDate()
            };
            return his;
          }) : []
        };

        cols = items;
        userCollections.insert(items);

      } else {
        if ((collections[0] as ICollections).data.length > 0) {
          let hisItems = (collections[0] as ICollections).data.map(item => {
            let newId = uuidv4();
            ids[item.id] = newId;
            let his: IHistory = {
              id: newId,
              method: item.method,
              name: item.name,
              url: item.url,
              createdTime: formatDate()
            };
            return his;
          });

          hisItems.forEach(item => {
            colItem[0].data.push(item);
          });

          cols = colItem[0];
        }
      }

      const oldIds = collections[0].data.map(item => { return item.id; });

      colDB.saveDatabase();
      CopyExitingItems(oldIds, ids);

      if (webview) {
        webview.postMessage({ type: responseTypes.copyToCollectionsResponse });
      }

      if (sideBarView) {
        sideBarView.webview.postMessage({ type: responseTypes.copyToCollectionsResponse, data: cols });
      }
    });

  } catch (err) {
    writeLog("error::CopyToCollection(): " + err);
  }
}

export function GetAllCollectionName(webview: vscode.Webview, from: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userCollections = db.getCollection('userCollections').data;
      let collections = [];
      userCollections.forEach(item => {
        collections.push({ value: item.id, name: item.name, disabled: false });
      });

      if (from === "addtocol") {
        webview.postMessage({ type: responseTypes.getAllCollectionNameResponse, collectionNames: collections });
      } else {
        webview.postMessage({ type: responseTypes.getAllCollectionNamesResponse, collectionNames: collections });
      }

    });

  } catch (err) {
    writeLog("error::GetAllHistory(): " + err);
  }
}

export function GetAllCollections(webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userCollections = db.getCollection('userCollections').data;
      webview.postMessage({ type: responseTypes.getAllCollectionsResponse, collections: userCollections });
    });

  } catch (err) {
    writeLog("error::GetAllHistory(): " + err);
  }
}

export function RenameCollectionItem(webviewView: vscode.WebviewView, colId: string, historyId: string, name: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      let pos = -1;
      let cols = db.getCollection('userCollections').find({ 'id': colId });
      if (cols !== null) {
        pos = cols[0].data.findIndex((el: any) => el.id === historyId);
        if (pos !== -1) {
          cols[0].data[pos]["name"] = name;
          db.saveDatabase();
          RenameRequestItem(historyId, name);
        }
      }
      webviewView.webview.postMessage({ type: responseTypes.renameCollectionItemResponse, params: { colId: colId, historyId: historyId, name: pos === -1 ? "" : name } });
    });

  } catch (err) {
    writeLog("error::RenameCollectionItem(): " + err);
  }
}

export function DeleteCollectionItem(webviewView: vscode.WebviewView, colId: string, historyId: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      let pos = -1;
      let cols = db.getCollection('userCollections').find({ 'id': colId });
      if (cols !== null) {
        pos = cols[0].data.findIndex((el: any) => el.id === historyId);
        if (pos !== -1) {
          cols[0].data.splice(pos, 1);
          db.saveDatabase();
          DeleteExitingItem(historyId);
        }
      }
      db.saveDatabase();
      webviewView.webview.postMessage({ type: responseTypes.deleteCollectionItemResponse, params: { colId: colId, historyId: historyId } });
    });

  } catch (err) {
    writeLog("error::DeleteCollectionItem(): " + err);
  }
}

export function RenameCollection(webviewView: vscode.WebviewView, colId: string, name: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      db.getCollection('userCollections').findAndUpdate({ 'id': colId }, item => { item.name = name; });
      db.saveDatabase();
      webviewView.webview.postMessage({ type: responseTypes.renameCollectionResponse, params: { id: colId, name: name } });
    });

  } catch (err) {
    writeLog("error::RenameCollection(): " + err);
  }
}

export function DeleteCollection(webviewView: vscode.WebviewView, colId: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userCollections = db.getCollection('userCollections');
      let results = userCollections.chain().find({ 'id': colId }).data({ forceClones: true, removeMeta: true });

      const ids = results[0].data.map(item => item.id);

      userCollections.findAndRemove({ 'id': colId });
      db.saveDatabase();

      DeleteExitingItems(ids);

      webviewView.webview.postMessage({ type: responseTypes.deleteCollectionResponse, id: colId });
    });

  } catch (err) {
    writeLog("error::DeleteCollection(): " + err);
  }
}


export function DeleteAllCollectionItems(webviewView: vscode.WebviewView, colId: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userCollections = db.getCollection('userCollections');
      const results = userCollections.chain().find({ 'id': colId }).data();
      const ids = results[0].data.map(item => item.id);

      results[0].data.length = 0;

      db.saveDatabase();

      DeleteExitingItems(ids);

      webviewView.webview.postMessage({ type: responseTypes.clearResponse, id: colId });
    });

  } catch (err) {
    writeLog("error::DeleteAllCollectionItems(): " + err);
  }
}

export function AttachVariable(colId: string, varId: string, webview: vscode.Webview, sideBarView: vscode.WebviewView) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      db.getCollection('userCollections').findAndUpdate({ 'id': colId }, item => { item.variableId = varId; });
      db.saveDatabase();

      if (webview) {
        webview.postMessage({ type: responseTypes.attachVariableResponse });
      }

      if (sideBarView) {
        sideBarView.webview.postMessage({ type: responseTypes.attachVariableResponse, params: { id: colId, varId: varId } });
      }
    });

  } catch (err) {
    writeLog("error::AttachVariable(): " + err);
  }
}

export function GetCollectionsByVariable(varId: string, webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const colNames = db.getCollection('userCollections').find({ 'variableId': varId })?.map((item) => { return item.name; });
      webview.postMessage({ type: responseTypes.getAttchedColIdsResponse, colNames: colNames });
    });

  } catch (err) {
    writeLog("error::GetCollectionsByVariable(): " + err);
  }
}

export function RemoveVariable(varId: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      db.getCollection('userCollections').findAndUpdate({ 'variableId': varId }, item => { item.variableId = ""; });
      db.saveDatabase();
    });

  } catch (err) {
    writeLog("error::RemoveVariable(): " + err);
  }
}

export function GetAllCollectionsById(id: string, webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      let results = db.getCollection('userCollections').chain().find({ 'id': id }).data({ forceClones: true, removeMeta: true });
      const ids = results[0].data.map(item => item.id);
      GetColsRequests(ids, webview);
    });

  } catch (err) {
    writeLog("error::GetAllCollectionsById(): " + err);
  }
}