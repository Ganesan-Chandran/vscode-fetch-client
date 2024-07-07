import { AddToColUI } from './utils/ui/addToCollectionUIProvider';
import { collectionDBPath, cookieDBPath, historyDBPath, mainDBPath, variableDBPath } from './utils/db/consts';
import { CookieUI } from './utils/ui/cookieUIProvider';
import { CreateCollectionDB, CreateCookieDB, CreateHistoryDB, CreateMainDB, CreateVariableDB } from './utils/db/dbUtil';
import { createLogFile } from './utils/logger/logger';
import { CurlProviderUI } from './utils/ui/curlUIProvider';
import { ErrorLogUI } from './utils/ui/errorLogUIProvider';
import { IPubSubMessage, PubSub } from './utils/PubSub';
import { LocalStorageService } from './utils/LocalStorageService';
import { logPath } from './utils/logger/consts';
import { SideBarProvider } from './utils/ui/sideBarUIProvider';
import { VariableUI } from './utils/ui/variableUIProvider';
import { WebAppPanel } from './utils/ui/mainUIProvider';
import * as vscode from 'vscode';
import fs from "fs";
import { VSCodeLogger } from './utils/logger/vsCodeLogger';
import { pubSubTypes } from './utils/configuration';

export var pubSub: PubSub<IPubSubMessage>;
export var vsCodeLogger: VSCodeLogger;
export var sideBarProvider: SideBarProvider;
var storageManager: LocalStorageService;
var extPath = "";
var extensionUri: vscode.Uri;

export function OpenExistingItem(id?: string, name?: string, colId?: string, folderId?: string, varId?: string, type?: string, newTab?: boolean) {
  WebAppPanel.createOrShow(extensionUri, id, (name && name.length > 15 ? name.substring(0, 15) + "..." : name), colId, varId, type, folderId, newTab);
}

export function OpenAddToColUI(id: string) {
  vscode.commands.executeCommand("fetch-client.addToCol", id, "", "", "addtocol");
}

export function OpenVariableUI(id?: string, type?: string) {
  vscode.commands.executeCommand("fetch-client.newVar", id, type);
}

export function OpenCopyToColUI(id: string, name: string) {
  vscode.commands.executeCommand("fetch-client.addToCol", id, "", name, "copytocol");
}

export function OpenAttachVariableUI(id: string, name: string) {
  vscode.commands.executeCommand("fetch-client.addToCol", id, "", name, "attachcol");
}

export function OpenRunAllUI(colId: string, folderId: string, name: string, varId: string) {
  vscode.commands.executeCommand("fetch-client.addToCol", colId, folderId, name, "runall", varId);
}

export function OpenCookieUI(id?: string) {
  vscode.commands.executeCommand("fetch-client.manageCookies", id);
}

export function OpenCurlUI() {
  vscode.commands.executeCommand("fetch-client.curlRequest");
}

export function OpenColSettings(colId: string, folderId: string, name: string, type: string, varId: string) {
  vscode.commands.executeCommand("fetch-client.addToCol", colId, folderId, name, "colsettings:" + type, varId);
}

export function activate(context: vscode.ExtensionContext) {

  extPath = context.globalStorageUri.fsPath;
  extensionUri = context.extensionUri;

  pubSub = new PubSub<IPubSubMessage>();
  vsCodeLogger = new VSCodeLogger();

  if (!fs.existsSync(extPath)) {
    fs.mkdirSync(extPath);
  }

  if (!fs.existsSync(extPath + "\\" + historyDBPath)) {
    CreateHistoryDB();
  }

  if (!fs.existsSync(extPath + "\\" + mainDBPath)) {
    CreateMainDB();
  }

  if (!fs.existsSync(extPath + "\\" + collectionDBPath)) {
    CreateCollectionDB();
  }

  if (!fs.existsSync(extPath + "\\" + variableDBPath)) {
    CreateVariableDB();
  }

  if (!fs.existsSync(extPath + "\\" + cookieDBPath)) {
    CreateCookieDB();
  }

  if (!fs.existsSync(extPath + "\\" + logPath)) {
    createLogFile();
  }

  storageManager = new LocalStorageService(context.workspaceState);

  vscode.window.onDidChangeActiveColorTheme((e: vscode.ColorTheme) => {
    if (pubSub) {
      pubSub.publish({ messageType: pubSubTypes.themeChanged });
    }
  });

  sideBarProvider = new SideBarProvider(context.extensionUri);
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(SideBarProvider.viewType, sideBarProvider));
  context.subscriptions.push(vscode.commands.registerCommand('fetch-client.newRequest', () => { WebAppPanel.createOrShow(context.extensionUri); }));
  context.subscriptions.push(AddToColUI(context.extensionUri));
  context.subscriptions.push(VariableUI(context.extensionUri));
  context.subscriptions.push(CookieUI(context.extensionUri));
  context.subscriptions.push(vscode.commands.registerCommand('fetch-client.openSettings', () => {
    vscode.commands.executeCommand('workbench.action.openSettings', 'Fetch Client');
  }));
  context.subscriptions.push(ErrorLogUI(context.extensionUri));
  context.subscriptions.push(CurlProviderUI(context.extensionUri));
}

export function getGlobalPath() {
  return extPath;
}

export function getStorageManager(): LocalStorageService {
  return storageManager;
}

export function deactivate() {
  pubSub.clear();
}
