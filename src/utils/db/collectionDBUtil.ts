import { apiFetch, FetchConfig } from '../fetchUtil';
import { collectionDBPath } from './helper';
import { CopyExitingItems, DeleteExitingItems, GetColsRequests, RenameRequestItem, getMainDB } from './mainDBUtil';
import { createAutoDBCache } from './dbManager';
import { formatDate } from '../helper';
import { IFolder, IHistory, ICollections, ISettings } from '../../fetch-client-core/types/sidebar.types';
import { InitialSettings } from '../../fetch-client-ui/components/SideBar/redux/reducer';
import { IRequestModel } from '../../fetch-client-core/types/request.types';
import { isFolder } from '../../fetch-client-ui/components/SideBar/util';
import { pubSub } from '../../extension';
import { pubSubTypes, responseTypes } from '../../fetch-client-core/consts/requestTypes.consts';
import { SettingsType } from '../../fetch-client-ui/components/Collection/consts';
import { v4 as uuidv4 } from 'uuid';
import { writeLog } from '../logger/logger';
import * as vscode from 'vscode';


const { getLoadedDB: getCollectionDB, saveDB: saveCollectionDB, flush: flushCollectionDB, invalidate: invalidateCollectionDB } = createAutoDBCache(collectionDBPath);
export { getCollectionDB, saveCollectionDB, flushCollectionDB, invalidateCollectionDB };

function defaultSettings(): typeof InitialSettings {
	return JSON.parse(JSON.stringify(InitialSettings));
}

function findItem(source: { data: any[] }, id: string): any | null {
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

function findParent(source: { data: any[] }, id: string): any | null {
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


function findParentSettings(source: any, id: string, prevSettings: any = null): any | null {
	let curSettings = source.settings ?? null;
	if (curSettings?.auth?.authType === "inherit") {
		curSettings = prevSettings;
	}

	const directMatch = source.data.find((el: any) => el.id === id);
	if (directMatch) {
		if (!directMatch.settings) {
			return curSettings;
		}
		if (directMatch.settings.auth?.authType === "inherit") {
			directMatch.settings.auth = curSettings?.auth;
		}
		return directMatch.settings;
	}

	for (const entry of source.data) {
		if (isFolder(entry)) {
			const result = findParentSettings(entry, id, curSettings);
			if (result) {
				return result;
			}
		}
	}

	return null;
}

function getAllIds(source: { data: any[] }, ids: string[]): string[] {
	for (const item of source.data) {
		if (isFolder(item)) {
			getAllIds(item, ids);
		} else {
			ids.push(item.id);
		}
	}
	return ids;
}

function duplicateFolderItems(
	sourceFolder: IFolder,
	destFolder: IFolder,
	oldIds: string[],
	ids: Record<string, string>
): { folder: IFolder; oIds: string[]; nIds: Record<string, string> } {
	for (const item of sourceFolder.data) {
		if (isFolder(item)) {
			const subFolder: IFolder = {
				id: uuidv4(),
				name: item.name,
				createdTime: formatDate(),
				type: "folder",
				data: [],
				settings: (item as IFolder).settings ?? defaultSettings(),
			};
			destFolder.data.push(subFolder);
			duplicateFolderItems(
				item as IFolder,
				destFolder.data[destFolder.data.length - 1] as IFolder,
				oldIds,
				ids
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
			} as IHistory);
		}
	}
	return { folder: destFolder, oIds: oldIds, nIds: ids };
}

function cloneCollectionItems(
	sourceItems: any[],
	oldIds: string[],
	ids: Record<string, string>
): any[] {
	return sourceItems.map((item) => {
		if (isFolder(item)) {
			const destFolder: IFolder = {
				id: uuidv4(),
				name: item.name,
				createdTime: formatDate(),
				type: "folder",
				data: [],
				settings: (item as IFolder).settings ?? defaultSettings(),
			};
			const { folder, oIds, nIds } = duplicateFolderItems(item as IFolder, destFolder, [], {});
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
			} as IHistory;
		}
	});
}


