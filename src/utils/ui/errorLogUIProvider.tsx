import * as vscode from 'vscode';
import fs from "fs";
import { getNonce, requestTypes, responseTypes } from '../configuration';
import { logPath } from '../logger/constants';
import { getExtDbPath } from '../db/getExtDbPath';
import path from 'path';

export const ErrorLogUI = (extensionUri: any) => {
  const disposable = vscode.commands.registerCommand('fetch-client.openErrorLog', () => {
    const errorLogPanel = vscode.window.createWebviewPanel(
      "fetch-client",
      "Fetch Client - Error Log",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const scriptUri = errorLogPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "dist/fetch-client-ui.js")
    );

    const styleUri = errorLogPanel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "/dist/main.css"));

    const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
    errorLogPanel.iconPath = iconUri;

    const nonce = getNonce();
    const title = "errorlog";

    errorLogPanel.webview.html = `<!DOCTYPE html>
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

    errorLogPanel.webview.onDidReceiveMessage((reqData: any) => {
      if (reqData.type === requestTypes.getErrorLogRequest) {
        let data = "";
        try {
          if (fs.existsSync(path.resolve(getExtDbPath(), logPath))) {
            data = fs.readFileSync(path.resolve(getExtDbPath(), logPath), "utf8");
          }
        } catch {
          data = "";
        }
        errorLogPanel.webview.postMessage({ type: responseTypes.getErrorLogResponse, fileData: data });
      }
    });
  });

  return disposable;

};