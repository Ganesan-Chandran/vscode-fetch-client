import { CookieActionTypes, FETCH_CLIENT_SET_ALL_COOKIE, ICookie } from "./types";

export const SetAllCookiesAction = (value: ICookie[]): CookieActionTypes => {
  return {
    type: FETCH_CLIENT_SET_ALL_COOKIE,
    payload: {
      cookies: value
    }
  };
};
