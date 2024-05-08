import * as vscode from "vscode";
import {
  CreateCollectionDB,
  CreateCookieDB,
  CreateHistoryDB,
  CreateMainDB,
  CreateVariableDB,
} from "./utils/db/dbUtil";
import fs from "fs";
import { AddToColUI } from "./utils/ui/addToCollectionUIProvider";
import { MainUIProvider } from "./utils/ui/mainUIProvider";
import { SideBarProvider } from "./utils/ui/sideBarUIProvider";
import { createLogFile } from "./utils/logger/logger";
import { VariableUI } from "./utils/ui/variableUIProvider";
import { LocalStorageService } from "./utils/LocalStorageService";
import { CookieUI } from "./utils/ui/cookieUIProvider";
import { ErrorLogUI } from "./utils/ui/errorLogUIProvider";
import { CurlProviderUI } from "./utils/ui/curlUIProvider";
import { getExtDbPath, setGlobalStorageUri } from "./utils/db/getExtDbPath";
import {
  collectionDBPath,
  cookieDBPath,
  historyDBPath,
  mainDBPath,
  variableDBPath,
} from "./utils/db/dbPaths";
import path from "path";
import { logPath } from "./utils/logger/constants";
import { transferDbConfig } from "./utils/db/transferDBConfig";

export var sideBarProvider: SideBarProvider;
var storageManager: LocalStorageService;
var extPath = "";

export function OpenExistingItem(
  id?: string,
  name?: string,
  colId?: string,
  folderId?: string,
  varId?: string,
  type?: string
) {
  vscode.commands.executeCommand(
    "fetch-client.newRequest",
    id,
    name && name.length > 15 ? name.substring(0, 15) + "..." : name,
    colId,
    varId,
    type,
    folderId
  );
}

export function OpenAddToColUI(id: string) {
  vscode.commands.executeCommand(
    "fetch-client.addToCol",
    id,
    "",
    "",
    "addtocol"
  );
}

export function OpenVariableUI(id?: string, type?: string) {
  vscode.commands.executeCommand("fetch-client.newVar", id, type);
}

export function OpenCopyToColUI(id: string, name: string) {
  vscode.commands.executeCommand(
    "fetch-client.addToCol",
    id,
    "",
    name,
    "copytocol"
  );
}

export function OpenAttachVariableUI(id: string, name: string) {
  vscode.commands.executeCommand(
    "fetch-client.addToCol",
    id,
    "",
    name,
    "attachcol"
  );
}

export function OpenRunAllUI(
  colId: string,
  folderId: string,
  name: string,
  varId: string
) {
  vscode.commands.executeCommand(
    "fetch-client.addToCol",
    colId,
    folderId,
    name,
    "runall",
    varId
  );
}

export function OpenCookieUI(id?: string) {
  vscode.commands.executeCommand("fetch-client.manageCookies", id);
}

export function OpenCurlUI() {
  vscode.commands.executeCommand("fetch-client.curlRequest");
}

export function OpenColSettings(
  colId: string,
  folderId: string,
  name: string,
  type: string,
  varId: string
) {
  vscode.commands.executeCommand(
    "fetch-client.addToCol",
    colId,
    folderId,
    name,
    "colsettings:" + type,
    varId
  );
}

export function activate(context: vscode.ExtensionContext) {
  console.log(
    "context.globalStorageUri.fsPath",
    context.globalStorageUri.fsPath
  );

  setGlobalStorageUri(context.globalStorageUri.fsPath);
  extPath = getExtDbPath();

  if (!fs.existsSync(extPath)) {
    fs.mkdirSync(extPath, { recursive: true });
  }

  if (!fs.existsSync(historyDBPath())) {
    CreateHistoryDB();
  }

  if (!fs.existsSync(mainDBPath())) {
    CreateMainDB();
  }

  if (!fs.existsSync(collectionDBPath())) {
    CreateCollectionDB();
  }

  if (!fs.existsSync(variableDBPath())) {
    CreateVariableDB();
  }

  if (!fs.existsSync(cookieDBPath())) {
    CreateCookieDB();
  }

  if (!fs.existsSync(path.resolve(extPath, logPath))) {
    createLogFile();
  }

  storageManager = new LocalStorageService(context.workspaceState);

  sideBarProvider = new SideBarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SideBarProvider.viewType,
      sideBarProvider
    )
  );
  context.subscriptions.push(
    MainUIProvider(context.extensionUri, sideBarProvider)
  );
  context.subscriptions.push(AddToColUI(context.extensionUri));
  context.subscriptions.push(VariableUI(context.extensionUri));
  context.subscriptions.push(CookieUI(context.extensionUri));
  context.subscriptions.push(
    vscode.commands.registerCommand("fetch-client.openSettings", () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "Fetch Client"
      );
    })
  );
  context.subscriptions.push(ErrorLogUI(context.extensionUri));
  context.subscriptions.push(CurlProviderUI(context.extensionUri));

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("fetch-client.keepInLocalPath")) {
        transferDbConfig();
      }
    })
  );
}

export function getStorageManager(): LocalStorageService {
  return storageManager;
}

export function deactivate() {}
