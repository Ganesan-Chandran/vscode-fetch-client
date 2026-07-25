import {
	Col_Repository_GetAllCollections,
} from "../../fetch-client-core/db/collectionDB.repository";
import {
	IFolder,
	IHistory,
	ICollections,
	IVariable,
} from "../../fetch-client-core/types/sidebar.types";
import {
	Main_Repository_GetRequestItem,
	Main_Repository_GetCollectionRequests,
} from "../../fetch-client-core/db/mainDB.repository";
import { cliConfig } from "../config";
import { CollectionRunContext, FolderRunContext, RequestLeaf, RequestRunContext, RunCollectionFileOptions } from "../types/common.types";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { red } from "../utils/display";
import { Var_Repository_FindAll, Var_Repository_FindById, Var_Repository_FindByIdSync } from "../../fetch-client-core/db/variableDB.repository";
import { writeConsoleLog, wrtieConsleError } from "../utils/logger";
import { fetchClientV2Importer } from "../../fetch-client-core/helpers/importers/collections/fetchClient/fetchClientImporter_2_0";
import { ImportFCVariable } from "../../fetch-client-core/helpers/importers/variables/fetchClient/fcVariableImporter";
import fs from "fs/promises";

// --- Tree walkers ------------------------------------------------------------

export function isFolder(item: any): item is IFolder {
	return item.data !== undefined;
}

