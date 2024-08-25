import { FETCH_CLIENT_SET_ACC_OPEN, FETCH_CLIENT_SET_RESPONSE_LIMIT, FETCH_CLIENT_SET_RUN_ITEM, FETCH_CLIENT_SET_UI_HORIZONTAL, FETCH_CLIENT_SET_UI_THEME, ICommonConfig, UIActionTypes } from "./types";

export const InitialState: ICommonConfig = {
	open: [true, false],
	horizontalLayout: true,
	theme: 2,
	runItem: false,
	responseLimit: 5242880
};

export const UIReducer: (state?: ICommonConfig,
	action?: UIActionTypes) => ICommonConfig =
	(state: ICommonConfig = InitialState,
		action: UIActionTypes = {} as UIActionTypes): ICommonConfig => {
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
			case FETCH_CLIENT_SET_RUN_ITEM: {
				return {
					...state,
					runItem: action.payload.runItem
				};
			}
			case FETCH_CLIENT_SET_UI_THEME: {
				return {
					...state,
					theme: action.payload.theme
				};
			}
			case FETCH_CLIENT_SET_RESPONSE_LIMIT: {
				return {
					...state,
					responseLimit: action.payload.responseLimit < 1 ? 5242880 : action.payload.responseLimit
				};
			}
			default: {
				return state;
			}
		}
	};
