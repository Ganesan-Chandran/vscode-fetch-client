import * as vscode from 'vscode';
import loki, { LokiFsAdapter } from 'lokijs';
import { v4 as uuidv4 } from 'uuid';
import { ICollections, IColSettings, IFolder, IHistory } from "../../fetch-client-ui/components/SideBar/redux/types";
import { collectionDBPath, mainDBPath } from "./consts";
import { responseTypes } from '../configuration';
import { CopyExitingItems, DeleteExitingItem, DeleteExitingItems, GetColsRequests, RenameRequestItem } from './mainDBUtil';
import { IRequestModel } from '../../fetch-client-ui/components/RequestUI/redux/types';
import { writeLog } from '../logger/logger';
import { formatDate } from '../helper';
import { getGlobalPath } from '../../extension';
import { isFolder } from '../../fetch-client-ui/components/SideBar/util';
import { InitialColSettings } from '../../fetch-client-ui/components/SideBar/redux/reducer';
import { SettingsType } from '../../fetch-client-ui/components/Collection/consts';


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

function findItem(cols: any[], folderId: string, historyId: string) {
  let pos = -1;
  let pos1 = -1;
  if (folderId) {
    // Find Folder
    pos = cols[0].data.findIndex((el: any) => el.id === folderId);
    if (pos !== -1) {
      // Find History Item
      pos1 = cols[0].data[pos].data.findIndex((el: any) => el.id === historyId);
      if (pos1 !== -1) {
        return cols[0].data[pos].data[pos1];
      }
      return "";
    }
    return "";
  } else {
    // Find History Item
    pos = cols[0].data.findIndex((el: any) => el.id === historyId);
    if (pos !== -1) {
      return cols[0].data[pos];
    }
    return "";
  }
}

function findFolderItem(cols: any[], folderId: string) {
  let pos = -1;
  pos = cols[0].data.findIndex((el: any) => el.id === folderId);
  if (pos !== -1) {
    return cols[0].data[pos];
  }
  return "";
}

function findFolderIndex(cols: any[], folderId: string) {
  let pos = -1;
  pos = cols[0].data.findIndex((el: any) => el.id === folderId);
  return pos;
}

function findHistoryIndex(cols: any[], folderId: string, historyId: string) {
  let pos = -1;
  let pos1 = -1;
  if (folderId) {
    pos = cols[0].data.findIndex((el: any) => el.id === folderId);
    if (pos !== -1) {
      pos1 = cols[0].data[pos].data.findIndex((el: any) => el.id === historyId);
      return pos1;
    }
    return pos;
  } else {
    pos = cols[0].data.findIndex((el: any) => el.id === historyId);
    return pos;
  }
}

function findHistoryIndexWithoutFolder(cols: any, historyId: string): { folderIndex: number, historyIndex: number } {
  for (let i = 0; i < cols.data.length; i++) {
    if (cols.data[i].type) {
      for (let j = 0; j < cols.data[i].data.length; j++) {
        if (cols.data[i].data[j].id === historyId) {
          return { folderIndex: i, historyIndex: j };
        }
      }
    } else {
      if (cols.data[i].id === historyId) {
        return { folderIndex: -1, historyIndex: i };
      }
    }
  }
}

function getAllIds(cols: any, newArray: string[]) {
  cols.data.forEach(function (item) {
    if (isFolder(item)) {
      getAllIds(item, newArray);
    } else {
      newArray.push(item.id);
    }
  });

  return newArray;
}

export function CreateNewCollection(name: string, sideBarView: vscode.WebviewView) {
  try {
    const colDB = getDB();
    colDB.loadDatabase({}, function () {
      let item: ICollections = {
        id: uuidv4(),
        createdTime: formatDate(),
        name: name,
        data: [],
        variableId: ""
      };
      const userCollections = colDB.getCollection('userCollections');
      userCollections.insert(item);
      colDB.saveDatabase();
      if (sideBarView) {
        sideBarView.webview.postMessage({ type: responseTypes.appendToCollectionsResponse, collection: item });
      }
    });
  } catch (err) {
    writeLog("error::CreateNewCollection(): " + err);
  }
}

