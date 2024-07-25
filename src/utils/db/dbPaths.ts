import path from "path";
import { getExtDbPath } from "./getExtDbPath";

export const cookieDBPath = () =>
  path.resolve(getExtDbPath(), "fetchClientCookies.json");

export const historyDBPath = () =>
  path.resolve(getExtDbPath(), "fetchClientHistory.json");

export const collectionDBPath = () =>
  path.resolve(getExtDbPath(), "fetchClientCollection.json");

export const mainDBPath = () =>
  path.resolve(getExtDbPath(), "fetchClient.json");

export const variableDBPath = () =>
  path.resolve(getExtDbPath(), "fetchClientVariable.json");
