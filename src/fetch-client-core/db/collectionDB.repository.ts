import { collectionDBPath } from "./dbHelper";
import { createAutoDBCache } from "../../fetch-client-core/db/dbManager";
import { FetchConfig, apiFetch } from "../utils/fetchUtil";
import { formatDate } from "../helpers/dateTime.helper";
import {
	getMainDB,
	Main_Repository_CopyExistingItems,
	Main_Repository_DeleteExistingItems,
	Main_Repository_GetCollectionRequests,
	Main_Repository_RenameRequestItem,
} from "./mainDB.repository";
import {
	IFolder,
	IHistory,
	ICollections,
	ISettings,
} from "../../fetch-client-core/types/sidebar.types";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { isFolder } from "../helpers/common.helper";
import { pubSub } from "../../extension";
import { pubSubTypes } from "../../fetch-client-core/consts/requestTypes.consts";
import { v4 as uuidv4 } from "uuid";
import { writeLog } from "../helpers/logger/logger";
import { defaultSettings, findParentSettings, resolveParentSettings } from "../helpers/settings.helper";

const {
	getLoadedDB: getCollectionDB,
	saveDB: saveCollectionDB,
	flush: flushCollectionDB,
	invalidate: invalidateCollectionDB,
} = createAutoDBCache(collectionDBPath);
export {
	getCollectionDB,
	saveCollectionDB,
	flushCollectionDB,
	invalidateCollectionDB,
};

export function findItem(source: { data: any[] }, id: string): any | null {
	for (const entry of source.data) {
		if (entry.id === id) {
			return entry;
		}
		if (isFolder(entry)) {
			const found = findItem(entry, id);
			if (found) {
				return found;
			}
		}
	}
	return null;
}

export function findParent(source: { data: any[] }, id: string): any | null {
	for (const entry of source.data) {
		if (entry.id === id) {
			return source;
		}
		if (isFolder(entry)) {
			const found = findParent(entry, id);
			if (found) {
				return found;
			}
		}
	}
	return null;
}

export function getAllIds(source: { data: any[] }, ids: string[]): string[] {
	for (const item of source.data) {
		if (isFolder(item)) {
			getAllIds(item, ids);
		} else {
			ids.push(item.id);
		}
	}
	return ids;
}

export function duplicateFolderItems(
	sourceFolder: IFolder,
	destFolder: IFolder,
	oldIds: string[],
	ids: Record<string, string>,
): { folder: IFolder; oIds: string[]; nIds: Record<string, string> } {
	for (const item of sourceFolder.data) {
		if (isFolder(item)) {
			const subFolder: IFolder = {
				id: uuidv4(),
				name: item.name,
				createdTime: formatDate(),
				modifiedTime: formatDate(),
				type: "folder",
				data: [],
				settings: (item as IFolder).settings ?? defaultSettings(),
			};
			destFolder.data.push(subFolder);
			duplicateFolderItems(
				item as IFolder,
				destFolder.data[destFolder.data.length - 1] as IFolder,
				oldIds,
				ids,
			);
		} else {
			const newId = uuidv4();
			ids[item.id] = newId;
			oldIds.push(item.id);
			destFolder.data.push({
				id: newId,
				method: (item as IHistory).method,
				name: item.name,
				url: (item as IHistory).url,
				createdTime: formatDate(),
				modifiedTime: formatDate(),
			} as IHistory);
		}
	}
	return { folder: destFolder, oIds: oldIds, nIds: ids };
}

export function cloneCollectionItems(
	sourceItems: any[],
	oldIds: string[],
	ids: Record<string, string>,
): any[] {
	return sourceItems.map((item) => {
		if (isFolder(item)) {
			const destFolder: IFolder = {
				id: uuidv4(),
				name: item.name,
				createdTime: formatDate(),
				modifiedTime: formatDate(),
				type: "folder",
				data: [],
				settings: (item as IFolder).settings ?? defaultSettings(),
			};
			const { folder, oIds, nIds } = duplicateFolderItems(
				item as IFolder,
				destFolder,
				[],
				{},
			);
			oldIds.push(...oIds);
			Object.assign(ids, nIds);
			return folder;
		} else {
			const newId = uuidv4();
			oldIds.push(item.id);
			ids[item.id] = newId;
			return {
				id: newId,
				method: (item as IHistory).method,
				name: item.name,
				url: (item as IHistory).url,
				createdTime: formatDate(),
				modifiedTime: formatDate(),
			} as IHistory;
		}
	});
}

