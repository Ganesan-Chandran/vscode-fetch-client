export interface IUIModel {
  open: boolean[],
  horizontalLayout: boolean;
  theme: number;
  runItem: boolean;
}

export const FETCH_CLIENT_SET_ACC_OPEN: "FETCH_CLIENT_SET_ACC_OPEN" = "FETCH_CLIENT_SET_ACC_OPEN";
export const FETCH_CLIENT_SET_UI_HORIZONTAL: "FETCH_CLIENT_SET_UI_HORIZONTAL" = "FETCH_CLIENT_SET_UI_HORIZONTAL";
export const FETCH_CLIENT_SET_UI_THEME: "FETCH_CLIENT_SET_UI_THEME" = "FETCH_CLIENT_SET_UI_THEME";
export const FETCH_CLIENT_SET_RUN_ITEM: "FETCH_CLIENT_SET_RUN_ITEM" = "FETCH_CLIENT_SET_RUN_ITEM";

export interface ISetOpen {
  type: typeof FETCH_CLIENT_SET_ACC_OPEN;
  payload: {
    open: boolean[];
  };
}

export interface ISetLayout {
  type: typeof FETCH_CLIENT_SET_UI_HORIZONTAL;
  payload: {
    horizontalLayout: boolean;
    theme: number;
  };
}

export interface ISetTheme {
  type: typeof FETCH_CLIENT_SET_UI_THEME;
  payload: {
    theme: number;
  };
}

export interface ISetRunItem {
  type: typeof FETCH_CLIENT_SET_RUN_ITEM;
  payload: {
    runItem: boolean;
  };
}

export type UIActionTypes = | ISetOpen | ISetLayout | ISetRunItem | ISetTheme;