import { FETCH_CLIENT_SET_ACC_OPEN, FETCH_CLIENT_SET_RESPONSE_LIMIT, FETCH_CLIENT_SET_RUN_ITEM, FETCH_CLIENT_SET_UI_HORIZONTAL, FETCH_CLIENT_SET_UI_THEME, UIActionTypes } from "./types";

export const SetOpenAction = (value: boolean[]): UIActionTypes => {
  return {
    type: FETCH_CLIENT_SET_ACC_OPEN,
    payload: {
      open: value
    }
  };
};


export const SetLayoutAction = (value: boolean, value1: number): UIActionTypes => {
  return {
    type: FETCH_CLIENT_SET_UI_HORIZONTAL,
    payload: {
      horizontalLayout: value,
      theme: value1
    }
  };
};

export const SetThemeAction = (value: number): UIActionTypes => {
  return {
    type: FETCH_CLIENT_SET_UI_THEME,
    payload: {
      theme: value
    }
  };
};

export const SetRunItemAction = (value: boolean): UIActionTypes => {
  return {
    type: FETCH_CLIENT_SET_RUN_ITEM,
    payload: {
      runItem: value
    }
  };
};

export const SetResponseLimitAction = (value: number): UIActionTypes => {
  return {
    type: FETCH_CLIENT_SET_RESPONSE_LIMIT,
    payload: {
      responseLimit: value
    }
  };
};