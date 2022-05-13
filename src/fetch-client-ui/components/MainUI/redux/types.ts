export interface IUIModel {
  open: boolean[],
  horizontalLayout: boolean;
  theme: number;
}

export const FETCH_CLIENT_SET_ACC_OPEN: "FETCH_CLIENT_SET_ACC_OPEN" = "FETCH_CLIENT_SET_ACC_OPEN";
export const FETCH_CLIENT_SET_UI_HORIZONTAL: "FETCH_CLIENT_SET_UI_HORIZONTAL" = "FETCH_CLIENT_SET_UI_HORIZONTAL";

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

export type UIActionTypes = | ISetOpen | ISetLayout;