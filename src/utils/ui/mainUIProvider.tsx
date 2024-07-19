import { apiFetch, FetchConfig } from "../fetchUtil";
import { formatDate, getErrorResponse } from "../helper";
import { getLayoutConfiguration, getConfiguration, getHeadersConfiguration, getTimeOutConfiguration, getRequestTabOption, getVSCodeTheme, getRunMainRequestOption } from "../vscodeConfig";
import { getNonce, pubSubTypes, requestTypes, responseTypes } from "../configuration";
import { GetVariableById, GetAllVariable, UpdateVariable } from "../db/varDBUtil";
import { IHistory } from "../../fetch-client-ui/components/SideBar/redux/types";
import { IRequestModel } from "../../fetch-client-ui/components/RequestUI/redux/types";
import { SaveCookie, GetAllCookies } from "../db/cookieDBUtil";
import { SaveHistory, UpdateHistory } from "../db/historyDBUtil";
import { SaveRequest, UpdateRequest, GetExitingItem } from "../db/mainDBUtil";
import { sideBarProvider, getStorageManager, OpenVariableUI, OpenCookieUI, pubSub, vsCodeLogger } from "../../extension";
import { IPubSubMessage, Subscription } from "../PubSub";
import { UpdateCollection, GetParentSettings, GetAllCollectionsByIdWithPath, GetAllCollectionName } from "../db/collectionDBUtil";
import { writeLog } from "../logger/logger";
import * as vscode from "vscode";
import axios from "axios";
import fs from "fs";
import { PreFetchRunner } from "../PreFetchRunner";

export class WebAppPanel {

  public static currentPanel: WebAppPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  private _scriptionId: Subscription;

  public static createOrShow(extensionUri: vscode.Uri, id?: string, name?: string, colId?: string, varId?: string, type?: string, folderId?: string, newTab?: boolean) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn : undefined;

    let tabOption = getRequestTabOption();

    if (!tabOption && !newTab && WebAppPanel.currentPanel) {
      WebAppPanel.currentPanel._update(id, colId, varId, type, folderId);
      WebAppPanel.currentPanel._panel.reveal(column);
      WebAppPanel.currentPanel._panel.title = name ? name : "New Request";
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "fetch-client",
      name ? name : "New Request",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
    panel.iconPath = iconUri;

    WebAppPanel.currentPanel = new WebAppPanel(panel, extensionUri, id, colId, varId, type, folderId);
  }

  public static kill() {
    WebAppPanel.currentPanel?.dispose();
    WebAppPanel.currentPanel = undefined;
  }

