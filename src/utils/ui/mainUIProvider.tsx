import * as vscode from 'vscode';
import fs from "fs";
import { IRequestModel } from '../../fetch-client-ui/components/RequestUI/redux/types';
import { IHistory } from '../../fetch-client-ui/components/SideBar/redux/types';
import { getNonce, requestTypes, responseTypes } from '../configuration';
import { SaveHistory, UpdateHistory } from '../db/historyDBUtil';
import { GetExitingItem, SaveRequest, UpdateRequest } from '../db/mainDBUtil';
import { apiFetch } from '../fetchUtil';
import { getConfiguration, getLayoutConfiguration, getTimeOutConfiguration } from '../vscodeConfig';
import { SideBarProvider } from './sideBarUIProvider';
import axios, { CancelTokenSource } from 'axios';
import { writeLog } from '../logger/logger';
import { GetAllVariable, GetVariableById, UpdateVariable } from '../db/varDBUtil';
import { getTimeOut } from '../vscodeConfig';
import { getStorageManager, OpenCookieUI, OpenVariableUI } from '../../extension';
import { formatDate } from '../helper';
import { UpdateCollection } from '../db/collectionDBUtil';
import { GetAllCookies, SaveCookie } from '../db/cookieDBUtil';

export const MainUIProvider = (extensionUri: any, sideBarProvider: SideBarProvider) => {
  const disposable = vscode.commands.registerCommand('fetch-client.newRequest', (id?: string, name?: string, varId?: string, type?: string) => {
    const uiPanel = vscode.window.createWebviewPanel(
      "fetch-client",
      name ? name : "New Request",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const scriptUri = uiPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "dist/fetch-client-ui.js")
    );

    const styleUri = uiPanel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "/dist/main.css"));

    const nonce = getNonce();

    const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
    uiPanel.iconPath = iconUri;

    uiPanel.webview.html = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="${styleUri}" rel="stylesheet" type="text/css"/>
        <title>${id}:${varId}:${type}</title>
      </head>
      <body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
    </html>`;

    const timeOut = getTimeOut();
    let source: CancelTokenSource;

    uiPanel.webview.onDidReceiveMessage((message: any) => {
      if (message.type === requestTypes.apiRequest) {
        const CancelToken = axios.CancelToken;
        source = CancelToken.source();
        apiFetch(message.data.reqData, timeOut, source, message.data.variableData).then((data) => {
          uiPanel.webview.postMessage(data);

          let item: IHistory = {
            id: message.data.reqData.id,
            method: message.data.reqData.method,
            name: message.data.reqData.name ? message.data.reqData.name : message.data.reqData.url,
            url: message.data.reqData.url,
            createdTime: message.data.reqData.createdTime ? message.data.reqData.createdTime : formatDate()
          };

          let reqData = message.data.reqData as IRequestModel;
          if (reqData.body.bodyType === "binary") {
            reqData.body.binary.data = "";
          }

          if (message.data.isNew) {
            SaveRequest(reqData);
            SaveHistory(item, sideBarProvider.view);
          } else {
            UpdateRequest(reqData);
            UpdateHistory(item);
          }
        });
      } else if (message.type === requestTypes.cancelRequest) {
        if (source) {
          source.cancel("The request has been cancelled by the user.");
        }
      } else if (message.type === requestTypes.layoutConfigRequest) {
        uiPanel.webview.postMessage(getLayoutConfiguration());
      } else if (message.type === requestTypes.configRequest) {
        uiPanel.webview.postMessage(getConfiguration());
      } else if (message.type === requestTypes.openExistingItemRequest) {
        GetExitingItem(uiPanel.webview, message.data);
      } else if (message.type === requestTypes.saveResponseRequest) {
        vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file("fetch-client-response." + message.fileType) }).then((uri: vscode.Uri | undefined) => {
          if (uri) {
            const value = uri.fsPath;
            fs.writeFile(value, message.data, (error) => {
              if (error) {
                vscode.window.showErrorMessage("Could not save to '" + value + "'. Error Message : " + error.message);
                writeLog("error::saveResponseRequest()::FileWrite()" + error.message);
              } else {
                vscode.window.showInformationMessage("Successfully saved to '" + value + "'.");
              }
            });
          }
        });
      } else if (message.type === requestTypes.saveTestResponseRequest) {
        vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file("fetch-client-tests.json") }).then((uri: vscode.Uri | undefined) => {
          if (uri) {
            const value = uri.fsPath;
            fs.writeFile(value, message.data, (error) => {
              if (error) {
                vscode.window.showErrorMessage("Could not save to '" + value + "'. Error Message : " + error.message);
                writeLog("error::saveTestResponseRequest()::FileWrite()" + error.message);
              } else {
                vscode.window.showInformationMessage("Successfully saved to '" + value + "'.");
              }
            });
          }
        });
      } else if (message.type === requestTypes.downloadFileTypeRequest) {
        vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file("fetch-client-file." + message.fileType) }).then((uri: vscode.Uri | undefined) => {
          if (uri) {
            const value = uri.fsPath;
            fs.writeFile(value, new Uint8Array(message.resData.data), (error) => {
              if (error) {
                vscode.window.showErrorMessage("Could not save to '" + value + "'. Error Message : " + error.message);
                writeLog("error::downloadFileTypeRequest()::FileWrite()" + error.message);
              } else {
                vscode.window.showInformationMessage("Successfully saved to '" + value + "'.");
              }
            });
          }
        });
      } else if (message.type === requestTypes.selectFileRequest) {
        vscode.window.showOpenDialog().then((uri: vscode.Uri[] | undefined) => {
          if (uri && uri.length > 0) {
            const value = uri[0].fsPath;
            const data = fs.readFileSync(value, "utf8");
            uiPanel.webview.postMessage({ type: responseTypes.selectFileResponse, path: value, fileData: data });
          }
        });
      } else if (message.type === requestTypes.readFileRequest) {
        if (!fs.existsSync(message.path)) {
          uiPanel.webview.postMessage({ type: responseTypes.readFileResponse, fileData: "" });
        } else {
          const data = fs.readFileSync(message.path, "utf8");
          uiPanel.webview.postMessage({ type: responseTypes.readFileResponse, fileData: data });
        }
      } else if (message.type === requestTypes.getVariableItemRequest) {
        GetVariableById(message.data.id, message.data.isGlobal, uiPanel.webview);
      } else if (message.type === requestTypes.getAllVariableRequest) {
        GetAllVariable(uiPanel.webview);
      } else if (message.type === requestTypes.getRunItemDataRequest) {
        uiPanel.webview.postMessage({ type: responseTypes.getRunItemDataResponse, reqData: getStorageManager().getValue("run-request"), resData: getStorageManager().getValue("run-response") });
        getStorageManager().setValue("run-request", "");
        getStorageManager().setValue("run-response", "");
      } else if (message.type === requestTypes.saveRequest) {
        let item: IHistory = {
          id: message.data.reqData.id,
          method: message.data.reqData.method,
          name: message.data.reqData.name ? message.data.reqData.name : message.data.reqData.url,
          url: message.data.reqData.url,
          createdTime: message.data.reqData.createdTime ? message.data.reqData.createdTime : formatDate()
        };

        let reqData = message.data.reqData as IRequestModel;
        if (reqData.body.bodyType === "binary") {
          reqData.body.binary.data = "";
        }
        if (message.data.isNew) {
          SaveRequest(reqData);
          SaveHistory(item, sideBarProvider.view);
        } else {
          UpdateRequest(reqData);
          UpdateHistory(item);
          UpdateCollection(item);
        }
        uiPanel.webview.postMessage({ type: responseTypes.saveResponse });
      }
      else if (message.type === requestTypes.openVariableItemRequest) {
        OpenVariableUI(message.data);
      } else if (message.type === requestTypes.updateVariableRequest) {
        UpdateVariable(message.data, null);
      } else if (message.type === requestTypes.saveCookieRequest) {
        SaveCookie(message.data, null);
      } else if (message.type === requestTypes.getAllCookiesRequest) {
        GetAllCookies(uiPanel.webview);
      } else if (message.type === requestTypes.openManageCookiesRequest) {
        OpenCookieUI(message.data);
      }
    });
  });

  return disposable;

};
