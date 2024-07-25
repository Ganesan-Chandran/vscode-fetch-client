import * as vscode from 'vscode';
import { responseTypes } from './configuration';
import { getExtLocalDbPath } from './db/getExtDbPath';

function getFetchClientConfiguration(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration('fetch-client');
}

export function getLayoutConfiguration(): any {
  let config = getFetchClientConfiguration();
  let layoutConfig = config.get("layout", "Horizontal Split");
  return { type: responseTypes.layoutConfigResponse, layoutConfigData: layoutConfig };
}

export function getConfiguration(): any {
  let config = getFetchClientConfiguration();
  const theme = vscode.window.activeColorTheme.kind;
  return { type: responseTypes.configResponse, configData: JSON.stringify(config), theme: theme };
}

export function getVSCodeTheme(): any {
  const theme = vscode.window.activeColorTheme.kind;
  return { type: responseTypes.themeResponse, theme: theme };
}

export function getSSLConfiguration(): boolean {
  let config = getFetchClientConfiguration();
  let sslCheck = config.get("SSLCheck", true);
  return sslCheck;
}

export function getHistoryLimitConfiguration(): string {
  let config = getFetchClientConfiguration();
  let limit = config.get("historyLimit", "25");
  return limit;
}

export function getTimeOutConfiguration(): number {
  let config = getFetchClientConfiguration();
  let limit = config.get("timeOut", 120000);
  return limit;
}

export function getHeadersConfiguration(): boolean {
  let config = getFetchClientConfiguration();
  let headerCase = config.get("headersCaseSensitive", true);
  return headerCase;
}

export function getProtocolConfiguration(): string {
  let config = getFetchClientConfiguration();
  let limit = config.get("defaultProtocol", "http");
  return limit;
}

export function getRequestTabOption(): boolean {
  let config = getFetchClientConfiguration();
  let option = config.get("separateRequestTab", false);
  return option;
}

export function getLogOption(): boolean {
  let config = getFetchClientConfiguration();
  let option = config.get("log", false);
  return option;
}

export function getRunMainRequestOption(): boolean {
  let config = getFetchClientConfiguration();
  let option = config.get("runMainRequest", true);
  return option;
}

export function getSaveToWorkspaceConfiguration(): boolean {
  let config = getFetchClientConfiguration();
  let keepInLocal = config.get("saveToWorkspace", false);
  return keepInLocal;
}

export function getWorkspacePathConfiguration(): string {
  let config = getFetchClientConfiguration();
  let localPath = config.get("workspacePath", "");
  return localPath;
}

export function updateSaveToWorkspaceConfiguration(value: boolean) {
  let config = getFetchClientConfiguration();
  config.update("saveToWorkspace", value);

  if (value) {
    updateWorkspacePathConfiguration(getExtLocalDbPath());
  }
  else {
    updateWorkspacePathConfiguration("");
  }
}

export function updateWorkspacePathConfiguration(value: string) {
  let config = getFetchClientConfiguration();
  config.update("workspacePath", value);
}

export function responseLimitConfiguration() {
  let config = getFetchClientConfiguration();
  let responseLimit = config.get("responseLimit", 5);
  return responseLimit * 1048576;
}
