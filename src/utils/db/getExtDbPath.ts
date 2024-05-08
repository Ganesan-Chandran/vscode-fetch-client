import * as vscode from "vscode";
import path from "path";
import { getKeepInLocalPathConfiguration } from "../vscodeConfig";

let globalStorageUri = "";

export const setGlobalStorageUri = (pathDef: string) => {
  globalStorageUri = pathDef;
};

export const getGlobalStorageUri = () => globalStorageUri;

export function getExtLocalDbPath() {
  const workspacePath =
    vscode?.workspace?.workspaceFolders?.[0].uri.fsPath || "";
  const extPath = path.resolve(workspacePath, ".fetch-client");
  return extPath;
}

export function getExtDbPath() {
  const pathState = getKeepInLocalPathConfiguration();
  return pathState ? getExtLocalDbPath() : globalStorageUri;
}
