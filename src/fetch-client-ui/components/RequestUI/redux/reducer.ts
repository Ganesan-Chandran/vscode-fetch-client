import { v4 as uuidv4 } from 'uuid';
import { ITableData } from "../../Common/Table/types";
import { requestBodyRaw } from '../OptionsPanel/Options/Body/consts';
import {
  FETCH_CLIENT_SET_NOTES,
  FETCH_CLIENT_SET_REQ,
  FETCH_CLIENT_SET_REQ_AUTH, FETCH_CLIENT_SET_REQ_BINARY_DATA, FETCH_CLIENT_SET_REQ_BODY, FETCH_CLIENT_SET_REQ_FORM_DATA_BODY, FETCH_CLIENT_SET_REQ_HEADERS, FETCH_CLIENT_SET_REQ_METHOD,
  FETCH_CLIENT_SET_REQ_PARAMS, FETCH_CLIENT_SET_REQ_RAW, FETCH_CLIENT_SET_REQ_RAW_LANG, FETCH_CLIENT_SET_REQ_RESET_BODY, FETCH_CLIENT_SET_REQ_URL,
  FETCH_CLIENT_SET_SET_VAR, FETCH_CLIENT_SET_TEST, IAuth, IAwsAuth, IBinaryFileData, IBodyData, IRequestModel, ISetVar, ITest, RequestActionTypes
} from "./types";

export const InitialRequestHeaders: ITableData[] = [
  {
    key: "Cache-Control",
    value: "no-cache",
    isChecked: true,
  },
  {
    key: "Accept",
    value: "*/*",
    isChecked: true,
  },
  {
    key: "User-Agent",
    value: "Fetch Client",
    isChecked: true,
  },
  {
    key: "Accept-Encoding",
    value: "gzip, deflate",
    isChecked: true,
  },
  {
    key: "Connection",
    value: "keep-alive",
    isChecked: true,
  },
  {
    key: "",
    value: "",
    isChecked: false,
  },
];

export const emptyRow: ITableData = {
  isChecked: false,
  key: "",
  value: ""
};

export const InitialAwsAuth: IAwsAuth = {
  service: "",
  region: "",
  accessKey: "",
  secretAccessKey: "",
  sessionToken: "",
};

export const InitialAuth: IAuth = {
  authType: "noauth",
  userName: "",
  password: "",
  addTo: "queryparams",
  showPwd: false,
  tokenPrefix: "",
  aws: InitialAwsAuth
};

export const InitialBinaryData: IBinaryFileData = {
  fileName: "",
  data: {},
  contentTypeOption: "manual"
};

export const InitialBody: IBodyData = {
  bodyType: "none",
  formdata: [{ isChecked: false, key: "", value: "" }],
  urlencoded: [{ isChecked: false, key: "", value: "" }],
  raw: { data: "", lang: requestBodyRaw[1].value },
  binary: InitialBinaryData,
  graphql: { query: "", variables: "" },
};

export const IntialTest: ITest[] = [{
  parameter: "",
  action: "",
  expectedValue: ""
}];

export const IntialSetVar: ISetVar[] = [{
  parameter: "",
  key: "",
  variableName: ""
}];

export const InitialState: IRequestModel = {
  id: uuidv4(),
  url: "",
  name: "",
  createdTime: "",
  method: "get",
  params: [{ isChecked: false, key: "", value: "" }],
  auth: InitialAuth,
  headers: InitialRequestHeaders,
  body: InitialBody,
  tests: IntialTest,
  setvar: IntialSetVar,
  notes: ""
};

