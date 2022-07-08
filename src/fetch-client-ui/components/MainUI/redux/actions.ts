import { FETCH_CLIENT_SET_ACC_OPEN, FETCH_CLIENT_SET_RUN_ITEM, FETCH_CLIENT_SET_UI_HORIZONTAL, UIActionTypes } from "./types";

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

export const SetRunItemAction = (value: boolean): UIActionTypes => {
  return {
    type: FETCH_CLIENT_SET_RUN_ITEM,
    payload: {
      runItem: value
    }
  };
};
