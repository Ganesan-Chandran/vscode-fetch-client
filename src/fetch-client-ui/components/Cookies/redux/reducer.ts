import { CookieActionTypes, FETCH_CLIENT_SET_ALL_COOKIE, ICookie, ICookiesModel } from "./types";

export const InitialCookie: ICookie = {
	id: "",
	name: "",
	data: []
};

export const InitialState: ICookiesModel = {
	cookies: [],
};

export const CookieReducer: (state?: ICookiesModel,
	action?: CookieActionTypes) => ICookiesModel =
	(state: ICookiesModel = InitialState,
		action: CookieActionTypes = {} as CookieActionTypes): ICookiesModel => {
		switch (action.type) {
			case FETCH_CLIENT_SET_ALL_COOKIE: {
				return {
					...state,
					cookies: action.payload.cookies
				};
			}
			default: {
				return state;
			}
		}
	};
