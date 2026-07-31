import { buildWebviewHtml, saveToFile } from "./webviewUtils";
import { Col_Repository_GetAllCollectionsById } from "../../fetch-client-core/db/collectionDB.repository";
import { Response_Repository_GetExitingItemResponse } from "../../fetch-client-core/db/responseDB.repository";
import { Main_Repository_GetRequestItem } from "../../fetch-client-core/db/mainDB.repository";
import {
	GetAllCollectionsById,
	GetParentSettingsSync,
	GetVariableByColId,
} from "../db/collectionDBUtil";
import { GetVariableByIdSync } from "../db/varDBUtil";
import { runQualityGateForCollection } from "../../fetch-client-core/helpers/qualityGateAnalyzer";
import { getRuleMetas } from "../../fetch-client-core/helpers/qualityGate/ruleRegistry";
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
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { ISettings } from "../../fetch-client-core/types/sidebar.types";
import { IPreFetch } from "../../fetch-client-core/types/prefetch.types";
import { apiFetch, FetchConfig } from "../../fetch-client-core/utils/fetchUtil";
import {
	getHeadersConfiguration,
	getRunMainRequestOption,
	getTimeOutConfiguration,
} from "../../fetch-client-core/utils/vscodeConfig";
import { PreFetchRunner } from "../../fetch-client-core/utils/preFetchService/preFetchRunner";
import { DbPreFetchContextProvider } from "../../fetch-client-core/utils/preFetchService/dbPreFetchContextProvider";
import {
	requestTypes,
	responseTypes,
} from "../../fetch-client-core/consts/requestTypes.consts";
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
				`Quality Gate - ${name ?? "Scope"}`,
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

			// Fresh in-memory cache per opened panel - reset on open so we start
			// from the true on-disk state, then stays authoritative for the rest
			// of the panel's lifetime so Rules-tab remounts / Run never race a
			// pending .qgrc.json write on disk.
			qgConfigCache = null;

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

					case requestTypes.getCollectionsByIdRequest:
						await GetAllCollectionsById(
							message.data.colId,
							message.data.folderId,
							message.data.type,
							panel.webview,
						);
						break;

					case requestTypes.getQGRulesRequest:
						await handleGetRules(panel.webview);
						break;

					case requestTypes.saveQGRuleSelectionRequest:
						await handleSaveRuleSelection(
							message.data?.disabledRules as string[],
						);
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
		let inputs = await buildInputs(data);

		if (data.selectedRequestIds && data.selectedRequestIds.length > 0) {
			const selected = new Set(data.selectedRequestIds);
			inputs = inputs.filter((i) => selected.has(i.request.id));
		}

		if (!inputs || inputs.length === 0) {
			webview.postMessage({
				type: "qualityGateResult",
				report: null,
				error: "No requests found in the selected scope.",
			});
			return;
		}

		const config = await getQualityGateConfig();

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
			// FileNotFound is expected when no config exists in this folder - keep
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

async function saveQualityGateConfig(config: IQGConfig): Promise<void> {
	const folders = vscode.workspace.workspaceFolders;
	if (!folders || folders.length === 0) {
		return;
	}
	const configUri = vscode.Uri.joinPath(folders[0].uri, QG_CONFIG_FILENAME);
	try {
		const bytes = Buffer.from(JSON.stringify(config, null, 2), "utf8");
		await vscode.workspace.fs.writeFile(configUri, bytes);
	} catch (err) {
		writeLog(
			`error::saveQualityGateConfig(): failed to write ${configUri.fsPath}: ${err}`,
		);
	}
}

// In-memory cache of the effective config for the currently open panel. Reads
// (getQGRulesRequest / runQualityGateRequest) and writes (saveQGRuleSelectionRequest)
// all go through this so a Rules-tab remount or an immediate Run right after
// toggling a checkbox always sees the latest selection, instead of racing the
// .qgrc.json disk write that persists it in the background.
let qgConfigCache: IQGConfig | null = null;

async function getQualityGateConfig(): Promise<IQGConfig> {
	if (!qgConfigCache) {
		qgConfigCache = await loadQualityGateConfig();
	}
	return qgConfigCache;
}

// ─── Rules tab ────────────────────────────────────────────────────────────────

async function handleGetRules(webview: vscode.Webview): Promise<void> {
	try {
		const config = await getQualityGateConfig();
		webview.postMessage({
			type: responseTypes.getQGRulesResponse,
			rules: getRuleMetas(),
			disabledRules: config.disabledRules ?? [],
		});
	} catch (err) {
		writeLog("error::handleGetRules(): " + err);
	}
}

