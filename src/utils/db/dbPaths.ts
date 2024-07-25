import path from "path";
import { getExtDbPath } from "./getExtDbPath";

export const cookieDBPath = () =>
  path.resolve(getExtDbPath(), "fetchClientCookies.db");

export const historyDBPath = () =>
  path.resolve(getExtDbPath(), "fetchClientHistory.db");

export const collectionDBPath = () =>
  path.resolve(getExtDbPath(), "fetchClientCollection.db");

export const mainDBPath = () =>
  path.resolve(getExtDbPath(), "fetchClient.db");

export const variableDBPath = () =>
  path.resolve(getExtDbPath(), "fetchClientVariable.db");
