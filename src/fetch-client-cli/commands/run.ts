import {
	Col_Repository_GetAllCollections,
} from "../../fetch-client-core/db/collectionDB.repository";
import {
	IFolder,
	IHistory,
	ICollections,
	IVariable,
	ISettings,
} from "../../fetch-client-core/types/sidebar.types";
import {
	Main_Repository_GetRequestItem,
	Main_Repository_GetCollectionRequests,
	Main_Repository_SaveRequest,
} from "../../fetch-client-core/db/mainDB.repository";
import { cliConfig } from "../config";
import { CliPreFetchContextProvider } from "../../fetch-client-core/utils/preFetchService/cliPreFetchContextProvider";
import { CollectionRunContext, RequestLeaf, RunCollectionFileOptions } from "../types/common.types";
import { ConvertCurlToRequest } from "../../fetch-client-core/utils/curlToRequest";
import { DbPreFetchContextProvider } from "../../fetch-client-core/utils/preFetchService/dbPreFetchContextProvider";
import { executeCollection, executeFolder, executeRequest, executeSingleRequest } from "./helper";
import { ExportFormat } from "../types/export.types";
import { fetchClientV2Importer } from "../../fetch-client-core/helpers/importers/collections/fetchClient/fetchClientImporter_2_0";
import { formatDate } from "../../fetch-client-core/helpers/dateTime.helper";
import { History_Repository_InsertHistory } from "../../fetch-client-core/db/history.repository";
import { ImportFCVariable } from "../../fetch-client-core/helpers/importers/variables/fetchClient/fcVariableImporter";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { printRunResult, printRunSummary, printSection, red, } from "../utils/display";
import { v4 as uuidv4 } from "uuid";
import { Var_Repository_FindAll, Var_Repository_FindById, Var_Repository_FindByIdSync, } from "../../fetch-client-core/db/variableDB.repository";
import { writeConsoleLog, wrtieConsleError } from "../utils/logger";
import fs from "fs/promises";

function isFolder(item: any): item is IFolder {
	return item.data !== undefined;
}

// --- Tree walkers ------------------------------------------------------------

/** Recursively collect all leaf request entries inside a node. */
function collectLeaves(
	node: { data?: (IHistory | IFolder)[] },
	parentFolderId: string,
	out: RequestLeaf[],
): void {
	if (!node.data) {
		return;
	}

	for (const item of node.data) {
		if (isFolder(item)) {
			collectLeaves(item, item.id, out);
		} else {
			out.push({
				id: item.id,
				name: item.name,
				method: (item as IHistory).method ?? "get",
				url: (item as IHistory).url ?? "",
				folderId: parentFolderId,
			});
		}
	}
}

/** Find a leaf request anywhere in the collection tree by name (case-insensitive). */
function findLeafByName(
	collections: ICollections[],
	name: string,
): { leaf: RequestLeaf; collection: ICollections } | null {
	const lower = name.toLowerCase();

	for (const col of collections) {
		const leaves: RequestLeaf[] = [];
		collectLeaves(col, "", leaves);

		const match = leaves.find((l) => l.name.toLowerCase() === lower);

		if (match) {
			return { leaf: match, collection: col };
		}
	}

	return null;
}

/** Find a leaf by id anywhere in the collection tree. */
function findLeafById(
	collections: ICollections[],
	id: string,
): { leaf: RequestLeaf; collection: ICollections } | null {
	for (const col of collections) {
		const leaves: RequestLeaf[] = [];
		collectLeaves(col, "", leaves);

		const match = leaves.find((l) => l.id === id);

		if (match) {
			return { leaf: match, collection: col };
		}
	}

	return null;
}

// --- Variable + settings resolution ------------------------------------------

async function resolveVariableByName(
	name: string,
	key: string,
): Promise<IVariable | null> {
	const all = await Var_Repository_FindAll(key);
	const lower = name.toLowerCase();
	return all.find((v) => v.name.toLowerCase() === lower) ?? null;
}

/**
 * Resolves the variable set to use for a run command in a single DB read.
 * - If the item already has a linked variable, that takes priority.
 * - An info message is printed when the user also supplied --var-id/--var-name.
 * - Otherwise the user-supplied --var-id or --var-name is used.
 */
