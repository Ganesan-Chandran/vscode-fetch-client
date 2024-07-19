import * as vscode from 'vscode';
import { getNonce, requestTypes } from '../configuration';
import { DeleteAllCookies, DeleteCookieById, GetAllCookies, SaveCookie } from '../db/cookieDBUtil';

export const CookieUI = (extensionUri: any) => {
  const disposable = vscode.commands.registerCommand('fetch-client.manageCookies', (id?: string) => {
    const cookiePanel = vscode.window.createWebviewPanel(
      "fetch-client",
      "Fetch Client - Manage Cookies",
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    const scriptUri = cookiePanel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, "dist/fetch-client-ui.js")
    );

    const styleUri = cookiePanel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "/dist/main.css"));

    const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
    cookiePanel.iconPath = iconUri;

    const nonce = getNonce();
    const title = `managecookies:${id}`;

    cookiePanel.webview.html = `<!DOCTYPE html>
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

    cookiePanel.webview.onDidReceiveMessage((reqData: any) => {
      if (reqData.type === requestTypes.getAllCookiesRequest) {
        GetAllCookies(cookiePanel.webview);
      } else if (reqData.type === requestTypes.deleteCookieByIdRequest) {
        showConfirmationBox("Do you want to delete this cookie?").then((data: any) => {
          if (data === "Yes") {
            DeleteCookieById(reqData.data, cookiePanel.webview);
          }
        });        
      } else if (reqData.type === requestTypes.deleteAllCookieRequest) {
        showConfirmationBox("Do you want to delete all cookies?").then((data: any) => {
          if (data === "Yes") {
            DeleteAllCookies(cookiePanel.webview);
          }
        });        
      }
    });
  });

  return disposable;

};

async function showConfirmationBox(text: string) {
  const res = await vscode.window.showWarningMessage(text, { modal: true }, "Yes", "No");
  return res;
}