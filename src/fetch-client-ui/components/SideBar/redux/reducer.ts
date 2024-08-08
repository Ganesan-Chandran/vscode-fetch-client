import { InitialAuth, InitialPreFetch, InitialRequestHeaders } from "../../RequestUI/redux/reducer";
import { isFolder } from "../util";
import {
  FETCH_CLIENT_SET_ACTIVE_INACTIVE_VARIABLE, FETCH_CLIENT_SET_ATTACH_DETACH_VARIABLE, FETCH_CLIENT_SET_CLEAR_COLLECTION,
  FETCH_CLIENT_SET_COLLECTION, FETCH_CLIENT_SET_COPY_TO_COLLECTION, FETCH_CLIENT_SET_DELETE_COLLECTION,
  FETCH_CLIENT_SET_DELETE_COL_ITEM, FETCH_CLIENT_SET_DELETE_HISTORY, FETCH_CLIENT_SET_DELETE_VARIABLE, FETCH_CLIENT_SET_HISTORY,
  FETCH_CLIENT_SET_IMPORT_COLLECTION, FETCH_CLIENT_SET_NEW_FOLDER_TO_COLLECTION, FETCH_CLIENT_SET_NEW_HISTORY,
  FETCH_CLIENT_SET_NEW_HISTORY_TO_COLLECTION, FETCH_CLIENT_SET_NEW_REQUEST_TO_COLLECTION, FETCH_CLIENT_SET_NEW_VARIABLE,
  FETCH_CLIENT_SET_RENAME_COLLECTION, FETCH_CLIENT_SET_RENAME_COL_ITEM, FETCH_CLIENT_SET_RENAME_HISTORY,
  FETCH_CLIENT_SET_RENAME_VARIABLE, FETCH_CLIENT_SET_VARIABLE,
  ICollections, ISettings, IFolder, IHistory, ISideBarModel, IVariable, SideBarActionTypes,
  FETCH_CLIENT_SET_UPDATE_COLLECTION_ITEM,
  FETCH_CLIENT_SET_UPDATE_HISTORY_ITEM
} from "./types";


export const InitialSettings: ISettings = {
  auth: InitialAuth,
  preFetch: InitialPreFetch,
  headers: InitialRequestHeaders
};

export const InitialState: ISideBarModel = {
  history: [],
  collections: [],
  variable: []
};

