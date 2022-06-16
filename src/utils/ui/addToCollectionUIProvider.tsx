import * as vscode from 'vscode';
import fs from "fs";
import { getStorageManager, OpenExistingItem, sideBarProvider } from '../../extension';
import { getNonce, requestTypes } from '../configuration';
import { AddToCollection, AttachVariable, CopyToCollection, GetAllCollectionName, GetAllCollectionsById, GetCollectionSettings, SaveCollectionSettings } from '../db/collectionDBUtil';
import { GetHistoryById } from '../db/historyDBUtil';
import { GetAllVariable, GetVariableById, UpdateVariable } from '../db/varDBUtil';
import { apiFetch } from '../fetchUtil';
import { getTimeOut } from '../vscodeConfig';
import { writeLog } from '../logger/logger';

export const AddToColUI = (extensionUri: any) => {
  const disposable = vscode.commands.registerCommand('fetch-client.addToCol', (id: string, name: string, type: string, varId?: string) => {
    const colPanel = vscode.window.createWebviewPanel(
      "fetch-client",
      name ? name : "Fetch Client - Collection",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const scriptUri = colPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "dist/fetch-client-ui.js")
    );

    const styleUri = colPanel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "/dist/main.css"));

    const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
    colPanel.iconPath = iconUri;

    const nonce = getNonce();
    const title = `${type}:${id}:${name}:${varId}`;

    colPanel.webview.html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="${styleUri}" rel="stylesheet" type="text/css"/>
        <title>${title}</title>
      </head>
      <body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
    </html>`;



    colPanel.webview.onDidReceiveMessage((reqData: any) => {
      if (reqData.type === requestTypes.getAllCollectionNameRequest) {
        GetAllCollectionName(colPanel.webview, reqData.data);
      } else if (reqData.type === requestTypes.getHistoryItemRequest) {
        GetHistoryById(reqData.data, colPanel.webview);
      } else if (reqData.type === requestTypes.addToCollectionsRequest) {
        AddToCollection(reqData.data.col, reqData.data.hasFolder, reqData.data.isNewFolder, colPanel.webview, sideBarProvider.view);
      } else if (reqData.type === requestTypes.copyToCollectionsRequest) {
        CopyToCollection(reqData.data.sourceId, reqData.data.distId, reqData.data.name, colPanel.webview, sideBarProvider.view);
      } else if (reqData.type === requestTypes.getAllVariableRequest) {
        GetAllVariable(colPanel.webview);
      } else if (reqData.type === requestTypes.attachVariableRequest) {
        AttachVariable(reqData.data.colId, reqData.data.varId, colPanel.webview, sideBarProvider.view);
      } else if (reqData.type === requestTypes.getCollectionsByIdRequest) {
        GetAllCollectionsById(reqData.data.id, reqData.data.type, colPanel.webview);
      } else if (reqData.type === requestTypes.apiRequest) {
        const timeOut = getTimeOut();
        apiFetch(reqData.data.reqData, timeOut, null, reqData.data.variableData).then((data) => {
          colPanel.webview.postMessage(data);
        });
      } else if (reqData.type === requestTypes.getAllVariableRequest) {
        GetAllVariable(colPanel.webview);
      } else if (reqData.type === requestTypes.openRunRequest) {
        getStorageManager().setValue("run-request", reqData.data.reqData);
        getStorageManager().setValue("run-response", reqData.data.resData);
        OpenExistingItem(reqData.data.reqData.id, reqData.data.reqData.name, reqData.data.varId, "runopen");
      } else if (reqData.type === requestTypes.exportRunTestJsonRequest) {
        vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file("fetch-client-collection-report-" + reqData.name + ".json"), filters: { 'Json Files': ['json'] } }).then((uri: vscode.Uri | undefined) => {
          if (uri) {
            const value = uri.fsPath;
            fs.writeFile(value, JSON.stringify(reqData.data), (error) => {
              if (error) {
                vscode.window.showErrorMessage("Could not save to '" + value + "'. Error Message : " + error.message);
                writeLog("error::ExportVariable()::FileWrite()" + error.message);
              } else {
                vscode.window.showInformationMessage("Successfully saved to '" + value + "'.");
              }
            });
          }
        });
      } else if (reqData.type === requestTypes.exportRunTestCSVRequest) {
        vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file("fetch-client-collection-report-" + reqData.name + ".csv"), filters: { 'CSV': ['csv'] } }).then((uri: vscode.Uri | undefined) => {
          if (uri) {
            const value = uri.fsPath;
            fs.writeFile(value, reqData.data.toString(), (error) => {
              if (error) {
                vscode.window.showErrorMessage("Could not save to '" + value + "'. Error Message : " + error.message);
                writeLog("error::ExportVariable()::FileWrite()" + error.message);
              } else {
                vscode.window.showInformationMessage("Successfully saved to '" + value + "'.");
              }
            });
          }
        });
      } else if (reqData.type === requestTypes.saveColSettingsRequest) {
        SaveCollectionSettings(colPanel.webview, reqData.data.id, reqData.data.settings, reqData.data.type);
      } else if (reqData.type === requestTypes.getColSettingsRequest) {
        GetCollectionSettings(colPanel.webview, reqData.data.id, reqData.data.type);
      } else if (reqData.type === requestTypes.updateVariableRequest) {
        UpdateVariable(reqData.data, null);
      } else if (reqData.type === requestTypes.getVariableItemRequest) {
        GetVariableById(reqData.data.id, reqData.data.isGlobal, colPanel.webview);
      }
    });
  });

  return disposable;

};