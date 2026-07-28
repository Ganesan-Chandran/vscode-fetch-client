import { buildWebviewHtml, saveToFile } from "./webviewUtils";
import { Col_Repository_GetAllCollectionsById } from "../../fetch-client-core/db/collectionDB.repository";
import { Response_Repository_GetExitingItemResponse } from "../../fetch-client-core/db/responseDB.repository";
import { Main_Repository_GetRequestItem } from "../../fetch-client-core/db/mainDB.repository";
import { runQualityGateForCollection } from "../../fetch-client-core/helpers/qualityGateAnalyzer";
import { toQGHtml } from "../../fetch-client-core/helpers/exporters/qualityGate/qgHtmlExporter";
import { toQGJson } from "../../fetch-client-core/helpers/exporters/qualityGate/qgJsonExporter";
import { toQGXml } from "../../fetch-client-core/helpers/exporters/qualityGate/qgXmlExporter";
import { toQGCsv } from "../../fetch-client-core/helpers/exporters/qualityGate/qgCsvExporter";
import {
	IQGConfig,
	IQGOpenRequest,
	IQGRequestInput,
} from "../../fetch-client-core/types/qualityGate.types";
import { IReponseModel } from "../../fetch-client-core/types/response.types";
import { requestTypes } from "../../fetch-client-core/consts/requestTypes.consts";
import { writeLog } from "../../fetch-client-core/helpers/logger/logger";
import * as vscode from "vscode";

export const QualityGateUI = (extensionUri: vscode.Uri) => {
	const disposable = vscode.commands.registerCommand(
		"fetch-client.openQualityGate",
		(
			colId: string,
			folderId: string,
			itemId: string,
			name: string,
			varId: string,
			scope: "collection" | "folder" | "request",
		) => {
			const panel = vscode.window.createWebviewPanel(
				"fetch-client",
				`Quality Gate — ${name ?? "Scope"}`,
				vscode.ViewColumn.One,
				{ enableScripts: true, retainContextWhenHidden: true },
			);

			panel.iconPath = vscode.Uri.joinPath(
				extensionUri,
				"icons/fetch-client.png",
			);

			const initData: IQGOpenRequest = {
				colId,
				folderId,
				itemId,
				name: name ?? "Quality Gate",
				varId,
				scope: scope ?? "collection",
			};

			panel.webview.html = buildWebviewHtml(
				panel.webview,
				extensionUri,
				`qualitygate@:@${colId}@:@${folderId}@:@${itemId ?? ""}@:@${name}@:@${varId}`,
			);

			panel.webview.onDidReceiveMessage(async (message: any) => {
				switch (message.type) {
					case requestTypes.getQualityGateInitRequest:
						panel.webview.postMessage({
							type: "qualityGateInit",
							data: initData,
						});
						break;

					case requestTypes.runQualityGateRequest:
						await handleRunQualityGate(
							panel.webview,
							message.data as IQGOpenRequest,
						);
						break;

					case requestTypes.exportQualityGateReportRequest:
						await handleExportReport(message);
						break;

					default:
						break;
				}
			});
		},
	);

	return disposable;
};

// ─── Run the quality gate ────────────────────────────────────────────────────

async function handleRunQualityGate(
	webview: vscode.Webview,
	data: IQGOpenRequest,
): Promise<void> {
	try {
		const inputs = await buildInputs(data);

		if (!inputs || inputs.length === 0) {
			webview.postMessage({
				type: "qualityGateResult",
				report: null,
				error: "No requests found in the selected scope.",
			});
			return;
		}

		const config = await loadQualityGateConfig();

		const report = runQualityGateForCollection(
			data.name ?? "Quality Gate",
			inputs,
			config,
		);

		webview.postMessage({ type: "qualityGateResult", report });
	} catch (err) {
		writeLog("error::handleRunQualityGate(): " + err);
		webview.postMessage({
			type: "qualityGateResult",
			report: null,
			error: String(err),
		});
	}
}

