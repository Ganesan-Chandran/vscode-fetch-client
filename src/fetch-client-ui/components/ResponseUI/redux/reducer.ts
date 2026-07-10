import { InitialResponse } from "../../../../fetch-client-core/consts/initialValues.consts";
import { IReponseModel } from "../../../../fetch-client-core/types/response.types";
import {
	FETCH_CLIENT_SET_LOADING,
	FETCH_CLIENT_SET_RES_COOKIES, FETCH_CLIENT_SET_RES_HEADERS, FETCH_CLIENT_SET_RES_PREFETCH_RESPONSE, FETCH_CLIENT_SET_RES_RESPONSE,
	FETCH_CLIENT_SET_TEST_RESULT,ResponseActionTypes
} from "./types";

export const InitialState: IReponseModel = {
	id: "",
	response: InitialResponse,
	headers: [],
	cookies: [],
	loading: false,
	testResults: [],
	preFetchResponse: []
};

export const ResponseReducer: (state?: IReponseModel,
	action?: ResponseActionTypes) => IReponseModel =
	(state: IReponseModel = InitialState,
		action: ResponseActionTypes = {} as ResponseActionTypes): IReponseModel => {
		switch (action.type) {
			case FETCH_CLIENT_SET_RES_RESPONSE: {
				return {
					...state,
					response: action.payload.response,
					loading: false
				};
			}
			case FETCH_CLIENT_SET_RES_HEADERS: {
				return {
					...state,
					headers: action.payload.headers,
				};
			}
			case FETCH_CLIENT_SET_RES_COOKIES: {
				return {
					...state,
					cookies: action.payload.cookies,
				};
			}
			case FETCH_CLIENT_SET_LOADING: {
				return {
					...state,
					loading: action.payload.loading,
					response: action.payload.loading === true ? InitialResponse : state.response,
				};
			}
			case FETCH_CLIENT_SET_TEST_RESULT: {
				return {
					...state,
					testResults: action.payload.testResults,
				};
			}
			case FETCH_CLIENT_SET_RES_PREFETCH_RESPONSE: {
				return {
					...state,
					preFetchResponse: action.payload.preFetchResponse,
				};
			}
			default: {
				return state;
			}
		}
	};
