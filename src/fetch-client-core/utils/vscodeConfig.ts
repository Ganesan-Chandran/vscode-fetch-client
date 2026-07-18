import * as vscode from "vscode";
import { responseTypes } from "../consts/requestTypes.consts";
import { getExtLocalDbPath } from "../db/dbHelper";
import { ITlsCertificate } from "../types/common.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DbPathOption = "Default" | "Workspace" | "Custom Path";

interface LayoutConfigResponse {
	type: string;
	layoutConfigData: string;
}

interface ConfigResponse {
	type: string;
	configData: string;
	theme: vscode.ColorThemeKind;
}

interface ThemeResponse {
	type: string;
	theme: vscode.ColorThemeKind;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let variableEncryptionConfiguration = false;
let variableEncryptionKeyCache = "";
let SSLCheck = true;
let tlsCertificates: ITlsCertificate[] = null;

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

function getFetchClientConfiguration(): vscode.WorkspaceConfiguration {
	return vscode.workspace.getConfiguration("fetch-client");
}

// ---------------------------------------------------------------------------
// Read-only config accessors
// ---------------------------------------------------------------------------

export function getLayoutConfiguration(): LayoutConfigResponse {
	const layoutConfig = getFetchClientConfiguration().get<string>(
		"layout",
		"Horizontal Split",
	);
	return {
		type: responseTypes.layoutConfigResponse,
		layoutConfigData: layoutConfig,
	};
}

export function getConfiguration(): ConfigResponse {
	const config = getFetchClientConfiguration();
	const theme = vscode.window.activeColorTheme.kind;
	return {
		type: responseTypes.configResponse,
		configData: JSON.stringify(config),
		theme,
	};
}

export function getVSCodeTheme(): ThemeResponse {
	const theme = vscode.window.activeColorTheme.kind;
	return { type: responseTypes.themeResponse, theme };
}

export function getSSLConfiguration(): boolean {
	return getFetchClientConfiguration().get<boolean>("SSLCheck", true);
}

export function getTlsCertificate(): ITlsCertificate[] {
	return getFetchClientConfiguration().get<ITlsCertificate[]>("tlsConfiguration", []);
}

export function getHistoryLimitConfiguration(): string {
	return getFetchClientConfiguration().get<string>("historyLimit", "25");
}

export function getHistoryViewConfiguration(): string {
	return getFetchClientConfiguration().get<string>("historyView", "Folder");
}

export function getTimeOutConfiguration(): number {
	return getFetchClientConfiguration().get<number>("timeOut", 120000);
}

export function getHeadersConfiguration(): boolean {
	return getFetchClientConfiguration().get<boolean>(
		"headersCaseSensitive",
		true,
	);
}

export function getProtocolConfiguration(): string {
	return getFetchClientConfiguration().get<string>("defaultProtocol", "http");
}

export function getRequestTabOption(): boolean {
	return getFetchClientConfiguration().get<boolean>(
		"separateRequestTab",
		false,
	);
}

export function getLogOption(): boolean {
	return getFetchClientConfiguration().get<boolean>("log", false);
}

export function getRunMainRequestOption(): boolean {
	return getFetchClientConfiguration().get<boolean>("runMainRequest", true);
}

export function getSaveToWorkspaceConfiguration(): boolean {
	return getFetchClientConfiguration().get<boolean>("saveToWorkspace", false);
}

export function getWorkspacePathConfiguration(): string {
	return getFetchClientConfiguration().get<string>("workspacePath", "");
}

export function getDbPathConfiguration(): DbPathOption {
	return getFetchClientConfiguration().get<DbPathOption>("dbPath", "Default");
}

export function getCustomDbPathConfiguration(): string {
	return getFetchClientConfiguration().get<string>("customDbPath", "");
}

export function updateDbPathConfiguration(value: DbPathOption): void {
	getFetchClientConfiguration().update(
		"dbPath",
		value,
		vscode.ConfigurationTarget.Global,
	);
}

export function getVariableEncryptionFCConfiguration(): boolean {
	return getFetchClientConfiguration().get<boolean>(
		"encryptedVariables",
		false,
	);
}

export function responseLimitConfiguration(): number {
	const responseLimit = getFetchClientConfiguration().get<number>(
		"responseLimit",
		5,
	);
	return responseLimit * 1048576;
}

export function getResponseSaveConfiguration(): boolean {
	return getFetchClientConfiguration().get<boolean>("saveResponse", false);
}

export function getSharedDBConfiguration(): boolean {
	return false;
}

export function getVariableEncryptionKey(): string {
	return (
		variableEncryptionKeyCache ||
		getFetchClientConfiguration().get<string>("variableEncryptionKey", "")
	);
}

export function getExportCollectionConfiguration(): boolean {
	return getFetchClientConfiguration().get<boolean>(
		"exportCollectionWithVariables",
		false,
	);
}

export function getSecretCacheTtlMs(): number {
  return getFetchClientConfiguration().get<number>("secretsCacheDuration", 0);
}

export function updateVariableEncryptionKey(key: string) {
	return getFetchClientConfiguration().update(
		"variableEncryptionKey",
		key,
		vscode.ConfigurationTarget.Global,
	);
}

export function updateVariableEncryption(shouldEncrypt: boolean) {
	return getFetchClientConfiguration().update(
		"encryptedVariables",
		shouldEncrypt,
		vscode.ConfigurationTarget.Global,
	);
}

// ---------------------------------------------------------------------------
// Variable encryption state (set once on activation, updated on config change)
// ---------------------------------------------------------------------------

export function setVariableEncryptionConfiguration(enabled: boolean): void {
	variableEncryptionConfiguration = enabled;
}

export function getVariableEncryptionConfiguration(): boolean {
	return variableEncryptionConfiguration;
}

export function setVariableEncryptionKey(key: string): void {
	variableEncryptionKeyCache = key;
}

// ---------------------------------------------------------------------------
// SSL and TLS configuration
// ---------------------------------------------------------------------------

export function setSSLCheck(enabled: boolean): void {
	SSLCheck = enabled;
}

export function setTLSCertificates(config: ITlsCertificate[]): void {
	tlsCertificates = config;
}


export function getSSLCheck(): boolean {
	return SSLCheck;
}

export function getTLSCertificates(): ITlsCertificate[] {
	return tlsCertificates;
}

// ---------------------------------------------------------------------------
// Mutable config updaters
// ---------------------------------------------------------------------------

export function updateSaveToWorkspaceConfiguration(value: boolean): void {
	const config = getFetchClientConfiguration();
	config.update("saveToWorkspace", value, vscode.ConfigurationTarget.Global);
	updateWorkspacePathConfiguration(value ? getExtLocalDbPath() : "");
}

export function updateWorkspacePathConfiguration(value: string): void {
	getFetchClientConfiguration().update(
		"workspacePath",
		value,
		vscode.ConfigurationTarget.Global,
	);
}
