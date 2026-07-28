import { buildWebviewHtml } from "./webviewUtils";
import {
	DeleteMockServer,
	GetAllMockServers,
	GetMockServerById,
	SaveMockServer,
	UpdateMockServer,
} from "../db/mockServerDBUtil";
import {
	clearRequestLogs,
	getRequestLogs,
	getServerStatus,
	startMockServer,
	stopMockServer,
} from "../utils/mockServerRunner";
import { GetAllCollections } from "../db/collectionDBUtil";
import { IMockServer } from "../../fetch-client-core/types/mockServer.types";
import { IMockRequestLog } from "../../fetch-client-core/types/mockServer.types";
import {
	requestTypes,
	responseTypes,
} from "../../fetch-client-core/consts/requestTypes.consts";
import { sideBarProvider } from "../../extension";
import { writeLog } from "../../fetch-client-core/helpers/logger/logger";
import * as vscode from "vscode";
import { generateMockFromOpenAPI } from "../utils/mockGenerators";

// Keep a reference to all open mock server panels so log pushes work
const openPanels = new Map<string, vscode.WebviewPanel>();

export const MockServerUI = (extensionUri: vscode.Uri) => {
	const disposable = vscode.commands.registerCommand(
		"fetch-client.newMockServer",
		(id?: string) => {
			const existingPanel = id ? openPanels.get(id) : undefined;
			if (existingPanel) {
				existingPanel.reveal(vscode.ViewColumn.One);
				return;
			}

			const panel = vscode.window.createWebviewPanel(
				"fetch-client",
				"Fetch Client - Mock Server",
				vscode.ViewColumn.One,
				{ enableScripts: true, retainContextWhenHidden: true },
			);

			panel.iconPath = vscode.Uri.joinPath(
				extensionUri,
				"icons/fetch-client.png",
			);
			panel.webview.html = buildWebviewHtml(
				panel.webview,
				extensionUri,
				`mockserver@:@${id ?? ""}`,
			);

			panel.webview.onDidReceiveMessage(async (reqData: any) => {
				switch (reqData.type) {
					case requestTypes.getAllMockServersRequest:
						GetAllMockServers(panel.webview);
						break;

					case requestTypes.getMockServerByIdRequest:
						GetMockServerById(reqData.data.id, panel.webview);
						break;

					case requestTypes.saveMockServerRequest:
						await SaveMockServer(
							reqData.data,
							panel.webview,
							sideBarProvider?.view,
						);
						if (reqData.data.id) {
							openPanels.set(reqData.data.id, panel);
						}
						break;

					case requestTypes.updateMockServerRequest:
						await UpdateMockServer(
							reqData.data,
							panel.webview,
							sideBarProvider?.view,
						);
						break;

					case requestTypes.deleteMockServerRequest: {
						const answer = await vscode.window.showWarningMessage(
							`Delete mock server "${reqData.data.name}"?`,
							{ modal: true },
							"Delete",
						);
						if (answer === "Delete") {
							try {
								stopMockServer(reqData.data.id);
								await DeleteMockServer(
									reqData.data.id,
									panel.webview,
									sideBarProvider?.view,
								);
								openPanels.delete(reqData.data.id);
								panel.dispose();
							} catch (err) {
								vscode.window.showErrorMessage("Failed to delete mock server.");
							}
						}
						break;
					}

					case requestTypes.startMockServerRequest: {
						const server = reqData.data as IMockServer;

						if (getServerStatus(server.id) === "running") {
							panel.webview.postMessage({
								type: responseTypes.mockServerStatusResponse,
								data: { id: server.id, status: "running" },
							});
							break;
						}

						const result = await startMockServer(server, (serverId, log) => {
							pushLogToPanel(serverId, log);
						});

						if (result.success) {
							openPanels.set(server.id, panel);
							const runningMsg = {
								type: responseTypes.mockServerStatusResponse,
								data: { id: server.id, status: "running" },
							};
							panel.webview.postMessage(runningMsg);
							sideBarProvider?.view?.webview.postMessage(runningMsg);
						} else {
							panel.webview.postMessage({
								type: responseTypes.mockServerStatusResponse,
								data: { id: server.id, status: "error", error: result.error },
							});
						}
						break;
					}

					case requestTypes.stopMockServerRequest: {
						const serverId = reqData.data.id as string;
						stopMockServer(serverId);
						const stoppedMsg = {
							type: responseTypes.mockServerStatusResponse,
							data: { id: serverId, status: "stopped" },
						};
						panel.webview.postMessage(stoppedMsg);
						sideBarProvider?.view?.webview.postMessage(stoppedMsg);
						break;
					}

					case requestTypes.getMockServerLogsRequest: {
						const logs = getRequestLogs(reqData.data.id);
						panel.webview.postMessage({
							type: responseTypes.mockServerLogResponse,
							data: { id: reqData.data.id, logs },
						});
						break;
					}

					case requestTypes.clearMockServerLogsRequest:
						clearRequestLogs(reqData.data.id);
						panel.webview.postMessage({
							type: responseTypes.mockServerLogResponse,
							data: { id: reqData.data.id, logs: [] },
						});
						break;

					case requestTypes.generateMockFromCollectionRequest:
						GetAllCollections(panel.webview);
						break;

					case requestTypes.generateMockFromOpenAPIRequest: {
						const routes = await generateMockFromOpenAPI(reqData.data);
						panel.webview.postMessage({
							type: responseTypes.getMockServerByIdResponse,
							data: { generatedRoutes: routes },
						});
						break;
					}

					default:
						break;
				}
			});

			panel.onDidDispose(() => {
				if (id) { openPanels.delete(id); }
			});
		},
	);

	return disposable;
};

// ---------------------------------------------------------------------------
// Push a real-time log entry to the correct open panel
// ---------------------------------------------------------------------------
function pushLogToPanel(serverId: string, log: IMockRequestLog): void {
	const panel = openPanels.get(serverId);
	if (panel) {
		try {
			panel.webview.postMessage({
				type: responseTypes.mockServerLogResponse,
				data: { id: serverId, logs: [log], append: true },
			});
		} catch (err) {
			writeLog(`warn::pushLogToPanel(${serverId}): ${err}`);
		}
	}
}
