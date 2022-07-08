import { ITableData } from "../../Common/Table/types";
import { IAuth } from "../../RequestUI/redux/types";

export interface IHistory {
  id: string;
  method: string;
  name: string;
  url: string;
  createdTime: string;
}

export interface ISettings {
  auth: IAuth;
}

export interface ICollections {
  id: string;
  name: string;
  createdTime: string;
  data?: (IHistory | IFolder)[];
  variableId: string;
  settings: ISettings;
}

export interface IFolder {
  id: string;
  name: string;
  createdTime: string;
  type: "folder";
  data?: (IHistory | IFolder)[];
  settings: ISettings;
}

export interface IVariable {
  id: string;
  name: string;
  createdTime: string;
  isActive: boolean;
  data: ITableData[];
}

export interface ISideBarModel {
  history: IHistory[];
  collections: ICollections[];
  variable: IVariable[];
}

export const FETCH_CLIENT_SET_HISTORY: "FETCH_CLIENT_SET_HISTORY" = "FETCH_CLIENT_SET_HISTORY";
export const FETCH_CLIENT_SET_COLLECTION: "FETCH_CLIENT_SET_COLLECTION" = "FETCH_CLIENT_SET_COLLECTION";
export const FETCH_CLIENT_SET_DELETE_HISTORY: "FETCH_CLIENT_SET_DELETE_HISTORY" = "FETCH_CLIENT_SET_DELETE_HISTORY";
export const FETCH_CLIENT_SET_RENAME_HISTORY: "FETCH_CLIENT_SET_RENAME_HISTORY" = "FETCH_CLIENT_SET_RENAME_HISTORY";
export const FETCH_CLIENT_SET_NEW_HISTORY: "FETCH_CLIENT_SET_NEW_HISTORY" = "FETCH_CLIENT_SET_NEW_HISTORY";
export const FETCH_CLIENT_SET_NEW_HISTORY_TO_COLLECTION: "FETCH_CLIENT_SET_NEW_HISTORY_TO_COLLECTION" = "FETCH_CLIENT_SET_NEW_HISTORY_TO_COLLECTION";
export const FETCH_CLIENT_SET_RENAME_COL_ITEM: "FETCH_CLIENT_SET_RENAME_COL_ITEM" = "FETCH_CLIENT_SET_RENAME_COL_ITEM";
export const FETCH_CLIENT_SET_DELETE_COL_ITEM: "FETCH_CLIENT_SET_DELETE_COL_ITEM" = "FETCH_CLIENT_SET_DELETE_COL_ITEM";
export const FETCH_CLIENT_SET_RENAME_COLLECTION: "FETCH_CLIENT_SET_RENAME_COLLECTION" = "FETCH_CLIENT_SET_RENAME_COLLECTION";
export const FETCH_CLIENT_SET_DELETE_COLLECTION: "FETCH_CLIENT_SET_DELETE_COLLECTION" = "FETCH_CLIENT_SET_DELETE_COLLECTION";
export const FETCH_CLIENT_SET_CLEAR_COLLECTION: "FETCH_CLIENT_SET_CLEAR_COLLECTION" = "FETCH_CLIENT_SET_CLEAR_COLLECTION";
export const FETCH_CLIENT_SET_IMPORT_COLLECTION: "FETCH_CLIENT_SET_IMPORT_COLLECTION" = "FETCH_CLIENT_SET_IMPORT_COLLECTION";
export const FETCH_CLIENT_SET_COPY_TO_COLLECTION: "FETCH_CLIENT_SET_COPY_TO_COLLECTION" = "FETCH_CLIENT_SET_COPY_TO_COLLECTION";
export const FETCH_CLIENT_SET_VARIABLE: "FETCH_CLIENT_SET_VARIABLE" = "FETCH_CLIENT_SET_VARIABLE";
export const FETCH_CLIENT_SET_DELETE_VARIABLE: "FETCH_CLIENT_SET_DELETE_VARIABLE" = "FETCH_CLIENT_SET_DELETE_VARIABLE";
export const FETCH_CLIENT_SET_RENAME_VARIABLE: "FETCH_CLIENT_SET_RENAME_VARIABLE" = "FETCH_CLIENT_SET_RENAME_VARIABLE";
export const FETCH_CLIENT_SET_NEW_VARIABLE: "FETCH_CLIENT_SET_NEW_VARIABLE" = "FETCH_CLIENT_SET_NEW_VARIABLE";
export const FETCH_CLIENT_SET_UPDATE_VARIABLE: "FETCH_CLIENT_SET_UPDATE_VARIABLE" = "FETCH_CLIENT_SET_UPDATE_VARIABLE";
export const FETCH_CLIENT_SET_ATTACH_DETACH_VARIABLE: "FETCH_CLIENT_SET_ATTACH_DETACH_VARIABLE" = "FETCH_CLIENT_SET_ATTACH_DETACH_VARIABLE";
export const FETCH_CLIENT_SET_ACTIVE_INACTIVE_VARIABLE: "FETCH_CLIENT_SET_ACTIVE_INACTIVE_VARIABLE" = "FETCH_CLIENT_SET_ACTIVE_INACTIVE_VARIABLE";
export const FETCH_CLIENT_SET_NEW_REQUEST_TO_COLLECTION: "FETCH_CLIENT_SET_NEW_REQUEST_TO_COLLECTION" = "FETCH_CLIENT_SET_NEW_REQUEST_TO_COLLECTION";
export const FETCH_CLIENT_SET_NEW_FOLDER_TO_COLLECTION: "FETCH_CLIENT_SET_NEW_FOLDER_TO_COLLECTION" = "FETCH_CLIENT_SET_NEW_FOLDER_TO_COLLECTION";

