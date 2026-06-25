import path from "path";
import * as vscode from 'vscode';
import { getSaveToWorkspaceConfiguration, getWorkspacePathConfiguration } from "../utils/vscodeConfig";

let globalStorageUri = "";

export const getGlobalStorageUri = () => globalStorageUri;

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

export const autoRequestDBPath = () =>
	path.resolve(getExtDbPath(), "fetchAutoRequest.db");

export const settingsDBPath = () =>
	path.resolve(getExtDbPath(), "fetchClientSettings.db");

export const responseDBPath = () =>
	path.resolve(getExtDbPath(), "fetchClientResponse.db");

export const setGlobalStorageUri = (pathDef: string) => {
	globalStorageUri = pathDef;
};

export function getExtLocalDbPath(): string {
	const existingPath = getWorkspacePathConfiguration();
	if (existingPath) {
		return existingPath;
	}
	const workspacePath = vscode?.workspace?.workspaceFolders?.[0]?.uri?.fsPath ?? "";
	return workspacePath ? path.resolve(workspacePath, "fetch-client") : "";
}

export function getExtDbPath(): string {
	const pathState = getSaveToWorkspaceConfiguration();
	return pathState ? getExtLocalDbPath() : globalStorageUri;
}

export function getExtDbBKPPath(): string {
	return globalStorageUri + "-bkp";
}