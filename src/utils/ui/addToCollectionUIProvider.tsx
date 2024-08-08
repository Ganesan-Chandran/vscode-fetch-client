import * as vscode from 'vscode';
import fs from "fs";
import { getStorageManager, OpenExistingItem, sideBarProvider } from '../../extension';
import { getNonce, requestTypes, responseTypes } from '../configuration';
import { AddToCollection, AttachVariable, CopyToCollection, ExecuteMultipleRequest, ExecuteRequest, GetAllCollectionName, GetAllCollectionsById, GetAllCollectionsByIdWithPath, GetCollectionSettings, GetParentSettings, SaveCollectionSettings } from '../db/collectionDBUtil';
import { GetHistoryById } from '../db/historyDBUtil';
import { GetAllVariable, GetVariableById, UpdateVariable } from '../db/varDBUtil';
import { apiFetch, FetchConfig } from '../fetchUtil';
import { getHeadersConfiguration, getTimeOutConfiguration } from '../vscodeConfig';
import { writeLog } from '../logger/logger';
import axios from 'axios';
import { ExecuteAPIRequest } from './helper';

export const AddToColUI = (extensionUri: any) => {
  const disposable = vscode.commands.registerCommand('fetch-client.addToCol', (colId: string, folderId: string, name: string, type: string, varId?: string) => {
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
    const title = `${type}@:@${colId}@:@${folderId}@:@${name}@:@${varId}`;

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

    let fetchConfig: FetchConfig = {
      timeOut: getTimeOutConfiguration(),
      headersCase: getHeadersConfiguration(),
      source: null
    };

    colPanel.webview.onDidReceiveMessage(async (message: any) => {
      if (message.type === requestTypes.getAllCollectionNameRequest) {
        GetAllCollectionName(colPanel.webview, message.data);
      } else if (message.type === requestTypes.getHistoryItemRequest) {
        GetHistoryById(message.data, colPanel.webview);
      } else if (message.type === requestTypes.addToCollectionsRequest) {
        AddToCollection(message.data.col, message.data.hasFolder, message.data.isNewFolder, colPanel.webview, sideBarProvider.view);
      } else if (message.type === requestTypes.copyToCollectionsRequest) {
        CopyToCollection(message.data.sourceId, message.data.distId, message.data.name, colPanel.webview, sideBarProvider.view);
      } else if (message.type === requestTypes.getAllVariableRequest) {
        GetAllVariable(colPanel.webview);
      } else if (message.type === requestTypes.attachVariableRequest) {
        AttachVariable(message.data.colId, message.data.varId, colPanel.webview, sideBarProvider.view);
      } else if (message.type === requestTypes.getCollectionsByIdRequest) {
        GetAllCollectionsById(message.data.colId, message.data.folderId, message.data.type, colPanel.webview);
      } else if (message.type === requestTypes.apiRequest) {
        const CancelToken = axios.CancelToken;
        fetchConfig.source = CancelToken.source();
        await ExecuteAPIRequest(message, fetchConfig, colPanel.webview);
      } else if (message.type === requestTypes.multipleApiRequest) {
        ExecuteMultipleRequest(message, fetchConfig, colPanel.webview);
      } else if (message.type === requestTypes.getAllVariableRequest) {
        GetAllVariable(colPanel.webview);
      } else if (message.type === requestTypes.openRunRequest) {
        getStorageManager().setValue("run-request", message.data.reqData);
        getStorageManager().setValue("run-response", message.data.resData);
        OpenExistingItem(message.data.reqData.id, message.data.reqData.name, message.data.colId, message.data.folderId, message.data.varId, "runopen");
      } else if (message.type === requestTypes.exportRunTestJsonRequest) {
        vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file("fetch-client-collection-report-" + message.name + ".json"), filters: { 'Json Files': ['json'] } }).then((uri: vscode.Uri | undefined) => {
          if (uri) {
            const value = uri.fsPath;
            fs.writeFile(value, JSON.stringify(message.data), (error) => {
              if (error) {
                vscode.window.showErrorMessage("Could not save to '" + value + "'. Error Message : " + error.message, { modal: true });
                writeLog("error::ExportVariable()::FileWrite()" + error.message);
              } else {
                vscode.window.showInformationMessage("Successfully saved to '" + value + "'.", { modal: true });
              }
            });
          }
        });
      } else if (message.type === requestTypes.exportRunTestCSVRequest) {
        vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file("fetch-client-collection-report-" + message.name + ".csv"), filters: { 'CSV': ['csv'] } }).then((uri: vscode.Uri | undefined) => {
          if (uri) {
            const value = uri.fsPath;
            fs.writeFile(value, message.data.toString(), (error) => {
              if (error) {
                vscode.window.showErrorMessage("Could not save to '" + value + "'. Error Message : " + error.message, { modal: true });
                writeLog("error::ExportVariable()::FileWrite()" + error.message);
              } else {
                vscode.window.showInformationMessage("Successfully saved to '" + value + "'.", { modal: true });
              }
            });
          }
        });
      } else if (message.type === requestTypes.saveColSettingsRequest) {
        SaveCollectionSettings(colPanel.webview, message.data.colId, message.data.folderId, message.data.settings);
      } else if (message.type === requestTypes.getColSettingsRequest) {
        GetCollectionSettings(colPanel.webview, message.data.colId, message.data.folderId);
      } else if (message.type === requestTypes.updateVariableRequest) {
        UpdateVariable(message.data, null);
      } else if (message.type === requestTypes.getVariableItemRequest) {
        GetVariableById(message.data.id, message.data.isGlobal, colPanel.webview);
      } else if (message.type === requestTypes.tokenRequest) {
        apiFetch(message.data.reqData, message.data.variableData, message.data.settings, null, fetchConfig, responseTypes.tokenResponse).then((data) => {
          colPanel.webview.postMessage(data);
        });
      } else if (message.type === requestTypes.getCollectionsByIdWithPathRequest) {
        GetAllCollectionsByIdWithPath(message.data, colPanel.webview);
      } else if (message.type === requestTypes.getParentSettingsRequest) {
        GetParentSettings(message.data.colId, message.data.folderId, colPanel.webview);
      }
    });
  });

  return disposable;

};