function getPath(
	source: any,
	path: string,
	paths: Record<string, string>,
	ids: string[],
	type: string
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

// ---------------------------------------------------------------------------
// Collection CRUD
// ---------------------------------------------------------------------------

export async function CreateNewCollection(name: string, sideBarView: vscode.WebviewView): Promise<void> {
	try {
		const colDB = await getCollectionDB();

		const item: ICollections = {
			id: uuidv4(),
			createdTime: formatDate(),
			name,
			data: [],
			variableId: "",
			settings: defaultSettings(),
		};

		colDB.getCollection('userCollections').insert(item);
		saveCollectionDB(colDB);

		sideBarView?.webview.postMessage({ type: responseTypes.appendToCollectionsResponse, collection: item });
	} catch (err) {
		writeLog("error::CreateNewCollection(): " + err);
	}
}

export async function AddToCollection(
	item: ICollections,
	hasFolder: boolean,
	isNewFolder: boolean,
	webview: vscode.Webview,
	sideBarView: vscode.WebviewView,
	request?: IRequestModel
): Promise<void> {
	try {
		const [colDB, mainDB] = await Promise.all([getCollectionDB(), getMainDB()]);

		const reqId = hasFolder ? (item.data[0] as IFolder).data[0].id : item.data[0].id;
		const newId = uuidv4();

		const userCollections = colDB.getCollection('userCollections');
		const apiRequests = mainDB.getCollection('apiRequests');

		let reqData: IRequestModel | null = request ?? null;
		if (!reqData) {
			const results = apiRequests
				.chain()
				.find({ id: reqId })
				.data({ forceClones: true, removeMeta: true });
			reqData = results.length > 0 ? (results[0] as IRequestModel) : null;
		}

		if (!reqData) {
			return;
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

		saveCollectionDB(colDB);

		webview?.postMessage({
			type: responseTypes.addToCollectionsResponse,
			colId: item.id,
			folderId: hasFolder ? item.data[0].id : "",
			historyId: newId,
			historyName: hasFolder
				? (item.data[0] as IFolder).data[0].name
				: item.data[0].name,
			varId: colItem?.variableId ?? "",
		});

		sideBarView?.webview.postMessage({
			type: responseTypes.appendToCollectionsResponse,
			collection: colItem ?? item,
		});
	} catch (err) {
		writeLog("error::AddToCollection(): " + err);
	}
}

export async function DuplicateItem(
	colId: string,
	folderId: string,
	historyId: string,
	folderType: boolean,
	sideBarView: vscode.WebviewView
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const userCollections = colDB.getCollection('userCollections');
		const col = userCollections.by('id', colId);

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
					type: "folder",
					data: [],
					settings: item.settings ?? defaultSettings(),
				};
				const { folder, oIds, nIds } = duplicateFolderItems(item, destFolder, [], {});
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
				} as IHistory);
			}
		} else if (colId) {
			await CopyToCollection(colId, uuidv4(), `${col.name} (Copy)`, null, sideBarView);
			return;
		}

		saveCollectionDB(colDB);
		CopyExitingItems(oldIds, ids);

		sideBarView?.webview.postMessage({
			type: responseTypes.copyToCollectionsResponse,
			data: col,
		});
	} catch (err) {
		writeLog("error::DuplicateItem(): " + err);
	}
}

export async function NewRequestToCollection(
	item: IHistory,
	colId: string,
	folderId: string,
	sideBarView: vscode.WebviewView
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const col = colDB.getCollection('userCollections').by('id', colId);

		if (col) {
			if (folderId) {
				const folder = findItem(col, folderId);
				folder?.data.push(item);
			} else {
				col.data.push(item);
			}
			saveCollectionDB(colDB);
		}

		sideBarView?.webview.postMessage({
			type: responseTypes.createNewResponse,
			item,
			id: colId,
			folderId,
			variableId: col?.variableId,
		});
	} catch (err) {
		writeLog("error::NewRequestToCollection(): " + err);
	}
}

