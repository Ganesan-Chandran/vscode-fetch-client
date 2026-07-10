// --- Helpers ---------------------------------------------------------------

import { cliConfig } from "../config";
import { Col_Repository_GetAllCollections } from "../../fetch-client-core/db/collectionDB.repository";
import {
	CollectionRow,
	printSection,
	printCollections,
	FolderRow,
	printFolders,
	printVariables,
	VariableRow,
	printCollectionTree,
	printFolderTree,
	printVariableItems,
} from "../utils/display";
import {
	IFolder,
	IHistory,
	ICollections,
} from "../../fetch-client-core/types/sidebar.types";
import { Var_Repository_FindAll } from "../../fetch-client-core/db/variableDB.repository";

function isFolder(item: any): item is IFolder {
	return item.data !== undefined;
}

/** Recursively count leaf requests in a collection/folder tree node. */
function countRequests(node: { data?: (IHistory | IFolder)[] }): number {
	if (!node.data) {
		return 0;
	}

	let count = 0;

	for (const item of node.data) {
		if (isFolder(item)) {
			count += countRequests(item);
		} else {
			count += 1;
		}
	}

	return count;
}

interface FolderWithContext {
	folder: IFolder;
	collectionName: string;
}

/** Walk collection tree and collect all folders at any depth. */
function collectFolders(
	node: { data?: (IHistory | IFolder)[] },
	collectionName: string,
	result: FolderWithContext[],
): void {
	if (!node.data) {
		return;
	}

	for (const item of node.data) {
		if (isFolder(item)) {
			result.push({ folder: item, collectionName });
			collectFolders(item, collectionName, result);
		}
	}
}

// --- list --col ------------------------------------------------------------

export async function listCollections(opts: {
	name?: string;
	id?: string;
}): Promise<void> {
	const all: ICollections[] = await Col_Repository_GetAllCollections();

	let filtered = all;

	if (opts.id) {
		filtered = all.filter((c) => c.id === opts.id);
	} else if (opts.name) {
		const lower = opts.name.toLowerCase();
		filtered = all.filter((c) => c.name.toLowerCase().includes(lower));
	}

	const rows: CollectionRow[] = filtered.map((c) => ({
		id: c.id,
		name: c.name,
		requestCount: countRequests(c),
		variableId: c.variableId ?? "-",
		createdTime: c.createdTime,
	}));

	printSection("Collections");
	printCollections(rows);

	if ((opts.id || opts.name) && filtered.length > 0) {
		printSection("Contents");
		for (const col of filtered) {
			printCollectionTree(col);
		}
	}
}

// --- list --fol ------------------------------------------------------------

export async function listFolders(opts: {
	name?: string;
	id?: string;
}): Promise<void> {
	const all: ICollections[] = await Col_Repository_GetAllCollections();

	const allFolders: FolderWithContext[] = [];

	for (const col of all) {
		collectFolders(col, col.name, allFolders);
	}

	let filtered = allFolders;

	if (opts.id) {
		filtered = allFolders.filter((f) => f.folder.id === opts.id);
	} else if (opts.name) {
		const lower = opts.name.toLowerCase();
		filtered = allFolders.filter((f) =>
			f.folder.name.toLowerCase().includes(lower),
		);
	}

	const rows: FolderRow[] = filtered.map(({ folder, collectionName }) => ({
		id: folder.id,
		name: folder.name,
		collectionName: collectionName,
		requestCount: countRequests(folder),
		createdTime: folder.createdTime,
	}));

	printSection("Folders");
	printFolders(rows);

	if ((opts.id || opts.name) && filtered.length > 0) {
		printSection("Contents");
		for (const { folder, collectionName } of filtered) {
			printFolderTree(folder, collectionName);
		}
	}
}

// --- list --var ------------------------------------------------------------

export async function listVariables(opts: {
	name?: string;
	id?: string;
}): Promise<void> {
	const all = await Var_Repository_FindAll(cliConfig.encryptionKey);

	let filtered = all;

	if (opts.id) {
		filtered = all.filter((v) => v.id === opts.id);
	} else if (opts.name) {
		const lower = opts.name.toLowerCase();

		filtered = all.filter((v) => v.name.toLowerCase().includes(lower));
	}

	const rows: VariableRow[] = filtered.map((v) => ({
		id: v.id,
		name: v.name,
		active: v.isActive,
		varCount: v.data?.length ?? 0,
		createdTime: v.createdTime,
	}));

	printSection("Variables");
	printVariables(rows);

	if ((opts.id || opts.name) && filtered.length > 0) {
		printSection("Contents");
		for (const v of filtered) {
			printVariableItems(v.name, v.data ?? []);
		}
	}
}
