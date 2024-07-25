import * as vscode from 'vscode';
import path from 'path';
import { getSaveToWorkspaceConfiguration, getWorkspacePathConfiguration } from "../vscodeConfig";

let globalStorageUri = "";

export const setGlobalStorageUri = (pathDef: string) => {
  globalStorageUri = pathDef;
};

export const getGlobalStorageUri = () => globalStorageUri;

export function getExtLocalDbPath(): string {
  const existingPath = getWorkspacePathConfiguration();
  if (existingPath) {
    return existingPath;
  }
  const workspacePath = vscode?.workspace?.workspaceFolders?.[0].uri.fsPath || "";
  return workspacePath ? path.resolve(workspacePath, "fetch-client") : "";
}

export function getExtDbPath(): string {
  const pathState = getSaveToWorkspaceConfiguration();
  return pathState ? getExtLocalDbPath() : globalStorageUri;
}

export function getExtDbBKPPath(): string {
  return globalStorageUri + "-bkp";
}