export function getPath(
	source: any,
	path: string,
	paths: Record<string, string>,
	ids: string[],
	type: string,
): { paths: Record<string, string>; ids: string[] } {
	const prefix = path ? `${path} > ${source.name}` : source.name;

	for (const item of source.data) {
		if (isFolder(item)) {
			getPath(item, prefix, paths, ids, type);
		} else {
			paths[item.id] =
				type === "source"
					? `${prefix};${source.id}`
					: `${prefix} > ${item.name};${source.id}`;
			ids.unshift(item.id);
		}
	}

	return { paths, ids };
}

export function resolveSettings(colItem: any, folderId?: string): any {
	if (folderId) {
		return findParentSettings(colItem, folderId) ?? defaultSettings();
	}
	return colItem.settings ?? defaultSettings();
}

// ---------------------------------------------------------------------------
// Collection CRUD - DB only (no postMessage)
// ---------------------------------------------------------------------------

export async function Col_Repository_CreateCollection(
	name: string,
): Promise<ICollections> {
	const colDB = await getCollectionDB();
	const item: ICollections = {
		id: uuidv4(),
		createdTime: formatDate(),
		modifiedTime: formatDate(),
		name,
		data: [],
		variableId: "",
		settings: defaultSettings(),
	};
	colDB.getCollection("userCollections").insert(item);
	await saveCollectionDB(colDB);
	return item;
}

export async function Col_Repository_AddToCollection(
	item: ICollections,
	hasFolder: boolean,
	isNewFolder: boolean,
	request?: IRequestModel,
): Promise<{ reqId: string; newId: string; colItem: any } | null> {
	const [colDB, mainDB] = await Promise.all([getCollectionDB(), getMainDB()]);

	const reqId = hasFolder
		? (item.data[0] as IFolder).data[0].id
		: item.data[0].id;
	const newId = uuidv4();

	const userCollections = colDB.getCollection("userCollections");
	const apiRequests = mainDB.getCollection("apiRequests");

	let reqData: IRequestModel | null = request ?? null;
	if (!reqData) {
		const results = apiRequests
			.chain()
			.find({ id: reqId })
			.data({ forceClones: true, removeMeta: true });
		reqData = results.length > 0 ? (results[0] as IRequestModel) : null;
	}

	if (!reqData) {
		return null;
	}

	reqData.id = newId;
	apiRequests.insert(reqData);
	mainDB.saveDatabase();

	if (hasFolder) {
		(item.data[0] as IFolder).data[0].id = newId;
	} else {
		item.data[0].id = newId;
	}

	let colItem = userCollections.by("id", item.id);

	if (!colItem) {
		userCollections.insert(item);
		colItem = item as any;
	} else if (item.data.length > 0) {
		if (hasFolder) {
			if (isNewFolder) {
				colItem.data.push(item.data[0]);
			} else {
				const folder = findItem(colItem, item.data[0].id);
				folder?.data.push((item.data[0] as IFolder).data[0]);
			}
		} else {
			colItem.data.push(item.data[0]);
		}
	}

	await saveCollectionDB(colDB);
	return { reqId, newId, colItem };
}

export async function Col_Repository_DuplicateItem(
	colId: string,
	folderId: string,
	historyId: string,
	folderType: boolean,
): Promise<
	| { col: any; oldIds: string[]; ids: Record<string, string> }
	| "copy-collection"
> {
	const colDB = await getCollectionDB();
	const userCollections = colDB.getCollection("userCollections");
	const col = userCollections.by("id", colId);

	let oldIds: string[] = [];
	let ids: Record<string, string> = {};

	if (folderType) {
		const parent = findParent(col, folderId);
		const item = parent ? findItem(parent, folderId) : null;

		if (item) {
			const destFolder: IFolder = {
				id: uuidv4(),
				name: `${item.name} (Copy)`,
				createdTime: formatDate(),
				modifiedTime: formatDate(),
				type: "folder",
				data: [],
				settings: item.settings ?? defaultSettings(),
			};
			const { folder, oIds, nIds } = duplicateFolderItems(
				item,
				destFolder,
				[],
				{},
			);
			oldIds = oIds;
			ids = nIds;
			parent.data.push(folder);
		}
	} else if (folderId) {
		const folder = findItem(col, folderId);
		const item = folder ? findItem(folder, historyId) : null;

		if (item) {
			const newId = uuidv4();
			ids[item.id] = newId;
			oldIds.push(item.id);
			folder.data.push({
				id: newId,
				method: item.method,
				name: `${item.name} (Copy)`,
				url: item.url,
				createdTime: formatDate(),
				modifiedTime: formatDate(),
			} as IHistory);
		}
	} else if (historyId) {
		const item = findItem(col, historyId);

		if (item) {
			const newId = uuidv4();
			ids[item.id] = newId;
			oldIds.push(item.id);
			col.data.push({
				id: newId,
				method: item.method,
				name: `${item.name} (Copy)`,
				url: item.url,
				createdTime: formatDate(),
				modifiedTime: formatDate(),
			} as IHistory);
		}
	} else if (colId) {
		return "copy-collection";
	}

	await saveCollectionDB(colDB);
	await Main_Repository_CopyExistingItems(oldIds, ids);

	return { col, oldIds, ids };
}