async function resolveEffectiveForRun(
	linkedVarId: string,
	contextName: string,
	opts: { varId?: string; varName?: string },
	key: string,
): Promise<{ effectiveVarId: string; variable: IVariable | null }> {
	if (linkedVarId) {
		const varSet = await Var_Repository_FindByIdSync(linkedVarId, key);
		if (opts.varId || opts.varName) {
			console.info(
				red(
					`Info: '${contextName}' is already linked to variable set '${varSet?.name ?? linkedVarId
					}'. The --var-id/--var-name option has no effect here.`,
				),
			);
		}

		return { effectiveVarId: linkedVarId, variable: varSet };
	}

	if (opts.varId) {
		const varSet = await Var_Repository_FindByIdSync(opts.varId, key);
		if (!varSet) {
			wrtieConsleError(`Variable set with id '${opts.varId}' not found.`);
			process.exit(1);
		}
		return { effectiveVarId: opts.varId, variable: varSet };
	}

	if (opts.varName) {
		const found = await resolveVariableByName(opts.varName, key);
		if (!found) {
			wrtieConsleError(`Variable set named '${opts.varName}' not found.`);
			process.exit(1);
		}

		const globalVars = await Var_Repository_FindById("", true, key);
		if (globalVars && globalVars.length > 0) {
			return {
				effectiveVarId: globalVars[0].id,
				variable: globalVars[0],
			};
		}

		return { effectiveVarId: found.id, variable: found };
	}

	return { effectiveVarId: "", variable: null };
}

// --- run --req ---------------------------------------------------------------

export async function runRequest(opts: {
	name?: string;
	id?: string;
	varId?: string;
	varName?: string;
	exportFormat?: ExportFormat;
	exportPath?: string;
}): Promise<void> {
	const all: ICollections[] = await Col_Repository_GetAllCollections();

	let reqId: string | undefined;
	let collection: ICollections | undefined;
	let folderId = "";

	if (opts.id) {
		const found = findLeafById(all, opts.id);

		if (!found) {
			wrtieConsleError(`Request with id '${opts.id}' not found.`);
			process.exit(1);
		}

		reqId = found.leaf.id;
		collection = found.collection;
		folderId = found.leaf.folderId;
	} else if (opts.name) {
		const found = findLeafByName(all, opts.name);

		if (!found) {
			wrtieConsleError(`Request named '${opts.name}' not found.`);
			process.exit(1);
		}

		reqId = found.leaf.id;
		collection = found.collection;
		folderId = found.leaf.folderId;
	} else {
		wrtieConsleError("Provide --name or --id to identify the request.");
		process.exit(1);
	}

	const request = await Main_Repository_GetRequestItem(reqId);

	if (!request) {
		wrtieConsleError(`Request data not found in DB for id '${reqId}'.`);
		process.exit(1);
	}

	const { effectiveVarId, variable } = await resolveEffectiveForRun(
		collection.variableId,
		request.name || request.url,
		opts,
		cliConfig.encryptionKey,
	);

	const provider = new DbPreFetchContextProvider();

	await executeSingleRequest(
		{
			request,
			collection,
			folderId,
			variable,
			effectiveVarId,
		},
		opts,
		provider
	);
}

// --- run --col ---------------------------------------------------------------

export async function runCollection(opts: {
	all?: boolean;
	name?: string;
	id?: string;
	varId?: string;
	varName?: string;
	exportFormat?: ExportFormat;
	exportPath?: string;
}): Promise<void> {

	const all: ICollections[] = await Col_Repository_GetAllCollections();

	let targets: ICollections[] = [];

	if (opts.all) {
		targets = all;
	} else if (opts.id) {
		const col = all.find((c) => c.id === opts.id);

		if (!col) {
			wrtieConsleError(`Collection with id '${opts.id}' not found.`);
			process.exit(1);
		}

		targets = [col];
	} else if (opts.name) {
		const lower = opts.name.toLowerCase();

		const col = all.find((c) => c.name.toLowerCase() === lower);

		if (!col) {
			wrtieConsleError(`Collection named '${opts.name}' not found.`);
			process.exit(1);
		}

		targets = [col];
	} else {
		wrtieConsleError(
			"Provide --all, --name, or --id to identify the collection.",
		);
		process.exit(1);
	}

	const contexts: CollectionRunContext[] = [];

	for (const col of targets) {
		const leaves: RequestLeaf[] = [];
		collectLeaves(col, "", leaves);

		if (leaves.length === 0) {
			writeConsoleLog(`Collection '${col.name}' is empty, skipping.`);
			continue;
		}

		const { effectiveVarId, variable } = await resolveEffectiveForRun(
			col.variableId,
			col.name,
			opts,
			cliConfig.encryptionKey,
		);

		const reqIds = leaves.map((l) => l.id);

		const requestModels = await Main_Repository_GetCollectionRequests(reqIds);

		const reqMap = new Map<string, IRequestModel>(
			requestModels.map((r) => [r.id, r]),
		);

		contexts.push({
			collection: col,
			leaves,
			requestMap: reqMap,
			variable,
			effectiveVarId,
		});
	}

	const provider = new DbPreFetchContextProvider();
	await executeCollection(contexts, opts, provider);
}