export function AddToCollection(item: ICollections, hasFolder: boolean, isNewFolder: boolean, webview: vscode.Webview, sideBarView: vscode.WebviewView) {
  try {
    const colDB = getDB();
    const reqDB = getRequestDB();
    const reqId = hasFolder ? (item.data[0] as IFolder).data[0].id : item.data[0].id;
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

          if (hasFolder) {
            (item.data[0] as IFolder).data[0].id = newId;
          } else {
            item.data[0].id = newId;
          }

          if (colItem === null || colItem.length === 0) {
            userCollections.insert(item);
          } else {
            if (item && item.data && item.data.length > 0) {

              if (hasFolder) {
                if (isNewFolder) {
                  colItem[0].data.push(item.data[0]);
                } else {
                  let folder = findFolderItem(colItem, item.data[0].id);
                  folder.data.push((item.data[0] as IFolder).data[0]);
                }
              } else {
                colItem[0].data.push(item.data[0]);
              }
            }
          }

          colDB.saveDatabase();

          if (webview) {
            webview.postMessage({ type: responseTypes.addToCollectionsResponse });
          }

          if (sideBarView) {
            sideBarView.webview.postMessage({ type: responseTypes.appendToCollectionsResponse, collection: colItem[0] });
          }
        }
      });
    });
  } catch (err) {
    writeLog("error::AddToCollection(): " + err);
  }
}

export function DuplicateItem(coldId: string, folderId: string, historyId: string, isFolder: boolean, sideBarView: vscode.WebviewView) {
  try {
    const colDB = getDB();
    let collections;

    colDB.loadDatabase({}, function () {
      const collections = colDB.getCollection('userCollections').find({ 'id': coldId });
      let ids = {};
      let oldIds = [];

      if (isFolder) {
        let item = findFolderItem(collections, folderId);
        let folder: IFolder = {
          id: uuidv4(),
          name: item.name + " (Copy)",
          createdTime: formatDate(),
          type: "folder",
          data: item.data.length > 0 ? item.data.map(itm => {
            let newId = uuidv4();
            ids[itm.id] = newId;
            oldIds.push(itm.id);
            let his: IHistory = {
              id: newId,
              method: itm.method,
              name: itm.name,
              url: itm.url,
              createdTime: formatDate()
            };
            return his;
          }) : []
        };
        collections[0].data.push(folder);
      } else {
        if (folderId) {
          let folder = findFolderItem(collections, folderId);
          let item = findItem(collections, folderId, historyId);
          let newId = uuidv4();
          ids[item.id] = newId;
          oldIds.push(item.id);
          let his: IHistory = {
            id: newId,
            method: item.method,
            name: item.name + " (Copy)",
            url: item.url,
            createdTime: formatDate()
          };
          folder.data.push(his);
        }
        if (historyId) {
          let item = findItem(collections, folderId, historyId);
          let newId = uuidv4();
          ids[item.id] = newId;
          oldIds.push(item.id);
          let his: IHistory = {
            id: newId,
            method: item.method,
            name: item.name + " (Copy)",
            url: item.url,
            createdTime: formatDate()
          };
          collections[0].data.push(his);
        }

        if (coldId) {
          CopyToCollection(coldId, uuidv4(), collections[0].name + " (Copy)", null, sideBarView);
          return;
        }
      }

      colDB.saveDatabase();
      CopyExitingItems(oldIds, ids);

      if (sideBarView) {
        sideBarView.webview.postMessage({ type: responseTypes.copyToCollectionsResponse, data: collections[0] });
      }
    });
  } catch (err) {
    writeLog("error::DuplicateItem(): " + err);
  }
}