export async function Col_Repository_NewRequestToCollection(
	item: IHistory,
	colId: string,
	folderId: string,
): Promise<{ variableId: string | undefined }> {
	const colDB = await getCollectionDB();
	const col = colDB.getCollection("userCollections").by("id", colId);

	if (col) {
		if (folderId) {
			const folder = findItem(col, folderId);
			folder?.data.push(item);
		} else {
			col.data.push(item);
		}
		await saveCollectionDB(colDB);
	}

	return { variableId: col?.variableId };
}

export async function Col_Repository_CopyToCollection(
	sourceId: string,
	destId: string,
	destName: string,
): Promise<any> {
	const colDB = await getCollectionDB();
	const userCollections = colDB.getCollection("userCollections");
	const [sourceCol] = userCollections
		.chain()
		.find({ id: sourceId })
		.data({ forceClones: true, removeMeta: true }) as ICollections[];

	const oldIds: string[] = [];
	const ids: Record<string, string> = {};

	const clonedItems = cloneCollectionItems(
		(sourceCol as ICollections).data,
		oldIds,
		ids,
	);

	let resultCol: any;
	const destCol = userCollections.by("id", destId);

	if (!destCol) {
		const newCol: ICollections = {
			id: destId,
			name: destName,
			createdTime: formatDate(),
			modifiedTime: formatDate(),
			variableId: "",
			settings: sourceCol.settings ?? defaultSettings(),
			data: clonedItems,
		};
		userCollections.insert(newCol);
		resultCol = newCol;
	} else {
		destCol.data.push(...clonedItems);
		resultCol = destCol;
	}

	await saveCollectionDB(colDB);
	await Main_Repository_CopyExistingItems(oldIds, ids);

	return resultCol;
}

export async function Col_Repository_GetAllCollectionNames(): Promise<{
	collections: { value: string; name: string; disabled: boolean }[];
	folders: { colId: string; value: string; name: string; disabled: boolean }[];
} | null> {
	const colDB = await getCollectionDB();
	const userCollections = colDB.getCollection("userCollections").data;

	if (!userCollections?.length) {
		return null;
	}

	const collections: { value: string; name: string; disabled: boolean }[] = [];
	const folders: {
		colId: string;
		value: string;
		name: string;
		disabled: boolean;
	}[] = [];

	for (const col of userCollections) {
		collections.push({ value: col.id, name: col.name, disabled: false });
		for (const item of col.data) {
			if (item.data !== undefined) {
				folders.push({
					colId: col.id,
					value: item.id,
					name: item.name,
					disabled: false,
				});
			}
		}
	}

	return { collections, folders };
}

export async function Col_Repository_GetAllCollections(): Promise<any[]> {
	const colDB = await getCollectionDB();
	return colDB.getCollection("userCollections").data;
}

export async function Col_Repository_RenameCollectionItem(
	colId: string,
	historyId: string,
	folderId: string,
	folderType: boolean,
	name: string,
): Promise<void> {
	const colDB = await getCollectionDB();
	const col = colDB.getCollection("userCollections").by("id", colId);

	if (!col) {
		return;
	}

	const item = findItem(col, historyId || folderId);
	if (item) {
		item.name = name;
	}

	await saveCollectionDB(colDB);

	if (!folderType) {
		await Main_Repository_RenameRequestItem(historyId, name);
	}
}

export async function Col_Repository_DeleteCollectionItem(
	colId: string,
	folderId: string,
	historyId: string,
	folderType: boolean,
): Promise<void> {
	const colDB = await getCollectionDB();
	const col = colDB.getCollection("userCollections").by("id", colId);

	if (!col) {
		return;
	}

	const targetId = folderType ? folderId : historyId;

	const parent = findParent(col, targetId) ?? col;
	const pos = parent.data.findIndex((el: any) => el.id === targetId);

	if (pos !== -1) {
		const deletedIds = folderType
			? getAllIds(parent.data[pos], [])
			: [targetId];
		parent.data.splice(pos, 1);
		await saveCollectionDB(colDB);
		await Main_Repository_DeleteExistingItems(deletedIds);
	}
}