export async function CopyToCollection(
	sourceId: string,
	destId: string,
	destName: string,
	webview: vscode.Webview,
	sideBarView: vscode.WebviewView
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const userCollections = colDB.getCollection('userCollections');
		const [sourceCol] = userCollections
			.chain()
			.find({ id: sourceId })
			.data({ forceClones: true, removeMeta: true }) as ICollections[];

		const oldIds: string[] = [];
		const ids: Record<string, string> = {};

		const clonedItems = cloneCollectionItems(
			(sourceCol as ICollections).data,
			oldIds,
			ids
		);

		let resultCol: any;
		const destCol = userCollections.by("id", destId);

		if (!destCol) {
			const newCol: ICollections = {
				id: destId,
				name: destName,
				createdTime: formatDate(),
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

		saveCollectionDB(colDB);
		CopyExitingItems(oldIds, ids);

		webview?.postMessage({ type: responseTypes.copyToCollectionsResponse });
		sideBarView?.webview.postMessage({
			type: responseTypes.copyToCollectionsResponse,
			data: resultCol,
		});
	} catch (err) {
		writeLog("error::CopyToCollection(): " + err);
	}
}

export async function GetAllCollectionName(webview: vscode.Webview, from: string): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const userCollections = colDB.getCollection('userCollections').data;

		if (!userCollections?.length) {
			return;
		}

		const collections: { value: string; name: string; disabled: boolean }[] = [];
		const folders: { colId: string; value: string; name: string; disabled: boolean }[] = [];

		for (const col of userCollections) {
			collections.push({ value: col.id, name: col.name, disabled: false });
			for (const item of col.data) {
				if (item.data !== undefined) {
					folders.push({ colId: col.id, value: item.id, name: item.name, disabled: false });
				}
			}
		}

		const msgType =
			from === "addtocol"
				? responseTypes.getAllCollectionNameResponse
				: responseTypes.getAllCollectionNamesResponse;

		webview?.postMessage({ type: msgType, collectionNames: collections, folderNames: folders });
	} catch (err) {
		writeLog("error::GetAllCollectionName(): " + err);
	}
}

export async function GetAllCollections(webview: vscode.Webview): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const userCollections = colDB.getCollection('userCollections').data;
		webview?.postMessage({ type: responseTypes.getAllCollectionsResponse, collections: userCollections });
	} catch (err) {
		writeLog("error::GetAllCollections(): " + err);
	}
}

export async function RenameCollectionItem(
	webviewView: vscode.WebviewView,
	colId: string,
	historyId: string,
	folderId: string,
	folderType: boolean,
	name: string
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const col = colDB.getCollection('userCollections').by('id', colId);

		if (!col) {
			return;
		}

		const item = findItem(col, historyId || folderId);
		if (item) {
			item.name = name;
		}

		saveCollectionDB(colDB);

		if (!folderType) {
			RenameRequestItem(historyId, name);
		}

		webviewView?.webview.postMessage({
			type: responseTypes.renameCollectionItemResponse,
			params: { colId, historyId, folderId, isFolder: folderType, name },
		});
	} catch (err) {
		writeLog("error::RenameCollectionItem(): " + err);
	}
}

export async function DeleteCollectionItem(
	webviewView: vscode.WebviewView,
	colId: string,
	folderId: string,
	historyId: string,
	folderType: boolean
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const col = colDB.getCollection('userCollections').by('id', colId);

		if (!col) {
			return;
		}

		const targetId = folderType ? folderId : historyId;
		let deletedIds: string[] = [];

		const parent = findParent(col, targetId) ?? col;
		const pos = parent.data.findIndex((el: any) => el.id === targetId);

		if (pos !== -1) {
			if (folderType) {
				deletedIds = getAllIds(parent.data[pos], []);
			} else {
				deletedIds = [targetId];
			}
			parent.data.splice(pos, 1);
		}

		saveCollectionDB(colDB);
		DeleteExitingItems(deletedIds);

		webviewView?.webview.postMessage({
			type: responseTypes.deleteCollectionItemResponse,
			params: { colId, folderId, historyId, isFolder: folderType },
		});
	} catch (err) {
		writeLog("error::DeleteCollectionItem(): " + err);
	}
}