export function NewRequestToCollection(item: IHistory, colId: string, folderId: string, sideBarView: vscode.WebviewView) {
  try {
    const colDB = getDB();

    colDB.loadDatabase({}, function () {
      let pos = -1;
      let cols = colDB.getCollection('userCollections').find({ 'id': colId });
      if (cols !== null) {
        if (folderId) {
          pos = cols[0].data.findIndex((el: any) => el.id === folderId);
          if (pos !== -1) {
            cols[0].data[pos].data.push(item);
          }
        } else {
          cols[0].data.push(item);
        }
      }

      colDB.saveDatabase();

      if (sideBarView) {
        sideBarView.webview.postMessage({ type: responseTypes.createNewResponse, item: item, id: colId, folderId: folderId });
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
            if (isFolder(item)) {
              item = (item as IFolder);
              let folder: IFolder = {
                id: uuidv4(),
                name: item.name,
                createdTime: formatDate(),
                type: "folder",
                data: item.data.length > 0 ? item.data.map(itm => {
                  let newId = uuidv4();
                  ids[itm.id] = newId;
                  let his: IHistory = {
                    id: newId,
                    method: itm.method,
                    name: itm.name,
                    url: itm.url,
                    createdTime: formatDate()
                  };
                  return his;
                }) : []
              };
              return folder;
            } else {
              item = (item as IHistory);
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
            }
          }) : []
        };

        cols = items;
        userCollections.insert(items);

      } else {
        if ((collections[0] as ICollections).data.length > 0) {
          let items = (collections[0] as ICollections).data.map(item => {
            if (isFolder(item)) {
              item = (item as IFolder);
              let folder: IFolder = {
                id: uuidv4(),
                name: item.name,
                createdTime: formatDate(),
                type: "folder",
                data: item.data.length > 0 ? item.data.map(itm => {
                  let newId = uuidv4();
                  ids[itm.id] = newId;
                  let his: IHistory = {
                    id: newId,
                    method: itm.method,
                    name: itm.name,
                    url: itm.url,
                    createdTime: formatDate()
                  };
                  return his;
                }) : []
              };
              return folder;
            } else {
              item = (item as IHistory);
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
            }
          });

          items.forEach(item => {
            colItem[0].data.push(item);
          });

          cols = colItem[0];
        }
      }

      const oldIds = collections[0].data.map((item: IHistory | IFolder) => {
        if (isFolder(item)) {
          (item as IFolder).data.map(itm => {
            return itm.id;
          });
        } else {
          return item.id;
        }
      });

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
      let folders = [];
      userCollections.forEach(col => {
        col.data.forEach(item => {
          if (item.data) {
            folders.push({ colId: col.id, value: item.id, name: item.name, disabled: false });
          }
        });
        collections.push({ value: col.id, name: col.name, disabled: false });
      });

      if (from === "addtocol") {
        webview.postMessage({ type: responseTypes.getAllCollectionNameResponse, collectionNames: collections, folderNames: folders });
      } else {
        webview.postMessage({ type: responseTypes.getAllCollectionNamesResponse, collectionNames: collections, folderNames: folders });
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

export function RenameCollectionItem(webviewView: vscode.WebviewView, colId: string, historyId: string, folderId: string, isFolder: boolean, name: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      let cols = db.getCollection('userCollections').find({ 'id': colId });
      let item;
      if (cols !== null) {
        if (isFolder) {
          item = findFolderItem(cols, folderId);
        } else {
          item = findItem(cols, folderId, historyId);
        }
        if (item) {
          item["name"] = name;
        }

        db.saveDatabase();

        if (!isFolder) {
          RenameRequestItem(historyId, name);
        }

        webviewView.webview.postMessage(
          {
            type: responseTypes.renameCollectionItemResponse,
            params: { colId: colId, historyId: historyId, folderId: folderId, isFolder: isFolder, name: name }
          }
        );
      }
    });
  } catch (err) {
    writeLog("error::RenameCollectionItem(): " + err);
  }
}

export function DeleteCollectionItem(webviewView: vscode.WebviewView, colId: string, folderId: string, historyId: string, isFolder: boolean) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      let pos = -1;
      let pos1 = -1;
      let ids;
      let cols = db.getCollection('userCollections').find({ 'id': colId });
      if (cols !== null) {
        if (folderId) {
          pos = findFolderIndex(cols, folderId);
        }
        if (isFolder) {
          if (pos !== -1) {
            ids = cols[0].data[pos].data.map(item => item.id);
            cols[0].data.splice(pos, 1);
          }
        } else {
          pos1 = findHistoryIndex(cols, folderId, historyId);
          if (folderId) {
            if (pos1 !== -1) {
              cols[0].data[pos].data.splice(pos1, 1);
              ids = [historyId];
            }
          } else {
            if (pos1 !== -1) {
              cols[0].data.splice(pos1, 1);
              ids = [historyId];
            }
          }
        }
      }
      db.saveDatabase();
      DeleteExitingItems(ids);
      webviewView.webview.postMessage({ type: responseTypes.deleteCollectionItemResponse, params: { colId: colId, folderId: folderId, historyId: historyId, isFolder: isFolder } });
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
      let ids = [];
      ids = getAllIds(results[0], ids);

      userCollections.findAndRemove({ 'id': colId });
      db.saveDatabase();

      DeleteExitingItems(ids);

      webviewView.webview.postMessage({ type: responseTypes.deleteCollectionResponse, id: colId });
    });

  } catch (err) {
    writeLog("error::DeleteCollection(): " + err);
  }
}