export const SideBarReducer: (state?: ISideBarModel,
  action?: SideBarActionTypes) => ISideBarModel =
  (state: ISideBarModel = InitialState,
    action: SideBarActionTypes = {} as SideBarActionTypes): ISideBarModel => {
    switch (action.type) {
      case FETCH_CLIENT_SET_HISTORY: {
        return {
          ...state,
          history: action.payload.history,
        };
      }
      case FETCH_CLIENT_SET_COLLECTION: {
        return {
          ...state,
          collections: action.payload.collections,
        };
      }
      case FETCH_CLIENT_SET_DELETE_HISTORY: {
        return {
          ...state,
          history: deleteHistoryFromState(action.payload.id, state.history),
        };
      }
      case FETCH_CLIENT_SET_RENAME_HISTORY: {
        return {
          ...state,
          history: renameHistoryFromState(action.payload.id, action.payload.name, state.history),
        };
      }
      case FETCH_CLIENT_SET_NEW_HISTORY: {
        return {
          ...state,
          history: [action.payload.history, ...state.history],
        };
      }
      case FETCH_CLIENT_SET_NEW_HISTORY_TO_COLLECTION: {
        return {
          ...state,
          collections: appendToCollectionState(action.payload.collection, state.collections),
        };
      }
      case FETCH_CLIENT_SET_RENAME_COL_ITEM: {
        return {
          ...state,
          collections: renameColItemFromState(action.payload.colId, action.payload.folderId, action.payload.historyId, action.payload.name, action.payload.isFolder, state.collections),
        };
      }
      case FETCH_CLIENT_SET_DELETE_COL_ITEM: {
        return {
          ...state,
          collections: deleteColItemFromState(action.payload.colId, action.payload.folderId, action.payload.historyId, action.payload.isFolder, state.collections),
        };
      }
      case FETCH_CLIENT_SET_RENAME_COLLECTION: {
        return {
          ...state,
          collections: renameCollectionFromState(action.payload.colId, action.payload.name, state.collections),
        };
      }
      case FETCH_CLIENT_SET_DELETE_COLLECTION: {
        return {
          ...state,
          collections: deleteCollectionFromState(action.payload.colId, state.collections),
        };
      }
      case FETCH_CLIENT_SET_CLEAR_COLLECTION: {
        return {
          ...state,
          collections: clearCollectionFromState(action.payload.colId, action.payload.folderId, state.collections),
        };
      }
      case FETCH_CLIENT_SET_IMPORT_COLLECTION: {
        return {
          ...state,
          collections: importCollectionToState(action.payload.collection, state.collections),
        };
      }
      case FETCH_CLIENT_SET_COPY_TO_COLLECTION: {
        return {
          ...state,
          collections: copyToCollectionToState(action.payload.collection, state.collections),
        };
      }
      case FETCH_CLIENT_SET_RENAME_VARIABLE: {
        return {
          ...state,
          variable: renameVariableFromState(action.payload.varId, action.payload.name, state.variable),
        };
      }
      case FETCH_CLIENT_SET_VARIABLE: {
        return {
          ...state,
          variable: action.payload.variable,
        };
      }
      case FETCH_CLIENT_SET_DELETE_VARIABLE: {
        return {
          ...state,
          variable: deleteVariableFromState(action.payload.varId, state.variable),
        };
      }
      case FETCH_CLIENT_SET_NEW_VARIABLE: {
        return {
          ...state,
          variable: [...state.variable, action.payload.variable],
        };
      }
      case FETCH_CLIENT_SET_ATTACH_DETACH_VARIABLE: {
        return {
          ...state,
          collections: attachVariableFromState(action.payload.colId, action.payload.varId, state.collections),
        };
      }
      case FETCH_CLIENT_SET_ACTIVE_INACTIVE_VARIABLE: {
        return {
          ...state,
          variable: updateStatusVariableFromState(action.payload.varId, action.payload.status, state.variable)
        };
      }
      case FETCH_CLIENT_SET_NEW_REQUEST_TO_COLLECTION: {
        return {
          ...state,
          collections: appendRequestToCollectionState(action.payload.item, action.payload.id, action.payload.folId, state.collections)
        };
      }
      case FETCH_CLIENT_SET_NEW_FOLDER_TO_COLLECTION: {
        return {
          ...state,
          collections: appendRequestToCollectionState(action.payload.folder, action.payload.colId, action.payload.folderId, state.collections)
        };
      }
      case FETCH_CLIENT_SET_UPDATE_COLLECTION_ITEM: {
        return {
          ...state,
          collections: updateItemInCollectionState(action.payload.item, action.payload.colId, state.collections)
        };
      }
      case FETCH_CLIENT_SET_UPDATE_HISTORY_ITEM: {
        return {
          ...state,
          history: updateItemInHistoryState(action.payload.item, state.history)
        };
      }
      default: {
        return state;
      }
    }
  };

function deleteHistoryFromState(id: string, history: IHistory[]): IHistory[] {
  const { found, index } = findItemById(id, history);
  if (!found) { return history; }
  history.splice(index, 1);
  return history;
}

function renameHistoryFromState(id: string, name: string, history: IHistory[]): IHistory[] {
  const { found, index } = findItemById(id, history);
  if (!found) { return history; }
  history[index].name = name;
  return history;
}

function findItemById(id: string, items: IHistory[] | ICollections[] | IVariable[]): { found: boolean, index: number } {
  let findIndex: number = -1;
  let found = items.some(function (item: IHistory | ICollections | IVariable, index: number) { findIndex = index; return item.id === id; });
  return { found: found, index: findIndex };
}


function appendToCollectionState(item: ICollections, cols: ICollections[]): ICollections[] {
  const { found, index } = findItemById(item.id, cols);
  if (found) {
    cols[index] = item;
  } else {
    cols.push(item);
  }

  return cols;
}

function renameColItemFromState(colId: string, folderId: string, historyId: string, name: string, _isFolder: boolean, cols: ICollections[]): ICollections[] {
  const { found, index } = findItemById(colId, cols);
  if (found) {
    let item = findItem(cols[index], historyId ? historyId : folderId);
    if (item) {
      item.name = name;
    }
  }

  return cols;
}