export async function RenameCollection(
	webviewView: vscode.WebviewView,
	colId: string,
	name: string
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		colDB.getCollection('userCollections').findAndUpdate({ id: colId }, (item) => { item.name = name; });
		saveCollectionDB(colDB);

		webviewView?.webview.postMessage({
			type: responseTypes.renameCollectionResponse,
			params: { id: colId, name },
		});
	} catch (err) {
		writeLog("error::RenameCollection(): " + err);
	}
}

export async function UpdateCollectionItems(
	colId: string,
	folderId: string,
	items: ICollections | IFolder
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const collection = colDB.getCollection('userCollections');
		const colItem = collection.by('id', colId);

		if (!colItem) {
			writeLog(`error::UpdateCollectionItems(): no collection found for id ${colId}`);
			return;
		}

		const target = folderId ? findItem(colItem, folderId) : colItem;

		if (!target) {
			writeLog(`error::UpdateCollectionItems(): no folder found for id ${folderId}`);
			return;
		}

		target.data = items;
		saveCollectionDB(colDB);
	} catch (err) {
		writeLog("error::UpdateCollectionItems(): " + err);
	}
}

export async function DeleteCollection(
	webviewView: vscode.WebviewView,
	colId: string
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const userCollections = colDB.getCollection('userCollections');
		const col = userCollections.by('id', colId);
		const ids = col ? getAllIds(col, []) : [];

		userCollections.findAndRemove({ id: colId });
		saveCollectionDB(colDB);

		DeleteExitingItems(ids);
		webviewView?.webview.postMessage({ type: responseTypes.deleteCollectionResponse, id: colId });
	} catch (err) {
		writeLog("error::DeleteCollection(): " + err);
	}
}

export async function DeleteAllCollectionItems(
	webviewView: vscode.WebviewView,
	colId: string,
	folderId: string
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const col = colDB.getCollection('userCollections').by('id', colId);
		let ids: string[] = [];

		if (folderId) {
			const folder = findItem(col, folderId);
			if (folder) {
				ids = getAllIds(folder, []);
				folder.data.length = 0;
			}
		} else {
			ids = getAllIds(col, []);
			col.data.length = 0;
		}

		saveCollectionDB(colDB);
		DeleteExitingItems(ids);

		webviewView?.webview.postMessage({
			type: responseTypes.clearResponse,
			id: colId,
			folderId,
		});
	} catch (err) {
		writeLog("error::DeleteAllCollectionItems(): " + err);
	}
}

export async function AttachVariable(
	colId: string,
	varId: string,
	webview: vscode.Webview,
	sideBarView: vscode.WebviewView
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		colDB.getCollection('userCollections').findAndUpdate({ id: colId }, (item) => { item.variableId = varId; });
		saveCollectionDB(colDB);

		webview?.postMessage({ type: responseTypes.attachVariableResponse });
		sideBarView?.webview.postMessage({
			type: responseTypes.attachVariableResponse,
			params: { id: colId, varId },
		});

		if (pubSub.size > 0) {
			pubSub.publish({
				messageType: varId === ""
					? pubSubTypes.removeCurrentVariable
					: pubSubTypes.addCurrentVariable,
				message: varId,
			});
		}
	} catch (err) {
		writeLog("error::AttachVariable(): " + err);
	}
}

export async function RemoveVariableByVariableId(
	varId: string,
	sideBarView: vscode.WebviewView
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		colDB.getCollection('userCollections').findAndUpdate({ variableId: varId }, (item) => { item.variableId = ""; });
		saveCollectionDB(colDB);

		if (sideBarView) {
			const userCollections = colDB.getCollection('userCollections').data;
			sideBarView.webview.postMessage({
				type: responseTypes.getAllCollectionsResponse,
				collections: userCollections,
			});
		}
	} catch (err) {
		writeLog("error::RemoveVariableByVariableId(): " + err);
	}
}

