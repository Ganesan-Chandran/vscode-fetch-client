import { CookieActionTypes, FETCH_CLIENT_SET_ALL_COOKIE } from "./types";
import { ICookie } from "../../../../fetch-client-core/types/cookie.types";

export const SetAllCookiesAction = (value: ICookie[]): CookieActionTypes => {
	return {
		type: FETCH_CLIENT_SET_ALL_COOKIE,
		payload: {
			cookies: value,
		},
	};
};
