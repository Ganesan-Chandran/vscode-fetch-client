declare var acquireVsCodeApi: any;
let vscode;

if (typeof acquireVsCodeApi !== "undefined") {
	vscode = acquireVsCodeApi();
}

export default vscode;
