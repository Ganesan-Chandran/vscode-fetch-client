import { ITableData } from "../../Common/Table/types";
import {
  FETCH_CLIENT_SET_NOTES,
  FETCH_CLIENT_SET_REQ,
  FETCH_CLIENT_SET_REQ_AUTH, FETCH_CLIENT_SET_REQ_BINARY_DATA, FETCH_CLIENT_SET_REQ_BODY, FETCH_CLIENT_SET_REQ_HEADERS, FETCH_CLIENT_SET_REQ_METHOD,
  FETCH_CLIENT_SET_REQ_PARAMS, FETCH_CLIENT_SET_REQ_RAW, FETCH_CLIENT_SET_REQ_RAW_LANG, FETCH_CLIENT_SET_REQ_RESET_BODY, FETCH_CLIENT_SET_REQ_URL, FETCH_CLIENT_SET_TEST, IAuth, IBodyData, IRequestModel, ITest, MethodType, RequestActionTypes
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