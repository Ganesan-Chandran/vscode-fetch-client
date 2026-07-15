import { CliPreFetchContextProvider } from "../../fetch-client-core/utils/preFetchService/cliPreFetchContextProvider";
import { CollectionRunContext, FolderRunContext, RequestLeaf, RunCollectionFileOptions } from "../types/common.types";
import {
	collectLeaves,
	findFolderInCollection,
	findRequestFolderId,
	loadCollectionFromFile,
	resolveCollectionContexts,
	resolveFolderContext,
	resolveRequestContext,
} from "./lookup";
import { ConvertCurlToRequest } from "../../fetch-client-core/utils/curlToRequest";
import { DbPreFetchContextProvider } from "../../fetch-client-core/utils/preFetchService/dbPreFetchContextProvider";
import { executeCollection, executeFolder, executeRequest, executeSingleRequest } from "./helper";
import { ExportFormat } from "../types/export.types";
import { formatDate } from "../../fetch-client-core/helpers/dateTime.helper";
import { History_Repository_InsertHistory } from "../../fetch-client-core/db/history.repository";
import { IHistory, ISettings } from "../../fetch-client-core/types/sidebar.types";
import { Main_Repository_SaveRequest } from "../../fetch-client-core/db/mainDB.repository";
import { printRunResult, printRunSummary, printSection } from "../utils/display";
import { v4 as uuidv4 } from "uuid";
import { wrtieConsleError } from "../utils/logger";

// --- run --req / --col / --fol (DB-backed) -- unchanged from before ----------

export async function runRequest(opts: {
	name?: string; id?: string; varId?: string; varName?: string;
	exportFormat?: ExportFormat; exportPath?: string;
}): Promise<void> {
	const context = await resolveRequestContext(opts);
	const provider = new DbPreFetchContextProvider();
	await executeSingleRequest(context, opts, provider);
}

export async function runCollection(opts: {
	all?: boolean; name?: string; id?: string; varId?: string; varName?: string;
	exportFormat?: ExportFormat; exportPath?: string;
}): Promise<void> {
	const contexts: CollectionRunContext[] = await resolveCollectionContexts(opts);
	const provider = new DbPreFetchContextProvider();
	await executeCollection(contexts, opts, provider);
}

export async function runFolder(opts: {
	name?: string; id?: string; varId?: string; varName?: string;
	exportFormat?: ExportFormat; exportPath?: string;
}): Promise<void> {
	const context: FolderRunContext = await resolveFolderContext(opts);
	const provider = new DbPreFetchContextProvider();
	await executeFolder(context, opts, provider);
}

// --- run --curl -- unchanged ---------------------------------------------

export async function runCurl(curlString: string): Promise<void> {
	const request = ConvertCurlToRequest(curlString);

	if (!request) {
		wrtieConsleError("Failed to parse the curl command.");
		process.exit(1);
	}

	printSection(`Running curl: ${request.method.toUpperCase()} ${request.url}`);

	const emptySettings: ISettings = { auth: { authType: "noauth" } as any };
	const result = await executeRequest(request, [], emptySettings);

	request.id = uuidv4();
	await Main_Repository_SaveRequest(request);

	const historyItem: IHistory = {
		id: request.id,
		method: request.method,
		name: request.name ? request.name : request.url,
		url: request.url,
		createdTime: request.createdTime ? request.createdTime : formatDate(),
		modifiedTime: request.modifiedTime ? request.modifiedTime : formatDate(),
	};
	await History_Repository_InsertHistory(historyItem);

	printRunResult(result);
	printRunSummary([result]);
}

// --- run --file (now backed by shared lookup.ts helpers) ---------------------

export async function runCollectionFromFile(opts: RunCollectionFileOptions) {
	const { collection, requests, variable } = await loadCollectionFromFile(opts);

	const leaves: RequestLeaf[] = [];
	collectLeaves(collection, "", leaves);

	const requestMap = new Map(requests.map((r) => [r.id, r]));
	const provider = new CliPreFetchContextProvider(collection, requestMap, variable);

	const context: CollectionRunContext = {
		collection, leaves, requestMap, variable, effectiveVarId: "",
	};

	await executeCollection(
		[context],
		{ exportFormat: opts.exportFormat, exportPath: opts.exportPath },
		provider,
	);
}

export async function runFolderFromFile(opts: {
	file: string; name?: string; id?: string; varFile?: string;
	exportFormat?: ExportFormat; exportPath?: string;
}): Promise<void> {
	const { collection, requests, variable } = await loadCollectionFromFile(opts);

	if (!opts.id && !opts.name) {
		wrtieConsleError("Provide --name or --id.");
		process.exit(1);
	}

	const folder = findFolderInCollection(collection, opts);

	if (!folder) {
		wrtieConsleError("Folder not found.");
		process.exit(1);
	}

	const leaves: RequestLeaf[] = [];
	collectLeaves(folder, folder.id, leaves);

	const requestMap = new Map(requests.map((r) => [r.id, r]));
	const provider = new CliPreFetchContextProvider(collection, requestMap, variable);

	await executeFolder(
		{ folder, collection, leaves, requestMap, variable, effectiveVarId: "" },
		opts,
		provider,
	);
}

export async function runRequestFromFile(opts: {
	file: string; name?: string; id?: string; varFile?: string;
	exportFormat?: ExportFormat; exportPath?: string;
}) {
	const { collection, requests, variable } = await loadCollectionFromFile(opts);

	const request = opts.id
		? requests.find((r) => r.id === opts.id)
		: requests.find((r) => r.name.toLowerCase() === opts.name!.toLowerCase());

	if (!request) {
		wrtieConsleError("Request not found.");
		process.exit(1);
	}

	const folderId = findRequestFolderId(collection, request.id);
	const requestMap = new Map(requests.map((r) => [r.id, r]));
	const provider = new CliPreFetchContextProvider(collection, requestMap, variable);

	await executeSingleRequest(
		{ request, collection, folderId, variable, effectiveVarId: "", requestMap },
		opts,
		provider,
	);
}