export const RequestReducer: (state?: IRequestModel,
  action?: RequestActionTypes) => IRequestModel =
  (state: IRequestModel = InitialState,
    action: RequestActionTypes = {} as RequestActionTypes): IRequestModel => {
    switch (action.type) {
      case FETCH_CLIENT_SET_REQ_URL: {
        return {
          ...state,
          url: action.payload.url.trim(),
          params: updateQueryParams(action.payload.url.trim(), state.params)
        };
      }
      case FETCH_CLIENT_SET_REQ_METHOD: {
        return {
          ...state,
          method: action.payload.method
        };
      }
      case FETCH_CLIENT_SET_REQ_PARAMS: {
        return {
          ...state,
          params: action.payload.params,
          url: updateURL(state.url.trim(), action.payload.params)
        };
      }
      case FETCH_CLIENT_SET_REQ_AUTH: {
        return {
          ...state,
          auth: action.payload.auth,
        };
      }
      case FETCH_CLIENT_SET_REQ_HEADERS: {
        return {
          ...state,
          headers: action.payload.headers,
        };
      }
      case FETCH_CLIENT_SET_REQ_BODY: {
        return {
          ...state,
          body: action.payload.body,
        };
      }
      case FETCH_CLIENT_SET_REQ_FORM_DATA_BODY: {
        return {
          ...state,
          body: setFormDataBody(state.body, action.payload.value, action.payload.index),
        };
      }
      case FETCH_CLIENT_SET_REQ: {
        return {
          ...state,
          id: action.payload.req.id,
          url: action.payload.req.url.trim(),
          name: action.payload.req.name.trim(),
          createdTime: action.payload.req.createdTime,
          method: action.payload.req.method,
          params: action.payload.req.params,
          auth: action.payload.req.auth,
          headers: action.payload.req.headers,
          body: action.payload.req.body,
          tests: action.payload.req.tests,
          setvar: action.payload.req.setvar ? action.payload.req.setvar : IntialSetVar,
          notes: action.payload.req.notes,
        };
      }
      case FETCH_CLIENT_SET_TEST: {
        return {
          ...state,
          tests: action.payload.tests,
        };
      }
      case FETCH_CLIENT_SET_REQ_RAW_LANG: {
        return {
          ...state,
          body: {
            ...state.body,
            raw: {
              ...state.body.raw,
              lang: action.payload.rawLang
            },
          }
        };
      }
      case FETCH_CLIENT_SET_REQ_RAW: {
        return {
          ...state,
          body: {
            ...state.body,
            raw: {
              ...state.body.raw,
              data: action.payload.raw
            },
          }
        };
      }
      case FETCH_CLIENT_SET_REQ_BINARY_DATA: {
        return {
          ...state,
          body: {
            ...state.body,
            binary: {
              ...state.body.binary,
              data: action.payload.data
            },
          }
        };
      }
      case FETCH_CLIENT_SET_REQ_RESET_BODY: {
        return {
          ...state,
          body: {
            ...state.body,
            bodyType: action.payload.bodyType
          }
        };
      }
      case FETCH_CLIENT_SET_NOTES: {
        return {
          ...state,
          notes: action.payload.notes,
        };
      }
      case FETCH_CLIENT_SET_SET_VAR: {
        return {
          ...state,
          setvar: action.payload.data
        };
      }
      default: {
        return state;
      }
    }
  };

function updateURL(url: string, params: ITableData[]): string {
  let searchParams = new URLSearchParams();

  params.forEach((param: ITableData, index) => {
    if (param.key.trim() && param.isChecked && !param.isFixed) {
      searchParams.append(param.key.trim(), param.value.trim());
    }
  });

  let combineUrl = searchParams.toString().length > 0 ? decodeURIComponent(url.split("?")[0] + "?" + searchParams.toString()) : decodeURIComponent(url.split("?")[0]);

  return combineUrl;
}

function updateQueryParams(url: string, params: ITableData[]) {
  let splitURL = url.split("?");
  let queryParams: ITableData[] = params.filter(getUnchecked);

  if (splitURL.length > 1) {
    if (splitURL[1].trim().length > 0) {
      let searchParams = new URLSearchParams(splitURL[1].trim());
      for (let p of searchParams) {
        if (p[0] && p[0].trim()) {
          let queryParam: ITableData = {
            isChecked: true,
            key: p[0] ? p[0].trim() : "",
            value: p[1] ? p[1].trim() : "",
          };
          queryParams.splice(params.length === 0 ? 0 : params.length - 1, 0, queryParam);
        }
      }
    }
  }

  queryParams.push(emptyRow);

  let fixedParams = params.filter(getFixed);
  queryParams = fixedParams.length > 0 ? fixedParams.concat(queryParams) : queryParams;

  return queryParams;
}

function getUnchecked(item: ITableData) {
  return item.isChecked === false && item.key !== "";
}

function getFixed(item: ITableData) {
  return item.isFixed === true;
}

function setFormDataBody(body: IBodyData, path: string, index: number): IBodyData {
  let localbody = { ...body };
  if (localbody.formdata) {
    let localFormData = [...localbody.formdata];
    let rowData = localFormData[index];
    localFormData[index] = {
      isChecked: rowData.isChecked,
      key: rowData.key,
      value: path,
      type: rowData.type
    };
    localbody.formdata = localFormData;

    if (localbody.formdata.length - 1 === index && localFormData[index].key) {
      let newRow: ITableData = {
        isChecked: false,
        key: "",
        value: "",
        type: "Text"
      };

      localbody.formdata.push(newRow);
    }
  }
  return localbody;
}