export async function GetCollectionsByVariable(varId: string, webview: vscode.Webview): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const cols = colDB.getCollection('userCollections').chain().find({ variableId: varId }).data();
		const colNames = cols.map((item: any) => item.name);

		webview?.postMessage({ type: responseTypes.getAttachedColIdsResponse, colNames });
	} catch (err) {
		writeLog("error::GetCollectionsByVariable(): " + err);
	}
}

export async function RemoveVariable(varId: string): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		colDB.getCollection('userCollections').findAndUpdate({ variableId: varId }, (item) => { item.variableId = ""; });
		saveCollectionDB(colDB);
	} catch (err) {
		writeLog("error::RemoveVariable(): " + err);
	}
}

export async function GetCollectionById(
	colId: string,
	folderId: string,
	webview: vscode.Webview): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const colItem = colDB.getCollection('userCollections').by('id', colId);
		const items = folderId !== null && folderId !== undefined && folderId !== "" ? findItem(colItem, folderId) : colItem;
		webview?.postMessage({ type: responseTypes.getCollectionDetailsByIdResponse, items });
	} catch (err) {
		writeLog("error::GetCollectionById(): " + err);
	}
}

export async function GetAllCollectionsById(
	colId: string,
	folderId: string,
	type: string,
	webview: vscode.Webview
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const colItem = colDB.getCollection('userCollections').by('id', colId);

		const source = type === "col" ? colItem : findItem(colItem, folderId);
		const { paths, ids } = getPath(source, "", {}, [], "source");

		GetColsRequests(ids.reverse(), paths, webview);

		if (colItem) {
			let settings: ISettings;

			if (folderId) {
				settings = findParentSettings(colItem, folderId) ?? defaultSettings() as ISettings;
			} else {
				settings = colItem.settings ?? defaultSettings() as ISettings;
			}

			webview?.postMessage({ type: responseTypes.getParentSettingsResponse, settings });
		}
	} catch (err) {
		writeLog("error::GetAllCollectionsById(): " + err);
	}
}

export async function GetAllCollectionsByIdWithPath(colId: string, webview: vscode.Webview): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const col = colDB.getCollection('userCollections').by('id', colId);
		const { paths } = getPath(col, "", {}, [], "request");

		webview?.postMessage({
			type: responseTypes.getCollectionsByIdWithPathResponse,
			colId,
			paths,
		});
	} catch (err) {
		writeLog("error::GetAllCollectionsByIdWithPath(): " + err);
	}
}

export async function GetVariableByColId(colId: string): Promise<string> {
	try {
		const colDB = await getCollectionDB();
		const colItem = colDB.getCollection('userCollections').by("id", colId);
		return colItem?.variableId ?? "";
	} catch (err) {
		writeLog("error::GetVariableByColId(): " + err);
		throw err;
	}
}

export async function NewFolderToCollection(
	item: IFolder,
	colId: string,
	folderId: string,
	sideBarView: vscode.WebviewView
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const colItem = colDB.getCollection('userCollections').by("id", colId);

		if (folderId) {
			const folder = findItem(colItem, folderId);
			folder?.data.push(item);
		} else {
			colItem.data.push(item);
		}

		saveCollectionDB(colDB);
		sideBarView?.webview.postMessage({
			type: responseTypes.createNewFolderResponse,
			folder: item,
			colId,
			folderId,
		});
	} catch (err) {
		writeLog("error::NewFolderToCollection(): " + err);
	}
}

export async function UpdateCollection(colId: string, item: IHistory): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const colItem = colDB.getCollection('userCollections').by("id", colId);
		const req = findItem(colItem, item.id);

		if (req) {
			req.name = item.name;
			req.method = item.method;
			req.url = item.url;
		}

		saveCollectionDB(colDB);
	} catch (err) {
		writeLog("error::UpdateCollection(): " + err);
	}
}

export async function GetCollectionSettings(
	webview: vscode.Webview,
	colId: string,
	folderId: string
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const colItem = colDB.getCollection('userCollections').by("id", colId);

		if (!colItem) {
			return;
		}

		let settings: any;
		if (folderId) {
			const folderItem = findItem(colItem, folderId);
			settings = folderItem?.settings ?? defaultSettings();
		} else {
			settings = colItem.settings ?? defaultSettings();
		}

		webview?.postMessage({
			type: responseTypes.getColSettingsResponse,
			data: {
				settings,
				type: folderId ? SettingsType.Folder : SettingsType.Collection,
				variableId: colItem.variableId,
			},
		});
	} catch (err) {
		writeLog("error::GetCollectionSettings(): " + err);
	}
}

