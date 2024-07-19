import { ITableData } from "../../Common/Table/types";
import { ISettings } from "../../SideBar/redux/types";
import {
  FETCH_CLIENT_SET_ADD_PREREQUEST, FETCH_CLIENT_SET_COLLECTION_LIST, FETCH_CLIENT_SET_COL_ID, FETCH_CLIENT_SET_COL_REQUEST_LIST, FETCH_CLIENT_SET_DELETE_PRECONDITION, FETCH_CLIENT_SET_DELETE_PREREQUEST,
  FETCH_CLIENT_SET_NOTES, FETCH_CLIENT_SET_OAUTH_TOKEN, FETCH_CLIENT_SET_PRECONDITION, FETCH_CLIENT_SET_REQ, FETCH_CLIENT_SET_REQ_AUTH,
  FETCH_CLIENT_SET_REQ_BINARY_DATA, FETCH_CLIENT_SET_REQ_BODY, FETCH_CLIENT_SET_REQ_COL_DETAILS, FETCH_CLIENT_SET_REQ_FORM_DATA_BODY,
  FETCH_CLIENT_SET_REQ_HEADERS, FETCH_CLIENT_SET_REQ_ID, FETCH_CLIENT_SET_REQ_METHOD, FETCH_CLIENT_SET_REQ_PARAMS, FETCH_CLIENT_SET_REQ_PARENT_SETTINGS,
  FETCH_CLIENT_SET_REQ_RAW, FETCH_CLIENT_SET_REQ_RAW_LANG, FETCH_CLIENT_SET_REQ_RESET_BODY, FETCH_CLIENT_SET_REQ_URL, FETCH_CLIENT_SET_SET_VAR,
  FETCH_CLIENT_SET_TEST, IAuth, IBodyData, ICollection, IColRequest, IRequestModel, IRunRequest, ISetVar, ITest, MethodType, RequestActionTypes
} from "./types";

export const SetRequestAction = (value: IRequestModel): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ,
    payload: {
      req: value
    }
  };
};


export const SetRequestURLAction = (value: string): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_URL,
    payload: {
      url: value
    }
  };
};

export const SetRequestMethodAction = (value: MethodType): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_METHOD,
    payload: {
      method: value
    }
  };
};

export const SetRequestParamsAction = (value: ITableData[]): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_PARAMS,
    payload: {
      params: value
    }
  };
};

export const SetRequestAuthAction = (value: IAuth): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_AUTH,
    payload: {
      auth: value
    }
  };
};

export const SetRequestHeadersAction = (value: ITableData[]): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_HEADERS,
    payload: {
      headers: value
    }
  };
};

export const SetRequestBodyAction = (value: IBodyData): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_BODY,
    payload: {
      body: value
    }
  };
};

export const SetRequestFormDataAction = (value: string, value1: number): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_FORM_DATA_BODY,
    payload: {
      value: value,
      index: value1
    }
  };
};

export const SetTestAction = (value: ITest[]): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_TEST,
    payload: {
      tests: value
    }
  };
};

export const SetRequestRawLangAction = (value: string): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_RAW_LANG,
    payload: {
      rawLang: value
    }
  };
};

export const SetRequestRawAction = (value: string): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_RAW,
    payload: {
      raw: value
    }
  };
};

export const SetRequestBinaryDataAction = (value: string): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_BINARY_DATA,
    payload: {
      data: value
    }
  };
};

export const SetRequestResetBodyAction = (value: string): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_RESET_BODY,
    payload: {
      bodyType: value
    }
  };
};

export const SetNotesAction = (value: string): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_NOTES,
    payload: {
      notes: value
    }
  };
};

export const SetVarAction = (value: ISetVar[]): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_SET_VAR,
    payload: {
      data: value
    }
  };
};

export const SetReqColDetailsAction = (value: string, value1: string): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_COL_DETAILS,
    payload: {
      colId: value,
      folderId: value1
    }
  };
};

export const SetReqParentSettingsAction = (value: ISettings): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_PARENT_SETTINGS,
    payload: {
      parentSettings: value
    }
  };
};

export const SetOAuthTokenAction = (value: string): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_OAUTH_TOKEN,
    payload: {
      token: value
    }
  };
};

export const SetPreConditionAction = (value: ITest, reqIndex: number, condIndex: number): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_PRECONDITION,
    payload: {
      condition: value,
      reqIndex: reqIndex,
      condIndex: condIndex
    }
  };
};

export const SetAddPreRequestAction = (value: IRunRequest): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_ADD_PREREQUEST,
    payload: {
      request: value
    }
  };
};


export const SetDeletePreRequestAction = (index: number): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_DELETE_PREREQUEST,
    payload: {
      index: index
    }
  };
};

export const SetDeletePreConditionAction = (index: number, index1: number): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_DELETE_PRECONDITION,
    payload: {
      reqIndex: index,
      condIndex: index1
    }
  };
};

export const SetCollectionListAction = (value: ICollection[]): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_COLLECTION_LIST,
    payload: {
      colList: value
    }
  };
};

export const SetColRequestListAction = (value: IColRequest): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_COL_REQUEST_LIST,
    payload: {
      colReqList: value
    }
  };
};


export const SetSelectedColAction = (value: string, value2: number): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_COL_ID,
    payload: {
      colId: value,
      index: value2
    }
  };
};

export const SetSelectedReqAction = (reqId: string, reqIndex: number, parentId: string): RequestActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_ID,
    payload: {
      reqId: reqId,
      index: reqIndex,
      parentId: parentId
    }
  };
};