export async function Col_Repository_RenameCollection(
	colId: string,
	name: string,
): Promise<void> {
	const colDB = await getCollectionDB();
	colDB
		.getCollection("userCollections")
		.findAndUpdate({ id: colId }, (item) => {
			item.name = name;
		});
	await saveCollectionDB(colDB);
}

export async function Col_Repository_UpdateCollectionItems(
	colId: string,
	folderId: string,
	items: ICollections | IFolder,
): Promise<void> {
	const colDB = await getCollectionDB();
	const collection = colDB.getCollection("userCollections");
	const colItem = collection.by("id", colId);

	if (!colItem) {
		writeLog(
			`error::dbUpdateCollectionItems(): no collection found for id ${colId}`,
		);
		return;
	}

	const target = folderId ? findItem(colItem, folderId) : colItem;

	if (!target) {
		writeLog(
			`error::dbUpdateCollectionItems(): no folder found for id ${folderId}`,
		);
		return;
	}

	target.data = items;
	await saveCollectionDB(colDB);
}

export async function Col_Repository_DeleteCollection(
	colId: string,
): Promise<string[]> {
	const colDB = await getCollectionDB();
	const userCollections = colDB.getCollection("userCollections");
	const col = userCollections.by("id", colId);
	const ids = col ? getAllIds(col, []) : [];

	userCollections.findAndRemove({ id: colId });
	await saveCollectionDB(colDB);
	await Main_Repository_DeleteExistingItems(ids);

	return ids;
}

export async function Col_Repository_DeleteAllCollectionItems(
	colId: string,
	folderId: string,
): Promise<void> {
	const colDB = await getCollectionDB();
	const col = colDB.getCollection("userCollections").by("id", colId);

	if (folderId) {
		const folder = findItem(col, folderId);
		if (folder) {
			const ids = getAllIds(folder, []);
			folder.data.length = 0;
			await saveCollectionDB(colDB);
			await Main_Repository_DeleteExistingItems(ids);
		}
	} else {
		const ids = getAllIds(col, []);
		col.data.length = 0;
		await saveCollectionDB(colDB);
		await Main_Repository_DeleteExistingItems(ids);
	}
}

export async function Col_Repository_AttachVariable(
	colId: string,
	varId: string,
): Promise<void> {
	const colDB = await getCollectionDB();
	colDB
		.getCollection("userCollections")
		.findAndUpdate({ id: colId }, (item) => {
			item.variableId = varId;
		});
	await saveCollectionDB(colDB);

	if (pubSub.size > 0) {
		pubSub.publish({
			messageType:
				varId === ""
					? pubSubTypes.removeCurrentVariable
					: pubSubTypes.addCurrentVariable,
			message: varId,
		});
	}
}

export async function Col_Repository_RemoveVariableByVariableId(
	varId: string,
): Promise<any[]> {
	const colDB = await getCollectionDB();
	colDB
		.getCollection("userCollections")
		.findAndUpdate({ variableId: varId }, (item) => {
			item.variableId = "";
		});
	await saveCollectionDB(colDB);
	return colDB.getCollection("userCollections").data;
}

export async function Col_Repository_GetCollectionsByVariable(
	varId: string,
): Promise<string[]> {
	const colDB = await getCollectionDB();
	const cols = colDB
		.getCollection("userCollections")
		.chain()
		.find({ variableId: varId })
		.data();
	return cols.map((item: any) => item.name);
}

export async function Col_Repository_RemoveVariable(
	varId: string,
): Promise<void> {
	const colDB = await getCollectionDB();
	colDB
		.getCollection("userCollections")
		.findAndUpdate({ variableId: varId }, (item) => {
			item.variableId = "";
		});
	await saveCollectionDB(colDB);
}

export async function Col_Repository_GetCollectionById(
	colId: string,
	folderId: string,
): Promise<any> {
	const colDB = await getCollectionDB();
	const colItem = colDB.getCollection("userCollections").by("id", colId);
	return folderId ? findItem(colItem, folderId) : colItem;
}

export async function Col_Repository_GetAllCollectionsById(
	colId: string,
	folderId: string,
	type: string,
): Promise<{
	requests: IRequestModel[];
	paths: Record<string, string>;
	settings: ISettings;
}> {
	const colDB = await getCollectionDB();
	const colItem = colDB.getCollection("userCollections").by("id", colId);

	const source = type === "col" ? colItem : findItem(colItem, folderId);
	const { paths, ids } = getPath(source, "", {}, [], "source");

	const requests = await Main_Repository_GetCollectionRequests(ids.reverse());

	let settings: ISettings;
	if (folderId) {
		settings =
			findParentSettings(colItem, folderId) ?? (defaultSettings() as ISettings);
	} else {
		settings = colItem.settings ?? (defaultSettings() as ISettings);
	}

	return { requests, paths, settings };
}

