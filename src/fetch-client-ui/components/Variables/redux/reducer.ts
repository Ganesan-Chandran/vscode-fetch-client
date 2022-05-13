import { FETCH_CLIENT_SET_LOCAL_CHANGE, FETCH_CLIENT_SET_REQ_ALL_VARIABLES, FETCH_CLIENT_SET_REQ_VARIABLE, IVariableModel, VariableActionTypes } from "./types";

export const InitialState: IVariableModel = {
  variables: [],
  selectedVariable: {
    id: "",
    name: "",
    createdTime: "",
    isActive: false,
    data: []
  },
  isLocalChange: false
};

export const VariableReducer: (state?: IVariableModel,
  action?: VariableActionTypes) => IVariableModel =
  (state: IVariableModel = InitialState,
    action: VariableActionTypes = {} as VariableActionTypes): IVariableModel => {
    switch (action.type) {
      case FETCH_CLIENT_SET_REQ_VARIABLE: {
        return {
          ...state,
          selectedVariable: {
            ...state.selectedVariable,
            id: action.payload.variable.id,
            name: action.payload.variable.name,
            createdTime: action.payload.variable.createdTime,
            isActive: action.payload.variable.isActive,
            data: action.payload.variable.data,
          }
        };
      }
      case FETCH_CLIENT_SET_REQ_ALL_VARIABLES: {
        return {
          ...state,
          variables: action.payload.variables
        };
      }
      case FETCH_CLIENT_SET_LOCAL_CHANGE: {
        return {
          ...state,
          isLocalChange: action.payload.change
        };
      }
      default: {
        return state;
      }
    }
  };
