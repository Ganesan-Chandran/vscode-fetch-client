import path from "path";
import * as vscode from 'vscode';
import { getCustomDbPathConfiguration, getDbPathConfiguration, getSaveToWorkspaceConfiguration, getWorkspacePathConfiguration } from "../utils/vscodeConfig";

let globalStorageUri = "";

export const getGlobalStorageUri = () => globalStorageUri;

export const cookieDBPath = (dbPath: string = "") =>
	path.resolve(dbPath || getExtDbPath(), "fetchClientCookies.db");

export const historyDBPath = (dbPath: string = "") =>
	path.resolve(dbPath || getExtDbPath(), "fetchClientHistory.db");

export const collectionDBPath = (dbPath: string = "") =>
	path.resolve(dbPath || getExtDbPath(), "fetchClientCollection.db");

export const mainDBPath = (dbPath: string = "") =>
	path.resolve(dbPath || getExtDbPath(), "fetchClient.db");

export const variableDBPath = (dbPath: string = "") =>
	path.resolve(dbPath || getExtDbPath(), "fetchClientVariable.db");

export const autoRequestDBPath = (dbPath: string = "") =>
	path.resolve(dbPath || getExtDbPath(), "fetchAutoRequest.db");

export const responseDBPath = (dbPath: string = "") =>
	path.resolve(dbPath || getExtDbPath(), "fetchClientResponse.db");

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

    if (pathState) {
        return getExtLocalDbPath();
    }

    const mode = getDbPathConfiguration();

    if (mode === "Workspace") {
        return getExtLocalDbPath();
    }

    if (mode === "Custom Path") {
        const custom = getCustomDbPathConfiguration();
        return custom || globalStorageUri;
    }

    if (getSaveToWorkspaceConfiguration()) {
        return getExtLocalDbPath();
    }

    return globalStorageUri;
}

export function getExtDbBKPPath(): string {
	return globalStorageUri + "-bkp";
}