export async function Col_Repository_GetAllCollectionsByIdWithPath(
	colId: string,
): Promise<Record<string, string>> {
	const colDB = await getCollectionDB();
	const col = colDB.getCollection("userCollections").by("id", colId);
	const { paths } = getPath(col, "", {}, [], "request");
	return paths;
}

export async function Col_Repository_GetVariableByColId(
	colId: string,
): Promise<string> {
	const colDB = await getCollectionDB();
	const colItem = colDB.getCollection("userCollections").by("id", colId);
	return colItem?.variableId ?? "";
}

export async function Col_Repository_NewFolderToCollection(
	item: IFolder,
	colId: string,
	folderId: string,
): Promise<void> {
	const colDB = await getCollectionDB();
	const colItem = colDB.getCollection("userCollections").by("id", colId);

	if (folderId) {
		const folder = findItem(colItem, folderId);
		folder?.data.push(item);
	} else {
		colItem.data.push(item);
	}

	await saveCollectionDB(colDB);
}

export async function Col_Repository_UpdateCollection(
	colId: string,
	item: IHistory,
): Promise<void> {
	const colDB = await getCollectionDB();
	const colItem = colDB.getCollection("userCollections").by("id", colId);
	const req = findItem(colItem, item.id);

	if (req) {
		req.name = item.name;
		req.method = item.method;
		req.url = item.url;
	}

	await saveCollectionDB(colDB);
}

export async function Col_Repository_GetCollectionSettings(
	colId: string,
	folderId: string,
): Promise<{ settings: any; variableId: string } | null> {
	const colDB = await getCollectionDB();
	const colItem = colDB.getCollection("userCollections").by("id", colId);

	if (!colItem) {
		return null;
	}

	let settings: any;
	if (folderId) {
		const folderItem = findItem(colItem, folderId);
		settings = folderItem?.settings ?? defaultSettings();
	} else {
		settings = colItem.settings ?? defaultSettings();
	}

	return { settings, variableId: colItem.variableId };
}

export async function Col_Repository_GetParentSettings(
	colId: string,
	folderId: string,
): Promise<ISettings | null> {
	const colDB = await getCollectionDB();
	const colItem = colDB.getCollection("userCollections").by("id", colId);

	if (!colItem) {
		return null;
	}

	return resolveParentSettings(colItem, folderId);
}

export async function Col_Repository_SaveCollectionSettings(
	colId: string,
	folderId: string,
	settings: ISettings,
): Promise<void> {
	const colDB = await getCollectionDB();
	const colItem = colDB.getCollection("userCollections").by("id", colId);

	if (!colItem) {
		return;
	}

	if (folderId) {
		const folderItem = findItem(colItem, folderId);
		if (folderItem) {
			folderItem.settings = settings;
		}
	} else {
		colItem.settings = settings;
	}

	await saveCollectionDB(colDB);
}

export async function Col_Repository_ExecuteRequest(
	reqData: any,
	fetchConfig: FetchConfig,
): Promise<any> {
	const colDB = await getCollectionDB();
	const colItem = colDB
		.getCollection("userCollections")
		.by("id", reqData.data.colId);

	if (!colItem) {
		return null;
	}

	const settings = resolveSettings(colItem, reqData.data.folderId);
	return apiFetch(
		reqData.data.reqData,
		reqData.data.variableData,
		settings,
		null,
		fetchConfig,
	);
}

export async function Col_Repository_ExecuteMultipleRequests(
	reqData: any,
	fetchConfig: FetchConfig,
): Promise<PromiseSettledResult<any>[]> {
	const colDB = await getCollectionDB();
	const colItem = colDB
		.getCollection("userCollections")
		.by("id", reqData.data.colId);

	const requests = (reqData.data.reqData as any[]).map((item) => {
		if (item.auth?.authType !== "inherit") {
			return apiFetch(item, reqData.data.variableData, null, null, fetchConfig);
		}

		if (!colItem) {
			return apiFetch(item, reqData.data.variableData, null, null, fetchConfig);
		}

		const pathEntry = item.data?.itemPaths?.[item.id] ?? "";
		const folderId =
			pathEntry.split(";")[1] === item.data?.colId
				? ""
				: pathEntry.split(";")[1];
		const settings = resolveSettings(colItem, folderId);

		return apiFetch(
			item,
			reqData.data.variableData,
			settings,
			null,
			fetchConfig,
		);
	});

	return Promise.allSettled(requests);
}
