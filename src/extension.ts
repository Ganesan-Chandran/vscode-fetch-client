import * as vscode from 'vscode';
import { CreateCollectionDB, CreateHistoryDB, CreateMainDB, CreateVariableDB } from './utils/db/dbUtil';
import fs from "fs";
import { collectionDBPath, historyDBPath, mainDBPath, variableDBPath } from './utils/db/consts';
import { AddToColUI } from './utils/ui/addToCollectionUIProvider';
import { MainUIProvider } from './utils/ui/mainUIProvider';
import { SideBarProvider } from './utils/ui/sideBarUIProvider';
import { logPath } from './utils/logger/consts';
import { createLogFile } from './utils/logger/logger';
import { VariableUI } from './utils/ui/variableUIProvider';
import { LocalStorageService } from './utils/LocalStorageService';

export var sideBarProvider: SideBarProvider;
var storageManager: LocalStorageService;
var extPath = "";

export function OpenExistingItem(id?: string, name?: string, varId?: string, type?: string) {
  vscode.commands.executeCommand("fetch-client.newRequest", id, (name && name.length > 15 ? name.substring(0, 15) + "..." : name), varId, type);
}

export function OpenAddToColUI(id: string) {
  vscode.commands.executeCommand("fetch-client.addToCol", id, "", "addtocol");
}

export function OpenVariableUI(id?: string) {
  vscode.commands.executeCommand("fetch-client.newVar", id);
}

export function OpenCopyToColUI(id: string, name: string) {
  vscode.commands.executeCommand("fetch-client.addToCol", id, name, "copytocol");
}

export function OpenAttachVariableUI(id: string, name: string) {
  vscode.commands.executeCommand("fetch-client.addToCol", id, name, "attachcol");
}

export function OpenRunAllUI(id: string, name: string, varId: string) {
  vscode.commands.executeCommand("fetch-client.addToCol", id, name, "runall", varId);
}

export function activate(context: vscode.ExtensionContext) {

  extPath = context.globalStorageUri.fsPath;

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

  if (!fs.existsSync(extPath + "\\" + logPath)) {
    createLogFile();
  }

  storageManager = new LocalStorageService(context.workspaceState);

  sideBarProvider = new SideBarProvider(context.extensionUri);
  context.subscriptions.push(vscode.window.registerWebviewViewProvider(SideBarProvider.viewType, sideBarProvider));
  context.subscriptions.push(MainUIProvider(context.extensionUri, sideBarProvider));
  context.subscriptions.push(AddToColUI(context.extensionUri));
  context.subscriptions.push(VariableUI(context.extensionUri));
}

export function getGlobalPath() {
  return extPath;
}

export function getStorageManager(): LocalStorageService {
  return storageManager;
}

export function deactivate() { }