  public static getCurrentWebView() {
    if (WebAppPanel.currentPanel) { return WebAppPanel.currentPanel._panel.webview; }

    return null;
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    id?: string,
    colId?: string,
    varId?: string,
    type?: string,
    folderId?: string
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update(id, colId, varId, type, folderId);

    this._pushMessages = this._pushMessages.bind(this);

    this._scriptionId = pubSub.subscribe(this._pushMessages);

    this._panel.onDidDispose(() => {
      this._scriptionId.unsubscribe();
      this.dispose();
    }, null, this._disposables);

    this._panel.onDidChangeViewState(function (event) {
      if (event.webviewPanel.active) {
        sideBarProvider.view.webview.postMessage({ type: requestTypes.selectItemRequest, colId: colId, folId: folderId, id: id });
      }
    }, null, this._disposables);

    let fetchConfig: FetchConfig = {
      timeOut: getTimeOutConfiguration(),
      headersCase: getHeadersConfiguration(),
      runMainRequest: getRunMainRequestOption()
    };

    // Handle messages from the webview  
    this._panel.webview.onDidReceiveMessage(
      message => {
        try {
          if (message.type === requestTypes.apiRequest) {
            const CancelToken = axios.CancelToken;
            fetchConfig.source = CancelToken.source();

            let request = message.data.reqData as IRequestModel;
            let preFetch = request.preFetch;

            if (preFetch?.requests?.length > 0 && preFetch?.requests[0].reqId) {
              let preFetchRunner = new PreFetchRunner(fetchConfig, request.id);
              preFetchRunner.RunPreRequests(preFetch, 0, 0, request.name).then(() => {
                if (preFetchRunner.message) {
                  if (fetchConfig.runMainRequest === true) {
                    setTimeout(() => {
                      vsCodeLogger.log("INFO", "\n\n" + preFetchRunner.message + "\n");
                    }, 1000);
                    this._executeAPIRequest(message, fetchConfig);
                  } else {
                    fetchConfig.source = null;
                    let errorResponse = getErrorResponse();
                    errorResponse.response.responseData = preFetchRunner.message;
                    this._panel.webview.postMessage(errorResponse);
                    return;
                  }
                } else {
                  this._executeAPIRequest(message, fetchConfig);
                }
              });
            } else {
              this._executeAPIRequest(message, fetchConfig);
            }
          } else if (message.type === requestTypes.cancelRequest) {
            if (fetchConfig.source) {
              fetchConfig.source.cancel("The request has been cancelled by the user.");
            }
          } else if (message.type === requestTypes.layoutConfigRequest) {
            this._panel.webview.postMessage(getLayoutConfiguration());
          } else if (message.type === requestTypes.configRequest) {
            this._panel.webview.postMessage(getConfiguration());
          } else if (message.type === requestTypes.openExistingItemRequest) {
            GetExitingItem(this._panel.webview, message.data);
          } else if (message.type === requestTypes.saveResponseRequest) {
            vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file("fetch-client-response." + message.fileType) }).then((uri: vscode.Uri | undefined) => {
              if (uri) {
                const value = uri.fsPath;
                fs.writeFile(value, message.data, (error) => {
                  if (error) {
                    vscode.window.showErrorMessage("Could not save to '" + value + "'. Error Message : " + error.message, { modal: true });
                    writeLog("error::saveResponseRequest()::FileWrite()" + error.message);
                  } else {
                    vscode.window.showInformationMessage("Successfully saved to '" + value + "'.", { modal: true });
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
                    vscode.window.showErrorMessage("Could not save to '" + value + "'. Error Message : " + error.message, { modal: true });
                    writeLog("error::saveTestResponseRequest()::FileWrite()" + error.message);
                  } else {
                    vscode.window.showInformationMessage("Successfully saved to '" + value + "'.", { modal: true });
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
                    vscode.window.showErrorMessage("Could not save to '" + value + "'. Error Message : " + error.message), { modal: true };
                    writeLog("error::downloadFileTypeRequest()::FileWrite()" + error.message);
                  } else {
                    vscode.window.showInformationMessage("Successfully saved to '" + value + "'.", { modal: true });
                  }
                });
              }
            });
          } else if (message.type === requestTypes.selectFileRequest) {
            vscode.window.showOpenDialog().then((uri: vscode.Uri[] | undefined) => {
              if (uri && uri.length > 0) {
                const value = uri[0].fsPath;
                const data = fs.readFileSync(value, "utf8");
                this._panel.webview.postMessage({ type: responseTypes.selectFileResponse, path: value, fileData: data });
              }
            });
          } else if (message.type === requestTypes.readFileRequest) {
            if (!fs.existsSync(message.path)) {
              this._panel.webview.postMessage({ type: responseTypes.readFileResponse, fileData: "" });
            } else {
              const data = fs.readFileSync(message.path, "utf8");
              this._panel.webview.postMessage({ type: responseTypes.readFileResponse, fileData: data });
            }
          } else if (message.type === requestTypes.getVariableItemRequest) {
            GetVariableById(message.data.id, message.data.isGlobal, this._panel.webview);
          } else if (message.type === requestTypes.getAllVariableRequest) {
            GetAllVariable(this._panel.webview);
          } else if (message.type === requestTypes.getRunItemDataRequest) {
            this._panel.webview.postMessage({ type: responseTypes.getRunItemDataResponse, reqData: getStorageManager().getValue("run-request"), resData: getStorageManager().getValue("run-response") });
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
              if (message.data.colId) {
                UpdateCollection(message.data.colId, item);
              }
            }
            this._panel.webview.postMessage({ type: responseTypes.saveResponse });
          }
          else if (message.type === requestTypes.openVariableItemRequest) {
            OpenVariableUI(message.data);
          } else if (message.type === requestTypes.updateVariableRequest) {
            UpdateVariable(message.data, null);
          } else if (message.type === requestTypes.saveCookieRequest) {
            SaveCookie(message.data, null);
          } else if (message.type === requestTypes.getAllCookiesRequest) {
            GetAllCookies(this._panel.webview);
          } else if (message.type === requestTypes.openManageCookiesRequest) {
            OpenCookieUI(message.data);
          } else if (message.type === requestTypes.getParentSettingsRequest) {
            GetParentSettings(message.data.colId, message.data.folderId, this._panel.webview);
          } else if (message.type === requestTypes.formDataFileRequest) {
            vscode.window.showOpenDialog().then((uri: vscode.Uri[] | undefined) => {
              if (uri && uri.length > 0) {
                const value = uri[0].fsPath;
                this._panel.webview.postMessage({ type: responseTypes.formDataFileResponse, path: value, index: message.index });
              }
            });
          } else if (message.type === requestTypes.tokenRequest) {
            apiFetch(message.data.reqData, message.data.variableData, message.data.settings, fetchConfig, responseTypes.tokenResponse).then((data) => {
              this._panel.webview.postMessage(data);
            });
          } else if (message.type === requestTypes.themeRequest) {
            this._panel.webview.postMessage(getVSCodeTheme());
          } else if (message.type === requestTypes.getCollectionsByIdWithPathRequest) {
            GetAllCollectionsByIdWithPath(message.data, this._panel.webview);
          } else if (message.type === requestTypes.getAllCollectionNameRequest) {
            GetAllCollectionName(this._panel.webview, message.data);
          }
        }
        catch (error) {
          vscode.window.showErrorMessage("Couldn't fetch the api", { modal: true });
          writeLog("error::onDidReceiveMessage()" + error.message);
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    WebAppPanel.currentPanel = undefined;

    // Clean up our resources  
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private async _update(id?: string, colId?: string, varId?: string, type?: string, folderId?: string) {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview, id, colId, varId, type, folderId);
  }

