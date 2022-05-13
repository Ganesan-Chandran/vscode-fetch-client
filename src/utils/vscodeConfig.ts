import * as vscode from 'vscode';
import { responseTypes } from './configuration';

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

export function getTimeOutConfiguration(): string {
  let config = getFetchClientConfiguration();
  let limit = config.get("timeOut", "5 min");
  return limit;
}

export function getProtocolConfiguration(): string {
  let config = getFetchClientConfiguration();
  let limit = config.get("defaultProtocol", "http");
  return limit;
}

export function getTimeOut(): number {
  const configTimout = getTimeOutConfiguration();
  switch (configTimout) {
    case "30 sec":
      return 30000;
    case "1 min":
      return 60000;
    case "2 min":
      return 120000;
    case "5 min":
      return 300000;
    case "10 min":
      return 600000;
    case "no timeout":
      return 0;
  }
}