function deleteColItemFromState(colId: string, folderId: string, historyId: string, isFolder: boolean, cols: ICollections[]): ICollections[] {
  const { found, index } = findItemById(colId, cols);
  if (found) {
    deleteItem(cols[index], isFolder ? folderId : historyId);
  }

  return cols;
}

function renameCollectionFromState(id: string, name: string, cols: ICollections[]): ICollections[] {
  const { found, index } = findItemById(id, cols);
  if (!found) { return cols; }
  cols[index].name = name;
  return cols;
}

function deleteCollectionFromState(id: string, cols: ICollections[]): ICollections[] {
  const { found, index } = findItemById(id, cols);
  if (!found) { return cols; }
  cols.splice(index, 1);
  return cols;
}

function clearCollectionFromState(id: string, folderId: string, cols: ICollections[]): ICollections[] {
  const { found, index } = findItemById(id, cols);

  if (found) {
    if (folderId) {
      let item = findItem(cols[index], folderId);
      item.data.length = 0;
    } else {
      cols[index].data.length = 0;
    }
  }

  return cols;
}

function importCollectionToState(item: ICollections, cols: ICollections[]): ICollections[] {
  cols = cols.concat(item);
  return cols;
}

function copyToCollectionToState(item: ICollections, cols: ICollections[]): ICollections[] {
  const { found, index } = findItemById(item.id, cols);
  if (found) {
    cols.splice(index, 1, item);
  } else {
    cols.push(item);
  }
  return cols;
}

function renameVariableFromState(id: string, name: string, vars: IVariable[]): IVariable[] {
  const { found, index } = findItemById(id, vars);
  if (!found) { return vars; }
  vars[index].name = name;
  return vars;
}

function deleteVariableFromState(id: string, vars: IVariable[]): IVariable[] {
  const { found, index } = findItemById(id, vars);
  if (!found) { return vars; }
  vars.splice(index, 1);
  return vars;
}

function attachVariableFromState(colId: string, varId: string, cols: ICollections[]): ICollections[] {
  const { found, index } = findItemById(colId, cols);
  if (!found) { return cols; }
  cols[index].variableId = varId;
  return cols;
}

function updateStatusVariableFromState(_id: string, status: boolean, vars: IVariable[]): IVariable[] {
  vars[0].isActive = status;
  return vars;
}

function appendRequestToCollectionState(item: IHistory | IFolder, colId: string, folderId: string, cols: ICollections[]): ICollections[] {
  const { found, index } = findItemById(colId, cols);
  if (found) {
    if (folderId) {
      let folder = findItem(cols[index], folderId);
      if (folder) {
        folder.data.push(item);
      }
    } else {
      cols[index].data.push(item);
    }
  }

  return cols;
}

function updateItemInCollectionState(item: IHistory, colId: string, cols: ICollections[]): ICollections[] {
  let { found, index } = findItemById(colId, cols);
  if (found) {
    cols[index] = updateItem(cols[index], item.id, item);
  }
  return cols;
}

function updateItemInHistoryState(item: IHistory, items: IHistory[]): IHistory[] {
  let { found, index } = findItemById(item.id, items);
  if (found) {
    items[index] = item;
  }

  return items;
}

function findItem(source: any, searchId: string) {
  let pos = source.data.findIndex((el: any) => el.id === searchId);

  if (pos !== -1) {
    return source.data[pos];
  }

  for (let i = 0; i < source.data.length; i++) {
    if (isFolder(source.data[i])) {
      const result = findItem(source.data[i], searchId);
      if (result) {
        return result;
      }
    }
  }
}

function deleteItem(source: any, id: string) {
  let pos = source.data.findIndex((el: any) => el.id === id);

  if (pos !== -1) {
    source.data.splice(pos, 1);
  }

  for (let i = 0; i < source.data.length; i++) {
    if (isFolder(source.data[i])) {
      deleteItem(source.data[i], id);
    }
  }
}

function updateItem(source: any, id: string, item: IHistory): any {
  let pos = source.data.findIndex((el: any) => el.id === id);

  if (pos !== -1) {
    source.data[pos] = item;
    return source;
  }

  for (let i = 0; i < source.data.length; i++) {
    if (isFolder(source.data[i])) {
      updateItem(source.data[i], id, item);
    }
  }

  return source;
}
