import { InitialSettings } from "../../SideBar/redux/reducer";
import { FETCH_CLIENT_SET_REQ_COL_DETAILS, FETCH_CLIENT_SET_REQ_PARENT_SETTINGS, IReqColModel, RequestActionTypes } from "./types";

export const InitialState: IReqColModel = {
  colId: "",
  folderId: "",
  parentSettings: null
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
      default: {
        return state;
      }
    }
  };