// ─── Config loading (.qgrc.json at the workspace root) ───────────────────────

const QG_CONFIG_FILENAME = ".qgrc.json";

async function loadQualityGateConfig(): Promise<IQGConfig> {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length === 0) {
		return {};
	}

	for (const folder of folders) {
		const configUri = vscode.Uri.joinPath(folder.uri, QG_CONFIG_FILENAME);
		try {
			const bytes = await vscode.workspace.fs.readFile(configUri);
			const text = Buffer.from(bytes).toString("utf8");
			const parsed = JSON.parse(text) as IQGConfig;
			return parsed;
		} catch (err: any) {
			// FileNotFound is expected when no config exists in this folder — keep
			// looking in the other workspace folders. Any other error (bad JSON,
			// permissions) is worth logging so the user knows the config was ignored.
			if (err?.code !== "FileNotFound" && err?.name !== "EntryNotFound") {
				writeLog(
					`warn::loadQualityGateConfig(): failed to read/parse ${configUri.fsPath}: ${err}`,
				);
			}
		}
	}

	return {};
}

// ─── Build IQGRequestInput[] from DB ─────────────────────────────────────────

async function buildInputs(data: IQGOpenRequest): Promise<IQGRequestInput[]> {
	const { colId, folderId, itemId, scope } = data;

	let requestIds: string[] = [];

	if (scope === "request" && itemId) {
		requestIds = [itemId];
	} else {
		// Get all request IDs for collection or folder
		const type = folderId ? "fol" : "col";
		const result = await Col_Repository_GetAllCollectionsById(
			colId,
			folderId ?? "",
			type,
		);
		requestIds = (result?.requests ?? []).map((r: any) => r.id);
	}

	if (requestIds.length === 0) {
		return [];
	}

	// Fetch full request models + saved responses in parallel
	const [requestResults, responseResults] = await Promise.all([
		Promise.allSettled(
			requestIds.map((id) => Main_Repository_GetRequestItem(id)),
		),
		Promise.allSettled(
			requestIds.map((id) => Response_Repository_GetExitingItemResponse(id)),
		),
	]);

	const inputs: IQGRequestInput[] = [];
	for (let i = 0; i < requestIds.length; i++) {
		const reqResult = requestResults[i];
		if (reqResult.status !== "fulfilled" || !reqResult.value) {
			continue;
		}
		const req = reqResult.value;

		const resResult = responseResults[i];
		let response: IReponseModel | undefined;
		if (
			resResult.status === "fulfilled" &&
			resResult.value &&
			resResult.value.length > 0
		) {
			response = resResult.value[0] as IReponseModel;
		}

		inputs.push({ request: req, response });
	}

	return inputs;
}

// ─── Export report ────────────────────────────────────────────────────────────

async function handleExportReport(message: any): Promise<void> {
	const { format, data, name } = message;
	const safeName = (name ?? "quality-gate-report").replace(
		/[/\\?%*:|"<>]/g,
		"-",
	);

	try {
		let content: string;
		let ext: string;

		switch (format) {
			case "html":
				content = toQGHtml(data);
				ext = "html";
				break;
			case "json":
				content = toQGJson(data);
				ext = "json";
				break;
			case "xml":
				content = toQGXml(data);
				ext = "xml";
				break;
			case "csv":
				content = toQGCsv(data);
				ext = "csv";
				break;
			default:
				return;
		}

		const filterLabels: Record<string, string> = {
			html: "HTML Files",
			json: "JSON Files",
			xml: "XML Files",
			csv: "CSV Files",
		};

		await saveToFile(
			vscode.Uri.file(`${safeName}.${ext}`),
			content,
			`exportQualityGateReport_${format}`,
			{ filters: { [filterLabels[format]]: [ext] } },
		);
	} catch (err) {
		writeLog("error::handleExportReport(): " + err);
	}
}
