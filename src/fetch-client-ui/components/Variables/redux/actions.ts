import { IVariable } from "../../SideBar/redux/types";
import { FETCH_CLIENT_SET_LOCAL_CHANGE, FETCH_CLIENT_SET_REQ_ALL_VARIABLES, FETCH_CLIENT_SET_REQ_VARIABLE, FETCH_CLIENT_SET_SETVAR_CHANGE, VariableActionTypes } from "./types";

export const SetReqVariableAction = (value: IVariable): VariableActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_VARIABLE,
    payload: {
      variable: value
    }
  };
};

export const SetReqAllVariableAction = (value: IVariable[]): VariableActionTypes => {
  return {
    type: FETCH_CLIENT_SET_REQ_ALL_VARIABLES,
    payload: {
      variables: value
    }
  };
};

export const SetReqLocalChangeAction = (value: boolean): VariableActionTypes => {
  return {
    type: FETCH_CLIENT_SET_LOCAL_CHANGE,
    payload: {
      change: value
    }
  };
};

export const SetReqVarChangeAction = (value: boolean): VariableActionTypes => {
  return {
    type: FETCH_CLIENT_SET_SETVAR_CHANGE,
    payload: {
      setVarChanged: value
    }
  };
};