async function handleSaveRuleSelection(disabledRules: string[]): Promise<void> {
	try {
		const config = await getQualityGateConfig();
		config.disabledRules = disabledRules ?? [];
		qgConfigCache = config;
		await saveQualityGateConfig(config);
	} catch (err) {
		writeLog("error::handleSaveRuleSelection(): " + err);
	}
}

// ─── Live execution fallback (no saved response exists for a request) ───────
// A saved response is optional - not every request has one. When it's missing,
// we run the request live so the gate always has a real response to analyze:
// its configured pre-request chain (parent-level + request-level, e.g. for
// token setup) is executed first via PreFetchRunner (headless, DB-backed, same
// mechanism the interactive Run flow uses), then the main request itself is
// fired directly with apiFetch(). Each apiFetch() call measures its own
// duration with a fresh axios instance, so the reported duration always
// reflects only the main request - never the pre-request calls' time.

async function runLivePreRequests(
	request: IRequestModel,
	preFetch: IPreFetch,
	isCollectionPreRequest: boolean,
	fetchConfig: FetchConfig,
): Promise<boolean> {
	const runner = new PreFetchRunner(
		fetchConfig,
		request.id,
		new DbPreFetchContextProvider(),
	);

	await runner.RunPreRequests(
		preFetch,
		0,
		request.name,
		isCollectionPreRequest,
	);

	if (runner.message) {
		if (fetchConfig.runMainRequest === true) {
			writeLog(`warn::runLivePreRequests(): ${runner.message}`);
			return true;
		}
		writeLog(
			`warn::runLivePreRequests(): main request skipped - ${runner.message}`,
		);
		return false;
	}

	return true;
}

async function runLiveRequest(
	request: IRequestModel,
	settings: ISettings | null,
	varId: string,
): Promise<IReponseModel | undefined> {
	try {
		const fetchConfig: FetchConfig = {
			timeOut: getTimeOutConfiguration(),
			headersCase: getHeadersConfiguration(),
			runMainRequest: getRunMainRequestOption(),
		};

		let allow = true;

		if ((settings?.preFetch?.requests?.length ?? 0) > 0) {
			allow = await runLivePreRequests(
				request,
				settings!.preFetch,
				true,
				fetchConfig,
			);
		}

		if (
			allow &&
			(request.preFetch?.requests?.length ?? 0) > 0 &&
			request.preFetch.requests[0]?.reqId
		) {
			allow = await runLivePreRequests(
				request,
				request.preFetch,
				false,
				fetchConfig,
			);
		}

		if (!allow) {
			return undefined;
		}

		// Pre-requests may have refreshed a token (or other) variable via the DB -
		// reload it so the main request uses the latest value.
		const variable = varId ? await GetVariableByIdSync(varId) : undefined;

		const res = await apiFetch(
			request,
			variable?.data,
			settings ?? ({} as ISettings),
			null,
			fetchConfig,
		);

		return {
			id: request.id,
			response: {
				duration: res.response.duration,
				isError: res.response.isError,
				responseData: res.response.responseData,
				responseType: res.response.responseType,
				size: res.response.size as string,
				status: res.response.status,
				statusText: res.response.statusText,
			},
			headers: res.headers,
			cookies: res.cookies,
			loading: false,
		};
	} catch (err) {
		writeLog("error::runLiveRequest(): " + err);
		return undefined;
	}
}

// ─── Build IQGRequestInput[] from DB ─────────────────────────────────────────

async function buildInputs(data: IQGOpenRequest): Promise<IQGRequestInput[]> {
	const { colId, folderId, itemId, scope } = data;

	let requestIds: string[] = [];
	let scopeSettings: ISettings | null = null;

	if (scope === "request" && itemId) {
		requestIds = [itemId];
		scopeSettings = await GetParentSettingsSync(colId, folderId ?? "");
	} else {
		// Get all request IDs for collection or folder
		const type = folderId ? "fol" : "col";
		const result = await Col_Repository_GetAllCollectionsById(
			colId,
			folderId ?? "",
			type,
		);
		requestIds = (result?.requests ?? []).map((r: any) => r.id);
		scopeSettings = result?.settings ?? null;
	}

	if (requestIds.length === 0) {
		return [];
	}

	let varId = "";
	try {
		varId = await GetVariableByColId(colId);
	} catch {
		varId = "";
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

		// A saved response is optional - run the request live (including its
		// configured pre-requests) when there isn't one, so the gate always has
		// something to analyze.
		if (!response) {
			response = await runLiveRequest(req, scopeSettings, varId);
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