export async function GetParentSettings(
	colId: string,
	folderId: string,
	webview: vscode.Webview
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const colItem = colDB.getCollection('userCollections').by("id", colId);

		if (!colItem) {
			return;
		}

		let settings: ISettings;
		if (folderId) {
			settings = findParentSettings(colItem, folderId) ?? defaultSettings() as ISettings;
		} else {
			settings = colItem.settings ?? defaultSettings() as ISettings;
		}

		webview?.postMessage({ type: responseTypes.getParentSettingsResponse, settings });
	} catch (err) {
		writeLog("error::GetParentSettings(): " + err);
	}
}

export async function GetParentSettingsSync(colId: string, folderId: string): Promise<ISettings | null> {
	try {
		const colDB = await getCollectionDB();
		const colItem = colDB.getCollection('userCollections').by("id", colId);

		if (!colItem) {
			return null;
		}

		if (folderId) {
			return (findParentSettings(colItem, folderId) ?? defaultSettings()) as ISettings;
		}

		return (colItem.settings ?? defaultSettings()) as ISettings;
	} catch (err) {
		writeLog("error::GetParentSettingsSync(): " + err);
		throw err;
	}
}

// ---------------------------------------------------------------------------
// Request execution
// ---------------------------------------------------------------------------
function resolveSettings(colItem: any, folderId?: string): any {
	if (folderId) {
		return findParentSettings(colItem, folderId) ?? defaultSettings();
	}
	return colItem.settings ?? defaultSettings();
}

export async function ExecuteRequest(
	reqData: any,
	fetchConfig: FetchConfig,
	webview: vscode.Webview
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const colItem = colDB.getCollection('userCollections').by("id", reqData.data.colId);

		if (!colItem) {
			return;
		}

		const settings = resolveSettings(colItem, reqData.data.folderId);
		const result = await apiFetch(reqData.data.reqData, reqData.data.variableData, settings, null, fetchConfig);
		webview?.postMessage(result);
	} catch (err) {
		writeLog("error::ExecuteRequest(): " + err);
	}
}

export async function ExecuteMultipleRequest(
	reqData: any,
	fetchConfig: FetchConfig,
	webview: vscode.Webview
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const colItem = colDB.getCollection('userCollections').by("id", reqData.data.colId);

		const requests = (reqData.data.reqData as any[]).map((item) => {
			if (item.auth?.authType !== "inherit") {
				return apiFetch(item, reqData.data.variableData, null, null, fetchConfig);
			}

			if (!colItem) {
				return apiFetch(item, reqData.data.variableData, null, null, fetchConfig);
			}

			// Determine the folder id from the item's path metadata.
			const pathEntry = item.data?.itemPaths?.[item.id] ?? "";
			const folderId = pathEntry.split(";")[1] === item.data?.colId ? "" : pathEntry.split(";")[1];
			const settings = resolveSettings(colItem, folderId);

			return apiFetch(item, reqData.data.variableData, settings, null, fetchConfig);
		});

		const values = await Promise.allSettled(requests);
		webview?.postMessage({ type: responseTypes.multipleApiResponse, output: values });
	} catch (err) {
		writeLog("error::ExecuteMultipleRequest(): " + err);
	}
}

export async function SaveCollectionSettings(
	webview: vscode.Webview,
	colId: string,
	folderId: string,
	settings: ISettings
): Promise<void> {
	try {
		const colDB = await getCollectionDB();
		const colItem = colDB.getCollection('userCollections').by("id", colId);

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

		saveCollectionDB(colDB);
		webview?.postMessage({ type: responseTypes.saveColSettingsResponse, colId, folderId });
	} catch (err) {
		writeLog("error::SaveCollectionSettings(): " + err);
	}
}
