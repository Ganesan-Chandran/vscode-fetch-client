import { FETCH_CLIENT_SET_ACC_OPEN, FETCH_CLIENT_SET_UI_HORIZONTAL, IUIModel, UIActionTypes } from "./types";

export const InitialState: IUIModel = {
  open: [true, false],
  horizontalLayout: true,
  theme: 2
};

export const UIReducer: (state?: IUIModel,
  action?: UIActionTypes) => IUIModel =
  (state: IUIModel = InitialState,
    action: UIActionTypes = {} as UIActionTypes): IUIModel => {
    switch (action.type) {
      case FETCH_CLIENT_SET_ACC_OPEN: {
        return {
          ...state,
          open: action.payload.open,
        };
      }
      case FETCH_CLIENT_SET_UI_HORIZONTAL: {
        return {
          ...state,
          horizontalLayout: action.payload.horizontalLayout,
          theme: action.payload.theme,
        };
      }
      default: {
        return state;
      }
    }
  };
