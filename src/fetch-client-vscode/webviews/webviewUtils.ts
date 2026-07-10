import { getNonce } from '../../fetch-client-core/consts/requestTypes.consts';
import { writeLog } from '../../fetch-client-core/helpers/logger/logger';
import * as vscode from 'vscode';
import fs from 'fs';

export function buildWebviewHtml(
	webview: vscode.Webview,
	extensionUri: vscode.Uri,
	title: string
): string {
	const nonce = getNonce();
	const scriptUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'dist/fetch-client-ui.js')
	);
	const styleUri = webview.asWebviewUri(
		vscode.Uri.joinPath(extensionUri, 'dist/main.css')
	);

	const csp = [
		`default-src 'none'`,
		`style-src ${webview.cspSource} 'unsafe-inline'`,
		`script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval'`,
		// `worker-src ${webview.cspSource} blob: vscode-webview:`,
		`worker-src blob:`,
		`connect-src ${webview.cspSource}`,
		`img-src ${webview.cspSource} https: data:`,
		`font-src ${webview.cspSource} data:`,
	].join('; ');

	return `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta http-equiv="Content-Security-Policy" content="${csp}">
		<link href="${styleUri}" rel="stylesheet" type="text/css"/>
		<title>${title}</title>
	</head>
	<body>
		<noscript>You need to enable JavaScript to run this app.</noscript>
		<div id="root"></div>
		<script nonce="${nonce}" src="${scriptUri}"></script>
	</body>
</html>`;
}


export async function saveToFile(
	defaultUri: vscode.Uri,
	data: string | Uint8Array,
	logContext: string,
	saveDialogOptions?: Omit<vscode.SaveDialogOptions, 'defaultUri'>
): Promise<void> {
	const uri = await vscode.window.showSaveDialog({ defaultUri, ...saveDialogOptions });
	if (!uri) {
		return;
	}
	try {
		await fs.promises.writeFile(uri.fsPath, data);
		vscode.window.showInformationMessage(
			`Successfully saved to '${uri.fsPath}'.`,
			{ modal: true }
		);
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		vscode.window.showErrorMessage(
			`Could not save to '${uri.fsPath}'. Error: ${msg}`,
			{ modal: true }
		);
		writeLog(`error::${logContext}::writeFile() ${msg}`);
	}
}
