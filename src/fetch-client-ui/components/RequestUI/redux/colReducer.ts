import { FETCH_CLIENT_SET_COLLECTION_LIST, FETCH_CLIENT_SET_COL_REQUEST_LIST, FETCH_CLIENT_SET_REQ_COL_DETAILS, FETCH_CLIENT_SET_REQ_PARENT_SETTINGS, IReqColModel, RequestActionTypes } from "./types";

export const InitialState: IReqColModel = {
  colId: "",
  folderId: "",
  parentSettings: null,
  collectionList: [],
  colRequestList: []
};

export const ReqColReducer: (state?: IReqColModel,
  action?: RequestActionTypes) => IReqColModel =
  (state: IReqColModel = InitialState,
    action: RequestActionTypes = {} as RequestActionTypes): IReqColModel => {
    switch (action.type) {
      case FETCH_CLIENT_SET_REQ_COL_DETAILS: {
        return {
          ...state,
          colId: action.payload.colId,
          folderId: action.payload.folderId
        };
      }
      case FETCH_CLIENT_SET_REQ_PARENT_SETTINGS: {
        return {
          ...state,
          parentSettings: action.payload.parentSettings
        };
      }
      case FETCH_CLIENT_SET_COLLECTION_LIST: {
        return {
          ...state,
          collectionList: action.payload.colList
        };
      }
      case FETCH_CLIENT_SET_COL_REQUEST_LIST: {
        return {
          ...state,
          colRequestList: [...state.colRequestList, action.payload.colReqList]
        };
      }
      default: {
        return state;
      }
    }
  };
