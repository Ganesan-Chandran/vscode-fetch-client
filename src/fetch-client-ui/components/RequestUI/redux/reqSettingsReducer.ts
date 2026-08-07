import {
	FETCH_CLIENT_SET_LINKED_VARIABLE,
	FETCH_CLIENT_SET_SKIP_PARENT_HEADERS,
	FETCH_CLIENT_SET_SKIP_PARENT_PREFETCH,
	RequestActionTypes,
} from "./types";
import { IReqSettings } from "../../../../fetch-client-core/types/prefetch.types";

export const InitialState: IReqSettings = {
	skipParentHeaders: false,
	skipParentPreFetch: false,
	isLinkedVariable: false,
};

export const ReqSettingsReducer: (
	state?: IReqSettings,
	action?: RequestActionTypes,
) => IReqSettings = (
	state: IReqSettings = InitialState,
	action: RequestActionTypes = {} as RequestActionTypes,
): IReqSettings => {
	switch (action.type) {
		case FETCH_CLIENT_SET_SKIP_PARENT_PREFETCH: {
			return {
				...state,
				skipParentPreFetch: action.payload.skip,
			};
		}
		case FETCH_CLIENT_SET_SKIP_PARENT_HEADERS: {
			return {
				...state,
				skipParentHeaders: action.payload.skip,
			};
		}
		case FETCH_CLIENT_SET_LINKED_VARIABLE: {
			return {
				...state,
				isLinkedVariable: action.payload.isLinked,
			};
		}
		default: {
			return state;
		}
	}
};
