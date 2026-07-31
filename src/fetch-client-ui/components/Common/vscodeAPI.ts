declare var acquireVsCodeApi: any;

/** Single seam between this UI and whichever IDE host embeds it (VS Code today, JetBrains later). */
export interface IHostBridge {
	postMessage(message: unknown): void;
}

let vscode: IHostBridge | undefined;

if (typeof acquireVsCodeApi !== "undefined") {
	vscode = acquireVsCodeApi();
} else {
	// A non-VS Code host (e.g. JetBrains JCEF) must inject this before the bundle loads.
	vscode = (window as unknown as { __hostBridge?: IHostBridge }).__hostBridge;
}

export default vscode;