export interface ISetHistory {
  type: typeof FETCH_CLIENT_SET_HISTORY;
  payload: {
    history: IHistory[];
  };
}

export interface ISetNewHistory {
  type: typeof FETCH_CLIENT_SET_NEW_HISTORY;
  payload: {
    history: IHistory;
  };
}

export interface ISetCollection {
  type: typeof FETCH_CLIENT_SET_COLLECTION;
  payload: {
    collections: ICollections[];
  };
}

export interface ISetHistoryToCollection {
  type: typeof FETCH_CLIENT_SET_NEW_HISTORY_TO_COLLECTION;
  payload: {
    collection: ICollections;
  };
}

export interface ISetDeleteHistory {
  type: typeof FETCH_CLIENT_SET_DELETE_HISTORY;
  payload: {
    id: string;
  };
}

export interface ISetRenameHistory {
  type: typeof FETCH_CLIENT_SET_RENAME_HISTORY;
  payload: {
    id: string;
    name: string;
  };
}

export interface ISetRenameColItem {
  type: typeof FETCH_CLIENT_SET_RENAME_COL_ITEM;
  payload: {
    colId: string;
    folderId: string;
    historyId: string;
    isFolder: boolean;
    name: string;
  };
}

export interface ISetDeleteColItem {
  type: typeof FETCH_CLIENT_SET_DELETE_COL_ITEM;
  payload: {
    colId: string;
    folderId: string;
    historyId: string;
    isFolder: boolean;
  };
}

export interface ISetRenameCollection {
  type: typeof FETCH_CLIENT_SET_RENAME_COLLECTION;
  payload: {
    colId: string;
    name: string;
  };
}

export interface ISetDeleteCollection {
  type: typeof FETCH_CLIENT_SET_DELETE_COLLECTION;
  payload: {
    colId: string;
  };
}

export interface ISetClearCollection {
  type: typeof FETCH_CLIENT_SET_CLEAR_COLLECTION;
  payload: {
    colId: string;
    folderId: string;
  };
}

export interface ISetImportCollection {
  type: typeof FETCH_CLIENT_SET_IMPORT_COLLECTION;
  payload: {
    collection: ICollections;
  };
}

export interface ISetCopyToCollection {
  type: typeof FETCH_CLIENT_SET_COPY_TO_COLLECTION;
  payload: {
    collection: ICollections;
  };
}

export interface ISetVariable {
  type: typeof FETCH_CLIENT_SET_VARIABLE;
  payload: {
    variable: IVariable[];
  };
}

export interface ISetDeleteVariable {
  type: typeof FETCH_CLIENT_SET_DELETE_VARIABLE;
  payload: {
    varId: string;
  };
}

export interface ISetRenameVariable {
  type: typeof FETCH_CLIENT_SET_RENAME_VARIABLE;
  payload: {
    varId: string;
    name: string;
  };
}

export interface ISetNewVariable {
  type: typeof FETCH_CLIENT_SET_NEW_VARIABLE;
  payload: {
    variable: IVariable;
  };
}

export interface ISetUpdateVariable {
  type: typeof FETCH_CLIENT_SET_UPDATE_VARIABLE;
  payload: {
    variable: IVariable;
  };
}

export interface ISetUpdateVariable {
  type: typeof FETCH_CLIENT_SET_UPDATE_VARIABLE;
  payload: {
    variable: IVariable;
  };
}

export interface ISetAttachVariable {
  type: typeof FETCH_CLIENT_SET_ATTACH_DETACH_VARIABLE;
  payload: {
    colId: string;
    varId: string;
  };
}

export interface ISetActiveVariable {
  type: typeof FETCH_CLIENT_SET_ACTIVE_INACTIVE_VARIABLE;
  payload: {
    varId: string;
    status: boolean;
  };
}

export interface ISetNewRequestToCollection {
  type: typeof FETCH_CLIENT_SET_NEW_REQUEST_TO_COLLECTION;
  payload: {
    item: IHistory;
    id: string;
    folId: string;
  };
}

export interface ISetNewFolderToCollection {
  type: typeof FETCH_CLIENT_SET_NEW_FOLDER_TO_COLLECTION;
  payload: {
    folder: IFolder;
    colId: string;
    folderId: string;
  };
}

export type SideBarActionTypes = | ISetHistory | ISetCollection | ISetDeleteHistory | ISetRenameHistory | ISetNewHistory | ISetHistoryToCollection |
  ISetRenameColItem | ISetDeleteColItem | ISetRenameCollection | ISetDeleteCollection | ISetClearCollection | ISetImportCollection |
  ISetCopyToCollection | ISetVariable | ISetDeleteVariable | ISetRenameVariable | ISetNewVariable | ISetUpdateVariable | ISetAttachVariable | ISetActiveVariable | ISetNewRequestToCollection |
  ISetNewFolderToCollection;