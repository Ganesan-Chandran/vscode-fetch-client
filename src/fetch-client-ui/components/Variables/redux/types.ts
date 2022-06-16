import { IVariable } from "../../SideBar/redux/types";

export const FETCH_CLIENT_SET_REQ_VARIABLE: "FETCH_CLIENT_SET_REQ_VARIABLE" = "FETCH_CLIENT_SET_REQ_VARIABLE";
export const FETCH_CLIENT_SET_REQ_ALL_VARIABLES: "FETCH_CLIENT_SET_REQ_ALL_VARIABLES" = "FETCH_CLIENT_SET_REQ_ALL_VARIABLES";
export const FETCH_CLIENT_SET_LOCAL_CHANGE: "FETCH_CLIENT_SET_LOCAL_CHANGE" = "FETCH_CLIENT_SET_LOCAL_CHANGE";
export const FETCH_CLIENT_SET_SETVAR_CHANGE: "FETCH_CLIENT_SET_SETVAR_CHANGE" = "FETCH_CLIENT_SET_SETVAR_CHANGE";

export interface IVariableModel {
  variables: IVariable[];
  selectedVariable: IVariable;
  isLocalChange: boolean;
  setVarChanged: boolean;
}

export interface ISetReqVariable {
  type: typeof FETCH_CLIENT_SET_REQ_VARIABLE;
  payload: {
    variable: IVariable;
  };
}

export interface ISetReqAllVariable {
  type: typeof FETCH_CLIENT_SET_REQ_ALL_VARIABLES;
  payload: {
    variables: IVariable[];
  };
}

export interface ISetLocalChange {
  type: typeof FETCH_CLIENT_SET_LOCAL_CHANGE;
  payload: {
    change: boolean;
  };
}

export interface ISetVarChange {
  type: typeof FETCH_CLIENT_SET_SETVAR_CHANGE;
  payload: {
    setVarChanged: boolean;
  };
}

export type VariableActionTypes = | ISetReqVariable | ISetReqAllVariable | ISetLocalChange | ISetVarChange;