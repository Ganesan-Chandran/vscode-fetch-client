import { FETCH_CLIENT_SET_SKIP_PARENT_HEADERS, FETCH_CLIENT_SET_SKIP_PARENT_PREFETCH, IReqSettings, RequestActionTypes } from "./types";

export const InitialState: IReqSettings = {
  skipParentHeaders: false,
  skipParentPreFetch: false
};

export const ReqSettingsReducer: (state?: IReqSettings,
  action?: RequestActionTypes) => IReqSettings =
  (state: IReqSettings = InitialState,
    action: RequestActionTypes = {} as RequestActionTypes): IReqSettings => {
    switch (action.type) {
      case FETCH_CLIENT_SET_SKIP_PARENT_PREFETCH: {
        return {
          ...state,
          skipParentPreFetch: action.payload.skip
        };
      }
      case FETCH_CLIENT_SET_SKIP_PARENT_HEADERS: {
        return {
          ...state,
          skipParentHeaders: action.payload.skip
        };
      }
      default: {
        return state;
      }
    }
  };