// --- run --fol ---------------------------------------------------------------

export async function runFolder(opts: {
	name?: string;
	id?: string;
	varId?: string;
	varName?: string;
	exportFormat?: ExportFormat;
	exportPath?: string;
}): Promise<void> {
	const all: ICollections[] = await Col_Repository_GetAllCollections();

	interface FolderMatch {
		folder: IFolder;
		collection: ICollections;
	}

	const allFolderMatches: FolderMatch[] = [];

	for (const col of all) {
		for (const item of col.data ?? []) {
			if (isFolder(item)) {
				allFolderMatches.push({
					folder: item,
					collection: col,
				});

				collectNestedFolders(item, col, allFolderMatches);
			}
		}
	}

	function collectNestedFolders(
		parentFolder: IFolder,
		col: ICollections,
		result: FolderMatch[],
	): void {
		for (const item of parentFolder.data ?? []) {
			if (isFolder(item)) {
				result.push({
					folder: item,
					collection: col,
				});

				collectNestedFolders(item, col, result);
			}
		}
	}

	let match: FolderMatch | undefined;

	if (opts.id) {
		match = allFolderMatches.find((m) => m.folder.id === opts.id);

		if (!match) {
			wrtieConsleError(`Folder with id '${opts.id}' not found.`);
			process.exit(1);
		}
	} else if (opts.name) {
		const lower = opts.name.toLowerCase();

		match = allFolderMatches.find((m) => m.folder.name.toLowerCase() === lower);

		if (!match) {
			wrtieConsleError(`Folder named '${opts.name}' not found.`);
			process.exit(1);
		}
	} else {
		wrtieConsleError("Provide --name or --id to identify the folder.");
		process.exit(1);
	}

	const leaves: RequestLeaf[] = [];

	collectLeaves(match.folder, match.folder.id, leaves);

	if (leaves.length === 0) {
		writeConsoleLog(`Folder '${match.folder.name}' is empty.`);
		return;
	}

	const { effectiveVarId, variable } = await resolveEffectiveForRun(
		match.collection.variableId,
		match.folder.name,
		opts,
		cliConfig.encryptionKey,
	);

	const reqIds = leaves.map((l) => l.id);

	const requestModels = await Main_Repository_GetCollectionRequests(reqIds);

	const reqMap = new Map<string, IRequestModel>(
		requestModels.map((r) => [r.id, r]),
	);

	const provider = new DbPreFetchContextProvider();

	await executeFolder(
		{
			folder: match.folder,
			collection: match.collection,
			leaves,
			requestMap: reqMap,
			variable,
			effectiveVarId,
		},
		opts,
		provider
	);
}

// --- run --curl --------------------------------------------------------------

