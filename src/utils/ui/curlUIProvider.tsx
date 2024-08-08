import * as vscode from 'vscode';
import { OpenExistingItem, sideBarProvider } from '../../extension';
import { getNonce, requestTypes, responseTypes } from '../configuration';
import { ConvertCurlToRequest } from '../curlToRequest';
import { AddToCollection, GetAllCollectionName } from '../db/collectionDBUtil';
import { apiFetch, FetchConfig } from '../fetchUtil';
import { getErrorResponse } from '../helper';
import { getHeadersConfiguration, getTimeOutConfiguration } from '../vscodeConfig';

export const CurlProviderUI = (extensionUri: any) => {
  const disposable = vscode.commands.registerCommand('fetch-client.curlRequest', () => {
    const curlPanel = vscode.window.createWebviewPanel(
      "fetch-client",
      "Fetch Client - Curl Request",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const scriptUri = curlPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "dist/fetch-client-ui.js")
    );

    const styleUri = curlPanel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "/dist/main.css"));

    const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
    curlPanel.iconPath = iconUri;

    const nonce = getNonce();
    const title = `curlreq`;

    curlPanel.webview.html = `<!DOCTYPE html>
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
    
    curlPanel.webview.onDidReceiveMessage((reqData: any) => {
      if (reqData.type === requestTypes.runCurlRequest) {
        let req = ConvertCurlToRequest(reqData.data);
        if (!req || !req.url) {
          let apiResponse = getErrorResponse();
          apiResponse.response.responseData = "Invalid Curl Command";
          curlPanel.webview.postMessage({ type: responseTypes.runCurlResponse, request: null, response: apiResponse });
          return;
        }
        apiFetch(req, null, null, null, fetchConfig).then((data) => {
          curlPanel.webview.postMessage({ type: responseTypes.runCurlResponse, request: req, response: data });
        });
      } else if (reqData.type === requestTypes.convertCurlToJsonRequest) {
        let req = ConvertCurlToRequest(reqData.data.curl);
        if (!req || !req.url) {
          curlPanel.webview.postMessage({ type: responseTypes.curlErrorResponse, error: "Invalid Curl Command" });
          return;
        }
        req.name = req.url;
        if (reqData.data.hasFolder) {
          reqData.data.col.data[0].data[0].method = req.method;
          reqData.data.col.data[0].data[0].name = req.name;
          reqData.data.col.data[0].data[0].url = req.url;
        } else {
          reqData.data.col.data[0].method = req.method;
          reqData.data.col.data[0].name = req.name;
          reqData.data.col.data[0].url = req.url;
        }
        AddToCollection(reqData.data.col, reqData.data.hasFolder, reqData.data.isNewFolder, curlPanel.webview, sideBarProvider.view, req);
      } else if (reqData.type === requestTypes.getAllCollectionNameRequest) {
        GetAllCollectionName(curlPanel.webview, reqData.data);
      } else if (reqData.type === requestTypes.openHistoryItemRequest) {
        OpenExistingItem(reqData.data.id, reqData.data.name, reqData.data.colId, reqData.data.folderId, reqData.data.varId);
      }
    });
  });

  return disposable;

};