export function DeleteAllCollectionItems(webviewView: vscode.WebviewView, colId: string, folderId: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userCollections = db.getCollection('userCollections');
      const results = userCollections.chain().find({ 'id': colId }).data();
      let ids = [];
      if (folderId) {
        let item = findFolderItem(results, folderId);
        if (item) {
          ids = item.data.map(item => item.id);
          item.data.length = 0;
        }
      } else {
        ids = getAllIds(results[0], ids);
        results[0].data.length = 0;
      }

      db.saveDatabase();
      DeleteExitingItems(ids);
      webviewView.webview.postMessage({ type: responseTypes.clearResponse, id: colId, folderId: folderId });
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
      const cols = db.getCollection('userCollections').chain().find({ 'variableId': varId }).data();
      let colNames = [];
      if (cols && cols.length > 0) {
        colNames = cols.map((item) => { return item.name; });
      }
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

function getAllItemIdsInCollection(cols: any) {
  let oldIds = [];
  cols.data.forEach((item: IHistory | IFolder) => {
    if (isFolder(item)) {
      (item as IFolder).data.map(itm => {
        oldIds.push(itm.id);
      });
    }
  });

  let oldIds1 = [];
  cols.data.forEach((item: IHistory | IFolder) => {
    if (!isFolder(item)) {
      oldIds1.push(item.id);
    }
  });

  return [...oldIds, ...oldIds1];
}

function getAllItemIdsInFolder(fol: any) {
  let oldIds = [];
  fol.data.forEach((item: IHistory) => {
    oldIds.push(item.id);
  });

  return oldIds;
}

export function GetAllCollectionsById(id: string, type: string, webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      let ids = [];
      let results;
      if (type === "col") {
        results = db.getCollection('userCollections').chain().find({ 'id': id }).data({ forceClones: true, removeMeta: true });
        ids = getAllItemIdsInCollection(results[0]);
      } else {
        results = db.getCollection('userCollections').chain().find({ 'data.id': id }).data({ forceClones: true, removeMeta: true });
        let item = findFolderItem(results, id);
        ids = getAllItemIdsInFolder(item);
      }
      GetColsRequests(ids, webview);
    });

  } catch (err) {
    writeLog("error::GetAllCollectionsById(): " + err);
  }
}

export function NewFolderToCollection(item: IFolder, colId: string, sideBarView: vscode.WebviewView) {
  try {
    const colDB = getDB();

    colDB.loadDatabase({}, function () {
      const userCollections = colDB.getCollection('userCollections');
      let colItem = userCollections.find({ id: colId });
      colItem[0].data.push(item);
      colDB.saveDatabase();

      if (sideBarView) {
        sideBarView.webview.postMessage({ type: responseTypes.createNewFolderResponse, folder: item, colId: colId });
      }
    });
  } catch (err) {
    writeLog("error::NewFolderToCollection(): " + err);
  }
}

export function UpdateCollection(item: IHistory) {
  try {
    const colDB = getDB();

    colDB.loadDatabase({}, function () {
      const userCollections = colDB.getCollection('userCollections');
      let req = userCollections.chain().find({ 'data.id': item.id }).data();
      if (req.length === 0) {
        req = userCollections.chain().find({ 'data.data.id': item.id }).data();
      }
      if (req.length > 0) {
        const { folderIndex, historyIndex } = findHistoryIndexWithoutFolder(req[0], item.id);
        if (folderIndex === -1) {
          req[0].data[historyIndex].name = item.name;
          req[0].data[historyIndex].method = item.method;
          req[0].data[historyIndex].url = item.url;
        } else {
          req[0].data[folderIndex].data[historyIndex].name = item.name;
          req[0].data[folderIndex].data[historyIndex].method = item.method;
          req[0].data[folderIndex].data[historyIndex].url = item.url;
        }
        colDB.saveDatabase();
      }
    });

  } catch (err) {
    writeLog("error::UpdateCollection(): " + err);
  }
}

export function GetCollectionSettings(webview: vscode.Webview, id: string, type: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      let settings;

      let item = db.getCollection('userCollections').find(type === SettingsType.Collection ? { 'id': id } : { "data.id": id });

      if (item !== null && item.length > 0) {
        if (type === SettingsType.Collection) {
          settings = item[0].settings;
        } else {
          let folderItem = findFolderItem(item, id);
          settings = folderItem[0].settings;
        }
      }

      if (webview) {
        webview.postMessage({ type: responseTypes.getColSettingsResponse, settings: settings });
      }
    });
  }
  catch (err) {
    writeLog("error::GetCollectionSettings(): " + err);
  }
}

export function SaveCollectionSettings(webview: vscode.Webview, id: string, settings: IColSettings, type: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      let item = db.getCollection('userCollections').find(type === SettingsType.Collection ? { 'id': id } : { "data.id": id });
      if (item !== null && item.length > 0) {
        if (type === SettingsType.Collection) {
          item[0].settings = settings;
        } else {
          let folderItem = findFolderItem(item, id);
          folderItem[0].settings = settings;
        }
        db.saveDatabase();
      }

      if (webview) {
        webview.postMessage({ type: responseTypes.saveColSettingsResponse, id: id });
      }
    });
  }
  catch (err) {
    writeLog("error::SaveCollectionSettings(): " + err);
  }
}