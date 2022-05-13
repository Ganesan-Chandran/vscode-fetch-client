import { responseType } from "../OptionsPanel/Options/Response/consts";
import {
  FETCH_CLIENT_SET_LOADING,
  FETCH_CLIENT_SET_RES_COOKIES, FETCH_CLIENT_SET_RES_HEADERS, FETCH_CLIENT_SET_RES_RESPONSE,
  FETCH_CLIENT_SET_TEST_RESULT,
  IReponseModel, IResponse, ResponseActionTypes
} from "./types";



export const InitialResponse: IResponse = {
  responseData: "",
  responseType: {
    isBinaryFile: false,
    format: responseType[1].value
  },
  status: 0,
  statusText: "",
  size: "",
  duration: 0,
  isError: false,
};

export const InitialState: IReponseModel = {
  response: InitialResponse,
  headers: [],
  cookies: [],
  loading: false,
  testResults: []
};

export const ResponseReducer: (state?: IReponseModel,
  action?: ResponseActionTypes) => IReponseModel =
  (state: IReponseModel = InitialState,
    action: ResponseActionTypes = {} as ResponseActionTypes): IReponseModel => {
    switch (action.type) {
      case FETCH_CLIENT_SET_RES_RESPONSE: {
        return {
          ...state,
          response: action.payload.response,
          loading: false
        };
      }
      case FETCH_CLIENT_SET_RES_HEADERS: {
        return {
          ...state,
          headers: action.payload.headers,
        };
      }
      case FETCH_CLIENT_SET_RES_COOKIES: {
        return {
          ...state,
          cookies: action.payload.cookies,
        };
      }
      case FETCH_CLIENT_SET_LOADING: {
        return {
          ...state,
          loading: action.payload.loading,
          response: action.payload.loading === true ? InitialResponse : state.response,
        };
      }
      case FETCH_CLIENT_SET_TEST_RESULT: {
        return {
          ...state,
          testResults: action.payload.testResults,
        };
      }
      default: {
        return state;
      }
    }
  };
