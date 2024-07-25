import {
  FETCH_CLIENT_SET_ACTIVE_INACTIVE_VARIABLE, FETCH_CLIENT_SET_ATTACH_DETACH_VARIABLE, FETCH_CLIENT_SET_CLEAR_COLLECTION,
  FETCH_CLIENT_SET_COLLECTION, FETCH_CLIENT_SET_COPY_TO_COLLECTION, FETCH_CLIENT_SET_DELETE_COLLECTION,
  FETCH_CLIENT_SET_DELETE_COL_ITEM, FETCH_CLIENT_SET_DELETE_HISTORY, FETCH_CLIENT_SET_DELETE_VARIABLE,
  FETCH_CLIENT_SET_HISTORY, FETCH_CLIENT_SET_IMPORT_COLLECTION, FETCH_CLIENT_SET_NEW_FOLDER_TO_COLLECTION,
  FETCH_CLIENT_SET_NEW_HISTORY, FETCH_CLIENT_SET_NEW_HISTORY_TO_COLLECTION, FETCH_CLIENT_SET_NEW_REQUEST_TO_COLLECTION,
  FETCH_CLIENT_SET_NEW_VARIABLE, FETCH_CLIENT_SET_RENAME_COLLECTION, FETCH_CLIENT_SET_RENAME_COL_ITEM,
  FETCH_CLIENT_SET_RENAME_HISTORY, FETCH_CLIENT_SET_RENAME_VARIABLE, FETCH_CLIENT_SET_UPDATE_COLLECTION_ITEM, FETCH_CLIENT_SET_UPDATE_HISTORY_ITEM, FETCH_CLIENT_SET_VARIABLE,
  ICollections, IFolder, IHistory, IVariable, SideBarActionTypes
} from "./types";

export const SetHistoryAction = (value: IHistory[]): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_HISTORY,
    payload: {
      history: value
    }
  };
};

export const SetNewHistoryAction = (value: IHistory): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_NEW_HISTORY,
    payload: {
      history: value
    }
  };
};

export const SetHistoryToCollectionAction = (value: ICollections): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_NEW_HISTORY_TO_COLLECTION,
    payload: {
      collection: value
    }
  };
};


export const SetDeleteHistoryAction = (value: string): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_DELETE_HISTORY,
    payload: {
      id: value
    }
  };
};

export const SetRenameHistoryAction = (value: string, value1: string): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_RENAME_HISTORY,
    payload: {
      id: value,
      name: value1
    }
  };
};

export const SetCollectionAction = (value: ICollections[]): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_COLLECTION,
    payload: {
      collections: value
    }
  };
};

export const SetRenameColItemAction = (value: string, value1: string, value2: string, value3: boolean, value4: string): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_RENAME_COL_ITEM,
    payload: {
      colId: value,
      folderId: value1,
      historyId: value2,
      isFolder: value3,
      name: value4
    }
  };
};

export const SetDeleteColItemAction = (value: string, value1: string, value2: string, value3: boolean): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_DELETE_COL_ITEM,
    payload: {
      colId: value,
      folderId: value1,
      historyId: value2,
      isFolder: value3
    }
  };
};

export const SetRenameCollectionAction = (value: string, value1: string): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_RENAME_COLLECTION,
    payload: {
      colId: value,
      name: value1
    }
  };
};

export const SetDeleteCollectionAction = (value: string): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_DELETE_COLLECTION,
    payload: {
      colId: value,
    }
  };
};

export const SetClearCollectionAction = (value: string, value1: string): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_CLEAR_COLLECTION,
    payload: {
      colId: value,
      folderId: value1
    }
  };
};

export const SetImportCollectionAction = (value: ICollections): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_IMPORT_COLLECTION,
    payload: {
      collection: value,
    }
  };
};

export const SetCopyToCollectionAction = (value: ICollections): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_COPY_TO_COLLECTION,
    payload: {
      collection: value,
    }
  };
};

export const SetDeleteVariablection = (value: string): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_DELETE_VARIABLE,
    payload: {
      varId: value
    }
  };
};

export const SetRenameVariableAction = (value: string, value1: string): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_RENAME_VARIABLE,
    payload: {
      varId: value,
      name: value1
    }
  };
};

export const SetVariableAction = (value: IVariable[]): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_VARIABLE,
    payload: {
      variable: value,
    }
  };
};

export const SetNewVariableAction = (value: IVariable): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_NEW_VARIABLE,
    payload: {
      variable: value,
    }
  };
};

export const SetAttachVariableAction = (value: string, value1: string): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_ATTACH_DETACH_VARIABLE,
    payload: {
      colId: value,
      varId: value1
    }
  };
};

export const SetActiveVariableAction = (value: string, value1: boolean): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_ACTIVE_INACTIVE_VARIABLE,
    payload: {
      varId: value,
      status: value1
    }
  };
};

export const SetNewRequestToCollectionAction = (value: IHistory, value1: string, value2: string): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_NEW_REQUEST_TO_COLLECTION,
    payload: {
      item: value,
      id: value1,
      folId: value2,
    }
  };
};

export const SetFolderToCollectionAction = (value: IFolder, value1: string, value2: string): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_NEW_FOLDER_TO_COLLECTION,
    payload: {
      folder: value,
      colId: value1,
      folderId: value2
    }
  };
};

export const SetUpdateCollectionItemAction = (value: IHistory, value1: string): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_UPDATE_COLLECTION_ITEM,
    payload: {
      item: value,
      colId: value1
    }
  };
};

export const SetUpdateHistoryItemAction = (value: IHistory): SideBarActionTypes => {
  return {
    type: FETCH_CLIENT_SET_UPDATE_HISTORY_ITEM,
    payload: {
      item: value
    }
  };
};