/** Recursively collect all leaf request entries inside a node. */
export function collectLeaves(
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
export function findLeafByName(
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
export function findLeafById(
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

// --- Folder tree walker (used by run --fol and perf --fol) -------------------

export interface FolderMatch {
	folder: IFolder;
	collection: ICollections;
}

function collectNestedFolders(
	parentFolder: IFolder,
	col: ICollections,
	result: FolderMatch[],
): void {
	for (const item of parentFolder.data ?? []) {
		if (isFolder(item)) {
			result.push({ folder: item, collection: col });
			collectNestedFolders(item, col, result);
		}
	}
}

export function findAllFolders(collections: ICollections[]): FolderMatch[] {
	const allFolderMatches: FolderMatch[] = [];

	for (const col of collections) {
		for (const item of col.data ?? []) {
			if (isFolder(item)) {
				allFolderMatches.push({ folder: item, collection: col });
				collectNestedFolders(item, col, allFolderMatches);
			}
		}
	}

	return allFolderMatches;
}

// --- Variable + settings resolution ------------------------------------------

export async function resolveVariableByName(
	name: string,
	key: string,
): Promise<IVariable | null> {
	const all = await Var_Repository_FindAll(key);
	const lower = name.toLowerCase();
	return all.find((v) => v.name.toLowerCase() === lower) ?? null;
}

/**
 * Resolves the variable set to use for a run/perf command in a single DB read.
 * - If the item already has a linked variable, that takes priority.
 * - An info message is printed when the user also supplied --var-id/--var-name.
 * - Otherwise the user-supplied --var-id or --var-name is used.
 */
export async function resolveEffectiveForRun(
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

// --- Composed context resolvers (shared by `run` and `perf`) -----------------

export async function resolveCollectionContexts(opts: {
	all?: boolean;
	name?: string;
	id?: string;
	varId?: string;
	varName?: string;
}): Promise<CollectionRunContext[]> {
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

	return contexts;
}

export async function resolveFolderContext(opts: {
	name?: string;
	id?: string;
	varId?: string;
	varName?: string;
}): Promise<FolderRunContext> {
	const all: ICollections[] = await Col_Repository_GetAllCollections();
	const allFolderMatches = findAllFolders(all);

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

	return {
		folder: match.folder,
		collection: match.collection,
		leaves,
		requestMap: reqMap,
		variable,
		effectiveVarId,
	};
}

export async function resolveRequestContext(opts: {
	name?: string;
	id?: string;
	varId?: string;
	varName?: string;
}): Promise<RequestRunContext> {
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

	return {
		request,
		collection,
		folderId,
		variable,
		effectiveVarId,
	};
}

export async function loadCollectionFromFile(opts: RunCollectionFileOptions): Promise<{
	collection: ICollections;
	requests: IRequestModel[];
	variable: IVariable;
}> {
	try {
		await fs.access(opts.file);
	} catch {
		wrtieConsleError(`Collection file not found: ${opts.file}`);
		process.exit(1);
	}

	const parsedData = JSON.parse(await fs.readFile(opts.file, "utf8"));
	const convertedData = fetchClientV2Importer(parsedData, true);

	if (!convertedData?.fcCollection || !convertedData?.fcRequests) {
		wrtieConsleError("Fetch Client import produced incomplete data.");
		process.exit(1);
	}

	const collection = convertedData.fcCollection;
	const requests = convertedData.fcRequests;
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

/** Finds a folder anywhere in a single (already-loaded) collection tree, by id or name. */
export function findFolderInCollection(
	collection: ICollections,
	opts: { name?: string; id?: string },
): IFolder | null {
	const folders: IFolder[] = [];

	function collectFolders(node: { data?: (IHistory | IFolder)[] }): void {
		for (const item of node.data ?? []) {
			if (isFolder(item)) {
				folders.push(item);
				collectFolders(item);
			}
		}
	}

	collectFolders(collection);

	if (opts.id) {
		return folders.find((f) => f.id === opts.id) ?? null;
	}

	if (opts.name) {
		const lower = opts.name.toLowerCase();
		return folders.find((f) => f.name.toLowerCase() === lower) ?? null;
	}

	return null;
}

/** Finds a leaf's folderId within a single (already-loaded) collection tree. */
export function findRequestFolderId(collection: ICollections, requestId: string): string {
	const leaves: RequestLeaf[] = [];
	collectLeaves(collection, "", leaves);
	const leaf = leaves.find((l) => l.id === requestId);
	return leaf?.folderId ?? "";
}

// --- Multi-request resolution (used by `dd --req a,b,c` without --col/--fol) -

/**
 * Resolves a list of request identifiers (names or ids, matched across every
 * collection) down to a single owning collection plus that collection's full
 * requestMap (needed so pre-fetch chains referencing other requests still resolve).
 * All identifiers must belong to the same collection.
 */
export async function resolveRequestsAcrossCollections(identifiers: string[]): Promise<{
	collection: ICollections;
	leaves: RequestLeaf[];
	requestMap: Map<string, IRequestModel>;
	missing: string[];
}> {
	const all: ICollections[] = await Col_Repository_GetAllCollections();

	const matches: { leaf: RequestLeaf; collection: ICollections }[] = [];
	const missing: string[] = [];

	for (const ident of identifiers) {
		const found = isUuid(ident) ? findLeafById(all, ident) : findLeafByName(all, ident);
		if (found) {
			matches.push(found);
		} else {
			missing.push(ident);
		}
	}

	if (matches.length === 0) {
		wrtieConsleError(`None of the --req requests were found: ${identifiers.join(", ")}`);
		process.exit(1);
	}

	const collectionIds = new Set(matches.map((m) => m.collection.id));
	if (collectionIds.size > 1) {
		wrtieConsleError(
			"All requests passed to '--req' must belong to the same collection for a data-driven run.",
		);
		process.exit(1);
	}

	const collection = matches[0].collection;
	const allLeaves: RequestLeaf[] = [];
	collectLeaves(collection, "", allLeaves);

	const reqIds = allLeaves.map((l) => l.id);
	const requestModels = await Main_Repository_GetCollectionRequests(reqIds);
	const requestMap = new Map<string, IRequestModel>(
		requestModels.map((r) => [r.id, r]),
	);

	const selectedLeaves = matches.map((m) => m.leaf);

	return { collection, leaves: selectedLeaves, requestMap, missing };
}

/** Matches standard UUIDs (used to decide whether a --req identifier is a name or an id). */
const UUID_PATTERN_LOCAL = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
	return UUID_PATTERN_LOCAL.test(value);
}