  private _pushMessages(message: IPubSubMessage) {
    if (message.messageType === pubSubTypes.updateVariables) {
      this._panel.webview.postMessage({ type: message.messageType });
    } else if (message.messageType === pubSubTypes.removeCurrentVariable) {
      this._panel.webview.postMessage({ type: message.messageType });
    } else if (message.messageType === pubSubTypes.addCurrentVariable) {
      this._panel.webview.postMessage({ type: message.messageType, data: { varId: message.message } });
    } else if (message.messageType === pubSubTypes.themeChanged) {
      this._panel.webview.postMessage({ type: message.messageType });
    }
  }

  private _executeAPIRequest(message: any, fetchConfig: FetchConfig) {
    apiFetch(message.data.reqData, message.data.variableData, message.data.settings, fetchConfig).then((data) => {
      fetchConfig.source = null;
      this._panel.webview.postMessage(data);

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
  }

  private _getHtmlForWebview(webview: vscode.Webview, id?: string, colId?: string, varId?: string, type?: string, folderId?: string) {

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist/fetch-client-ui.js")
    );

    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "/dist/main.css"));

    const nonce = getNonce();

    return `      
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="${styleUri}" rel="stylesheet" type="text/css"/>
          <title>${id}:${colId}:${varId}:${type}:${folderId}</title>
        </head>
        <body>
          <noscript>You need to enable JavaScript to run this app.</noscript>
          <div id="root"></div>
          <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html> 
      `;
  }
}