export async function runCurl(curlString: string): Promise<void> {
	const request = ConvertCurlToRequest(curlString);

	if (!request) {
		wrtieConsleError("Failed to parse the curl command.");
		process.exit(1);
	}

	printSection(`Running curl: ${request.method.toUpperCase()} ${request.url}`);

	const emptySettings: ISettings = {
		auth: { authType: "noauth" } as any,
	};

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

// --- run --file ---------------------------------------------------------------

async function getCollection(opts: RunCollectionFileOptions): Promise<{ collection: ICollections; requests: IRequestModel[]; variable: IVariable; }> {
	try {
		await fs.access(opts.file);
	} catch {
		wrtieConsleError(`Collection file not found: ${opts.file}`);
		process.exit(1);
	}

	// Read collection
	const parsedData = JSON.parse(await fs.readFile(opts.file, "utf8"));
	const convertedData = fetchClientV2Importer(parsedData, true);
	if (!convertedData?.fcCollection || !convertedData?.fcRequests) {
		wrtieConsleError("Fetch Client import produced incomplete data.");
		process.exit(1);
	}

	const collection = convertedData?.fcCollection;
	const requests = convertedData?.fcRequests;
	let variable = convertedData.fcVariables;

	if (opts.varFile) {
		try {
			await fs.access(opts.varFile);
		} catch {
			wrtieConsleError(`Variable file not found: ${opts.varFile}`);
			process.exit(1);
		}

		const parsedVarFile = JSON.parse(await fs.readFile(opts.varFile, "utf8"));
		variable = ImportFCVariable(parsedVarFile, cliConfig.encryptionKey);
	}

	return { collection, requests, variable };
}

export async function runCollectionFromFile(opts: RunCollectionFileOptions) {

	const { collection, requests, variable } = await getCollection(opts);

	const leaves: RequestLeaf[] = [];
	collectLeaves(collection, "", leaves);

	const requestMap = new Map(requests.map((r) => [r.id, r]));

	const provider = new CliPreFetchContextProvider(
		collection,
		requestMap,
		variable,
	);

	const context: CollectionRunContext = {
		collection,
		leaves,
		requestMap,
		variable,
		effectiveVarId: "",
	};

	await executeCollection(
		[context],
		{
			exportFormat: opts.exportFormat,
			exportPath: opts.exportPath,
		},
		provider
	);
}

export async function runFolderFromFile(opts: {
	file: string;
	name?: string;
	id?: string;
	varFile?: string;
	exportFormat?: ExportFormat;
	exportPath?: string;
}): Promise<void> {

	const { collection, requests, variable } = await getCollection(opts);

	interface FolderMatch {
		folder: IFolder;
	}

	const folders: FolderMatch[] = [];

	function collectFolders(folder: IFolder): void {
		folders.push({ folder });

		for (const item of folder.data ?? []) {
			if (isFolder(item)) {
				collectFolders(item);
			}
		}
	}

	for (const item of collection.data ?? []) {
		if (isFolder(item)) {
			collectFolders(item);
		}
	}

	let match: FolderMatch | undefined;

	if (opts.id) {
		match = folders.find(f => f.folder.id === opts.id);
	} else if (opts.name) {
		match = folders.find(
			f => f.folder.name.toLowerCase() === opts.name!.toLowerCase(),
		);
	} else {
		wrtieConsleError("Provide --name or --id.");
		process.exit(1);
	}

	if (!match) {
		wrtieConsleError("Folder not found.");
		process.exit(1);
	}

	const leaves: RequestLeaf[] = [];
	collectLeaves(match.folder, match.folder.id, leaves);

	const requestMap = new Map(requests.map((r) => [r.id, r]));

	const provider = new CliPreFetchContextProvider(
		collection,
		requestMap,
		variable,
	);

	await executeFolder(
		{
			folder: match.folder,
			collection,
			leaves,
			requestMap,
			variable,
			effectiveVarId: ""
		},
		opts,
		provider
	);
}

export async function runRequestFromFile(opts: {
	file: string;
	name?: string;
	id?: string;
	varFile?: string;
	exportFormat?: ExportFormat;
	exportPath?: string;
}) {
	const { collection, requests, variable } = await getCollection(opts);

	const request =
		opts.id
			? requests.find(r => r.id === opts.id)
			: requests.find(r =>
				r.name.toLowerCase() === opts.name!.toLowerCase());

	if (!request) {
		wrtieConsleError("Request not found.");
		process.exit(1);
	}

	const folderId = findRequestFolderId(
		collection,
		request.id,
	);

	const requestMap = new Map(requests.map((r) => [r.id, r]));

	const provider = new CliPreFetchContextProvider(
		collection,
		requestMap,
		variable,
	);

	await executeSingleRequest(
		{
			request,
			collection,
			folderId,
			variable,
			effectiveVarId: "",
			requestMap
		},
		opts,
		provider
	);
}

function findRequestFolderId(
	collection: ICollections,
	requestId: string,
): string {
	const leaves: RequestLeaf[] = [];
	collectLeaves(collection, "", leaves);
	const leaf = leaves.find((l) => l.id === requestId);
	return leaf?.folderId ?? "";
}
