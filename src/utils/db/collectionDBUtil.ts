import loki, { LokiFsAdapter } from 'lokijs';
import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';
import { pubSub } from '../../extension';
import { SettingsType } from '../../fetch-client-ui/components/Collection/consts';
import { IRequestModel } from '../../fetch-client-ui/components/RequestUI/redux/types';
import { InitialSettings } from '../../fetch-client-ui/components/SideBar/redux/reducer';
import { ICollections, IFolder, IHistory, ISettings } from "../../fetch-client-ui/components/SideBar/redux/types";
import { isFolder } from '../../fetch-client-ui/components/SideBar/util';
import { pubSubTypes, responseTypes } from '../configuration';
import { apiFetch, FetchConfig } from '../fetchUtil';
import { formatDate } from '../helper';
import { writeLog } from '../logger/logger';
import { collectionDBPath, mainDBPath } from './dbPaths';
import { CopyExitingItems, DeleteExitingItems, GetColsRequests, RenameRequestItem } from './mainDBUtil';

function getDB(): loki {
	const idbAdapter = new LokiFsAdapter();
	const db = new loki(collectionDBPath(), { adapter: idbAdapter });
	db.autosaveDisable();
	return db;
}

function getRequestDB(): loki {
	const idbAdapter = new LokiFsAdapter();
	const db = new loki(mainDBPath(), { adapter: idbAdapter });
	return db;
}

function findItem(source: any, id: string) {

	let pos = source.data.findIndex((el: any) => el.id === id);

	if (pos !== -1) {
		return source.data[pos];
	}

	for (let i = 0; i < source.data.length; i++) {
		if (isFolder(source.data[i])) {
			const result = findItem(source.data[i], id);
			if (result) {
				return result;
			}
		}
	}
}

function findParent(source: any, id: string) {
	let pos = source.data.findIndex((el: any) => el.id === id);

	if (pos !== -1) {
		return source;
	}

	for (let i = 0; i < source.data.length; i++) {
		if (isFolder(source.data[i])) {
			const result = findParent(source.data[i], id);

			if (result) {
				return result;
			}
		}
	}
}

function findParentSettings(source: any, id: string, prevSettings: any = null) {

	let pos = source.data.findIndex((el: any) => el.id === id);
	let curSettings = source.settings;

	if (curSettings) {
		if (curSettings.auth.authType === "inherit") {
			curSettings = prevSettings;
		}
	} else {
		curSettings = prevSettings;
	}

	if (pos !== -1) {
		if (source.data[pos].settings) {
			if (source.data[pos].settings.auth.authType === "inherit") {
				source.data[pos].settings.auth = curSettings.auth;
				return source.data[pos].settings;
			} else {
				return source.data[pos].settings;
			}
		} else {
			return curSettings;
		}
	}

	let folders = source.data.filter((item: any) => item.data !== undefined);

	for (let i = 0; i < folders.length; i++) {
		const result: any = findParentSettings(folders[i], id, curSettings);
		if (result) {
			return result;
		}
	}
}

function duplicateFolderItems(sourceFolder: IFolder, destFolder: IFolder, oldIds: string[], ids: {}): { folder: IFolder, oIds: string[], nIds: {} } {
	sourceFolder.data.forEach((item) => {
		if (isFolder(item)) {
			let folder: IFolder = {
				id: uuidv4(),
				name: item.name,
				createdTime: formatDate(),
				type: "folder",
				data: [],
				settings: (item as IFolder).settings ? (item as IFolder).settings : JSON.parse(JSON.stringify(InitialSettings))
			};
			destFolder.data.push(folder);
			duplicateFolderItems(item as IFolder, destFolder.data[destFolder.data.length - 1] as IFolder, oldIds, ids);
		} else {
			let newId = uuidv4();
			ids[item.id] = newId;
			oldIds.push(item.id);
			let his: IHistory = {
				id: newId,
				method: (item as IHistory).method,
				name: item.name,
				url: (item as IHistory).url,
				createdTime: formatDate()
			};
			destFolder.data.push(his);
		}
	});

	return { folder: destFolder, oIds: oldIds, nIds: ids };
}

function getAllIds(source: any, ids: string[]) {
	source.data.forEach(function (item) {
		if (isFolder(item)) {
			getAllIds(item, ids);
		} else {
			ids.push(item.id);
		}
	});

	return ids;
}

export function CreateNewCollection(name: string, sideBarView: vscode.WebviewView) {
	try {
		const colDB = getDB();
		colDB.loadDatabase({}, function () {
			let item: ICollections = {
				id: uuidv4(),
				createdTime: formatDate(),
				name: name,
				data: [],
				variableId: "",
				settings: JSON.parse(JSON.stringify(InitialSettings))
			};
			const userCollections = colDB.getCollection('userCollections');
			userCollections.insert(item);
			colDB.saveDatabase();
			if (sideBarView) {
				sideBarView.webview.postMessage({ type: responseTypes.appendToCollectionsResponse, collection: item });
			}
		});
	} catch (err) {
		writeLog("error::CreateNewCollection(): " + err);
	}
}

export function AddToCollection(item: ICollections, hasFolder: boolean, isNewFolder: boolean, webview: vscode.Webview, sideBarView: vscode.WebviewView, request?: IRequestModel) {
	try {

		const colDB = getDB();
		const reqDB = getRequestDB();
		const reqId = hasFolder ? (item.data[0] as IFolder).data[0].id : item.data[0].id;
		const newId = uuidv4();

		colDB.loadDatabase({}, function () {
			const userCollections = colDB.getCollection('userCollections');

			reqDB.loadDatabase({}, function () {

				let reqData: IRequestModel;
				let results: any[];

				//Add new item to main DB
				const apiRequests = reqDB.getCollection('apiRequests');

				if (request) {
					reqData = request;
				} else {
					results = apiRequests.chain().find({ 'id': reqId }).data({ forceClones: true, removeMeta: true });
					if (results && results.length > 0) {
						reqData = (results[0] as IRequestModel);
					}
				}

				if (reqData) {
					reqData.id = newId;
					apiRequests.insert(reqData);
					reqDB.saveDatabase();

					// Save item to collection DB
					let colItem = userCollections.by("id", item.id);

					if (hasFolder) {
						(item.data[0] as IFolder).data[0].id = newId;
					} else {
						item.data[0].id = newId;
					}

					if (colItem === null || colItem === undefined) {
						userCollections.insert(item);
					} else {
						if (item && item.data && item.data.length > 0) {

							if (hasFolder) {
								if (isNewFolder) {
									colItem.data.push(item.data[0]);
								} else {
									let folder = findItem(colItem, item.data[0].id);
									folder.data.push((item.data[0] as IFolder).data[0]);
								}
							} else {
								colItem.data.push(item.data[0]);
							}
						}
					}

					colDB.saveDatabase();

					if (webview) {
						webview.postMessage({
							type: responseTypes.addToCollectionsResponse,
							colId: item.id,
							folderId: hasFolder ? item.data[0].id : "",
							historyId: newId,
							historyName: hasFolder ? (item.data[0] as IFolder).data[0].name : item.data[0].name,
							varId: colItem ? colItem.variableId : ""
						});
					}

					if (sideBarView) {
						sideBarView.webview.postMessage({ type: responseTypes.appendToCollectionsResponse, collection: colItem ? colItem : item });
					}
				}
			});
		});
	} catch (err) {
		writeLog("error::AddToCollection(): " + err);
	}
}

export function DuplicateItem(coldId: string, folderId: string, historyId: string, folderType: boolean, sideBarView: vscode.WebviewView) {
	try {
		const colDB = getDB();
		let oldIds: string[] = [];
		let ids = {};

		colDB.loadDatabase({}, function () {
			const collections = colDB.getCollection('userCollections').find({ 'id': coldId });

			if (folderType) {
				let parent = findParent(collections[0], folderId);
				if (parent) {
					let item = findItem(parent, folderId);
					if (item) {
						let destFolder: IFolder = {
							id: uuidv4(),
							name: item.name + " (Copy)",
							createdTime: formatDate(),
							type: "folder",
							data: [],
							settings: item.settings ? item.settings : JSON.parse(JSON.stringify(InitialSettings))
						};

						const { folder, oIds, nIds } = duplicateFolderItems(item, destFolder, [], {});
						oldIds = oIds;
						ids = nIds;
						parent.data.push(folder);
					}
				}
			} else {
				if (folderId) {
					let folder = findItem(collections[0], folderId);
					if (folder) {
						let item = findItem(folder, historyId);
						let newId = uuidv4();
						ids[item.id] = newId;
						oldIds.push(item.id);
						let his: IHistory = {
							id: newId,
							method: item.method,
							name: item.name + " (Copy)",
							url: item.url,
							createdTime: formatDate()
						};
						folder.data.push(his);
					}
				}
				else if (historyId) {
					let item = findItem(collections[0], historyId);
					if (item) {
						let newId = uuidv4();
						ids[item.id] = newId;
						oldIds.push(item.id);
						let his: IHistory = {
							id: newId,
							method: item.method,
							name: item.name + " (Copy)",
							url: item.url,
							createdTime: formatDate()
						};
						collections[0].data.push(his);
					}
				} else if (coldId) {
					CopyToCollection(coldId, uuidv4(), collections[0].name + " (Copy)", null, sideBarView);
					return;
				}
			}
			colDB.saveDatabase();
			CopyExitingItems(oldIds, ids);

			if (sideBarView) {
				sideBarView.webview.postMessage({ type: responseTypes.copyToCollectionsResponse, data: collections[0] });
			}
		});
	} catch (err) {
		writeLog("error::DuplicateItem(): " + err);
	}
}

export function NewRequestToCollection(item: IHistory, colId: string, folderId: string, sideBarView: vscode.WebviewView) {
	try {
		const colDB = getDB();

		colDB.loadDatabase({}, function () {
			let cols = colDB.getCollection('userCollections').by('id', colId);
			if (cols) {
				if (folderId) {
					let folder = findItem(cols, folderId);
					if (folder) {
						folder.data.push(item);
					}
				} else {
					cols.data.push(item);
				}
			}

			colDB.saveDatabase();

			if (sideBarView) {
				sideBarView.webview.postMessage({ type: responseTypes.createNewResponse, item: item, id: colId, folderId: folderId, variableId: cols.variableId });
			}

		});
	} catch (err) {
		writeLog("error::NewRequestToCollection(): " + err);
	}
}

export function CopyToCollection(sourceId: string, destID: string, destName: string, webview: vscode.Webview, sideBarView: vscode.WebviewView) {
	try {
		const colDB = getDB();

		colDB.loadDatabase({}, function () {
			let cols: any;
			let ids = {};
			let oldIds: string[] = [];

			const userCollections = colDB.getCollection('userCollections');
			let sourceColItem = userCollections.chain().find({ 'id': sourceId }).data({ forceClones: true, removeMeta: true });
			let destColItem = userCollections.by("id", destID);

			if (destColItem === null || destColItem === undefined) {
				let items: ICollections = {
					id: destID,
					name: destName,
					createdTime: formatDate(),
					variableId: "",
					settings: sourceColItem[0].settings ? sourceColItem[0].settings : JSON.parse(JSON.stringify(InitialSettings)),
					data: (sourceColItem[0] as ICollections).data.length > 0 ? (sourceColItem[0] as ICollections).data.map(item => {
						if (isFolder(item)) {
							let destFolder: IFolder = {
								id: uuidv4(),
								name: item.name,
								createdTime: formatDate(),
								type: "folder",
								data: [],
								settings: (item as IFolder).settings ? (item as IFolder).settings : JSON.parse(JSON.stringify(InitialSettings))
							};
							const { folder, oIds, nIds } = duplicateFolderItems(item as IFolder, destFolder, [], {});
							oldIds = [...oldIds, ...oIds];
							ids = { ...ids, ...nIds };

							return folder;
						} else {
							item = (item as IHistory);
							let newId = uuidv4();
							oldIds.push(item.id);
							ids[item.id] = newId;
							let his: IHistory = {
								id: newId,
								method: item.method,
								name: item.name,
								url: item.url,
								createdTime: formatDate()
							};
							return his;
						}
					}) : []
				};

				cols = items;
				userCollections.insert(items);

			} else {
				if ((sourceColItem[0] as ICollections).data.length > 0) {
					let items = (sourceColItem[0] as ICollections).data.map(item => {
						if (isFolder(item)) {
							let destFolder: IFolder = {
								id: uuidv4(),
								name: item.name,
								createdTime: formatDate(),
								type: "folder",
								data: [],
								settings: (item as IFolder).settings ? (item as IFolder).settings : JSON.parse(JSON.stringify(InitialSettings))
							};
							const { folder, oIds, nIds } = duplicateFolderItems(item as IFolder, destFolder, [], {});
							oldIds = [...oldIds, ...oIds];
							ids = { ...ids, ...nIds };
							return folder;
						} else {
							item = (item as IHistory);
							let newId = uuidv4();
							oldIds.push(item.id);
							ids[item.id] = newId;
							let his: IHistory = {
								id: newId,
								method: item.method,
								name: item.name,
								url: item.url,
								createdTime: formatDate()
							};
							return his;
						}
					});

					items.forEach(item => {
						destColItem.data.push(item);
					});

					cols = destColItem;
				}
			}

			colDB.saveDatabase();
			CopyExitingItems(oldIds, ids);

			if (webview) {
				webview.postMessage({ type: responseTypes.copyToCollectionsResponse });
			}

			if (sideBarView) {
				sideBarView.webview.postMessage({ type: responseTypes.copyToCollectionsResponse, data: cols });
			}
		});

	} catch (err) {
		writeLog("error::CopyToCollection(): " + err);
	}
}

export function GetAllCollectionName(webview: vscode.Webview, from: string) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const userCollections = db.getCollection('userCollections').data;

			if (userCollections && userCollections.length > 0) {
				let collections = [];
				let folders = [];
				userCollections.forEach(col => {
					col.data.forEach(item => {
						if (item.data) {
							folders.push({ colId: col.id, value: item.id, name: item.name, disabled: false });
						}
					});
					collections.push({ value: col.id, name: col.name, disabled: false });
				});

				if (from === "addtocol") {
					webview.postMessage({ type: responseTypes.getAllCollectionNameResponse, collectionNames: collections, folderNames: folders });
				} else {
					webview.postMessage({ type: responseTypes.getAllCollectionNamesResponse, collectionNames: collections, folderNames: folders });
				}
			}
		});

	} catch (err) {
		writeLog("error::GetAllCollectionName(): " + err);
	}
}

export function GetAllCollections(webview: vscode.Webview) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const userCollections = db.getCollection('userCollections').data;
			webview.postMessage({ type: responseTypes.getAllCollectionsResponse, collections: userCollections });
		});

	} catch (err) {
		writeLog("error::GetAllCollections(): " + err);
	}
}

export function RenameCollectionItem(webviewView: vscode.WebviewView, colId: string, historyId: string, folderId: string, folderType: boolean, name: string) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			let cols = db.getCollection('userCollections').by('id', colId);

			if (cols) {
				let item = findItem(cols, historyId ? historyId : folderId);

				if (item) {
					item["name"] = name;
				}

				db.saveDatabase();

				if (!folderType) {
					RenameRequestItem(historyId, name);
				}

				webviewView.webview.postMessage(
					{
						type: responseTypes.renameCollectionItemResponse,
						params: { colId: colId, historyId: historyId, folderId: folderId, isFolder: folderType, name: name }
					}
				);
			}
		});
	} catch (err) {
		writeLog("error::RenameCollectionItem(): " + err);
	}
}

export function DeleteCollectionItem(webviewView: vscode.WebviewView, colId: string, folderId: string, historyId: string, folderType: boolean) {
	try {

		let ids: string[];

		function deleteItem(source: any, id: string, folderType: boolean) {
			let pos = source.data.findIndex((el: any) => el.id === id);

			if (pos !== -1) {
				if (folderType) {
					ids = getAllIds(source, []);
				} else {
					ids = [id];
				}
				source.data.splice(pos, 1);
			}

			for (let i = 0; i < source.data.length; i++) {
				if (isFolder(source.data[i])) {
					deleteItem(source.data[i], id, folderType);
				}
			}
		}

		const db = getDB();

		db.loadDatabase({}, function () {
			let cols = db.getCollection('userCollections').by('id', colId);
			if (cols !== null) {
				deleteItem(cols, folderType ? folderId : historyId, folderType);
				db.saveDatabase();
			}
			DeleteExitingItems(ids);
			webviewView.webview.postMessage({ type: responseTypes.deleteCollectionItemResponse, params: { colId: colId, folderId: folderId, historyId: historyId, isFolder: folderType } });
		});

	} catch (err) {
		writeLog("error::DeleteCollectionItem(): " + err);
	}
}

export function RenameCollection(webviewView: vscode.WebviewView, colId: string, name: string) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			db.getCollection('userCollections').findAndUpdate({ 'id': colId }, item => { item.name = name; });
			db.saveDatabase();
			webviewView.webview.postMessage({ type: responseTypes.renameCollectionResponse, params: { id: colId, name: name } });
		});

	} catch (err) {
		writeLog("error::RenameCollection(): " + err);
	}
}

export function DeleteCollection(webviewView: vscode.WebviewView, colId: string) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const userCollections = db.getCollection('userCollections');
			let results = userCollections.by('id', colId);
			let ids = getAllIds(results, []);

			userCollections.findAndRemove({ 'id': colId });
			db.saveDatabase();

			DeleteExitingItems(ids);

			webviewView.webview.postMessage({ type: responseTypes.deleteCollectionResponse, id: colId });
		});

	} catch (err) {
		writeLog("error::DeleteCollection(): " + err);
	}
}


export function DeleteAllCollectionItems(webviewView: vscode.WebviewView, colId: string, folderId: string) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const userCollections = db.getCollection('userCollections');
			const results = userCollections.by('id', colId);
			let ids = [];
			if (folderId) {
				let item = findItem(results, folderId);
				if (item) {
					ids = getAllIds(item, []);
					item.data.length = 0;
				}
			} else {
				ids = getAllIds(results, []);
				results.data.length = 0;
			}

			db.saveDatabase();
			DeleteExitingItems(ids);
			webviewView.webview.postMessage({ type: responseTypes.clearResponse, id: colId, folderId: folderId });
		});

	} catch (err) {
		writeLog("error::DeleteAllCollectionItems(): " + err);
	}
}

export function AttachVariable(colId: string, varId: string, webview: vscode.Webview, sideBarView: vscode.WebviewView) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			db.getCollection('userCollections').findAndUpdate({ 'id': colId }, item => { item.variableId = varId; });
			db.saveDatabase();

			if (webview) {
				webview.postMessage({ type: responseTypes.attachVariableResponse });
			}

			if (sideBarView) {
				sideBarView.webview.postMessage({ type: responseTypes.attachVariableResponse, params: { id: colId, varId: varId } });
			}

			if (pubSub.size > 0) {
				pubSub.publish({ messageType: varId === "" ? pubSubTypes.removeCurrentVariable : pubSubTypes.addCurrentVariable, message: varId });
			}
		});

	} catch (err) {
		writeLog("error::AttachVariable(): " + err);
	}
}

export function RemoveVariableByVariableId(varId: string, sideBarView: vscode.WebviewView) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			db.getCollection('userCollections').findAndUpdate({ 'variableId': varId }, item => { item.variableId = ""; });
			db.saveDatabase();

			if (sideBarView) {
				const userCollections = db.getCollection('userCollections').data;
				sideBarView.webview.postMessage({ type: responseTypes.getAllCollectionsResponse, collections: userCollections });
			}
		});

	} catch (err) {
		writeLog("error::AttachVariable(): " + err);
	}
}

export function GetCollectionsByVariable(varId: string, webview: vscode.Webview) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const cols = db.getCollection('userCollections').chain().find({ 'variableId': varId }).data();
			let colNames = [];
			if (cols && cols.length > 0) {
				colNames = cols.map((item) => { return item.name; });
			}
			webview.postMessage({ type: responseTypes.getAttachedColIdsResponse, colNames: colNames });
		});

	} catch (err) {
		writeLog("error::GetCollectionsByVariable(): " + err);
	}
}

export function RemoveVariable(varId: string) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			db.getCollection('userCollections').findAndUpdate({ 'variableId': varId }, item => { item.variableId = ""; });
			db.saveDatabase();
		});

	} catch (err) {
		writeLog("error::RemoveVariable(): " + err);
	}
}

export function GetAllCollectionsById(colId: string, folderId: string, type: string, webview: vscode.Webview) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			let ids = [];
			let paths: any;
			let settings: ISettings;

			let colItem = db.getCollection('userCollections').by('id', colId);
			if (type === "col") {
				({ paths, ids } = getPath(colItem, "", {}, [], "source"));
			} else {
				let item = findItem(colItem, folderId);
				({ paths, ids } = getPath(item, "", {}, [], "source"));
			}
			ids = ids.reverse();
			GetColsRequests(ids, paths, webview);

			if (colItem) {
				if (folderId) {
					settings = findParentSettings(colItem, folderId);
					if (!settings) {
						settings = JSON.parse(JSON.stringify(InitialSettings)) as ISettings;
					}
				} else {
					settings = colItem.settings ? colItem.settings : JSON.parse(JSON.stringify(InitialSettings));;
				}

				if (webview) {
					webview.postMessage({ type: responseTypes.getParentSettingsResponse, settings: settings });
				}
			}
		});

	} catch (err) {
		writeLog("error::GetAllCollectionsById(): " + err);
	}
}

export function GetAllCollectionsByIdWithPath(colId: string, webview: vscode.Webview) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			let results = db.getCollection('userCollections').by('id', colId);
			const { paths } = getPath(results, "", {}, [], "request");
			if (webview) {
				webview.postMessage({ type: responseTypes.getCollectionsByIdWithPathResponse, colId: colId, paths: paths });
			}
		});

	} catch (err) {
		writeLog("error::GetAllCollectionsByIdWithPath(): " + err);
	}
}

function getPath(source: any, path: string, paths: {}, ids: string[], type: string) {

	let folders = source.data.filter(item => item.data !== undefined);

	if (folders.length === 0) {
		source.data.forEach(item => {
			paths[item.id] = path ? path + " > " + source.name + (type === "source" ? ";" + source.id : " > " + item.name + ";" + source.id) : source.name + (type === "source" ? ";" + source.id : " > " + item.name + ";" + source.id);
			ids.unshift(item.id);
		});

		return { paths, ids };
	} else {
		source.data.filter(i => i.data === undefined).forEach(item => {
			paths[item.id] = path ? path + " > " + source.name + (type === "source" ? ";" + source.id : " > " + item.name + ";" + source.id) : source.name + (type === "source" ? ";" + source.id : " > " + item.name + ";" + source.id);
			ids.unshift(item.id);
		});
	}

	path = path ? path + " > " + source.name : source.name;

	for (let i = 0; i < folders.length; i++) {
		const result = getPath(folders[i], path, paths, ids, type);
		if (i === folders.length - 1) {
			return result;
		}
	}
}

export function GetVariableByColId(colId: string) {
	try {
		return new Promise<string>((resolve, _reject) => {
			const db = getDB();

			db.loadDatabase({}, function (err: any) {
				if (err) {
					resolve(null);
				}
				const colItem = db.getCollection('userCollections').by("id", colId);
				resolve(colItem ? colItem.variableId : "");
			});
		});
	} catch (err) {
		writeLog("error::GetVariableByColId(): " + err);
		throw err;
	}
}

export function NewFolderToCollection(item: IFolder, colId: string, folderId: string, sideBarView: vscode.WebviewView) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const colItem = db.getCollection('userCollections').by("id", colId);
			if (folderId) {
				let folder = findItem(colItem, folderId);
				if (folder) {
					folder.data.push(item);
				}
			} else {
				colItem.data.push(item);
			}
			db.saveDatabase();

			if (sideBarView) {
				sideBarView.webview.postMessage({ type: responseTypes.createNewFolderResponse, folder: item, colId: colId, folderId: folderId });
			}
		});
	} catch (err) {
		writeLog("error::NewFolderToCollection(): " + err);
	}
}

export function UpdateCollection(colId: string, item: IHistory) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const colItem = db.getCollection('userCollections').by("id", colId);
			let req = findItem(colItem, item.id);
			if (req) {
				req.name = item.name;
				req.method = item.method;
				req.url = item.url;
			}
			db.saveDatabase();
		});
	} catch (err) {
		writeLog("error::UpdateCollection(): " + err);
	}
}

export function GetCollectionSettings(webview: vscode.Webview, colId: string, folderId: string) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			let settings: any;

			const colItem = db.getCollection('userCollections').by("id", colId);

			if (colItem) {
				if (folderId) {
					let folderItem = findItem(colItem, folderId);
					if (folderItem) {
						settings = folderItem.settings ? folderItem.settings : JSON.parse(JSON.stringify(InitialSettings));
					}
				} else {
					settings = colItem.settings ? colItem.settings : JSON.parse(JSON.stringify(InitialSettings));
				}

				if (webview) {
					webview.postMessage({ type: responseTypes.getColSettingsResponse, data: { settings: settings, type: folderId ? SettingsType.Folder : SettingsType.Collection, variableId: colItem.variableId } });
				}
			}
		});
	}
	catch (err) {
		writeLog("error::GetCollectionSettings(): " + err);
	}
}

export function GetParentSettings(colId: string, folderId: string, webview: vscode.Webview) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			let settings: ISettings;

			const colItem = db.getCollection('userCollections').by("id", colId);

			if (colItem) {
				if (folderId) {
					settings = findParentSettings(colItem, folderId);
					if (!settings) {
						settings = JSON.parse(JSON.stringify(InitialSettings)) as ISettings;
					}
				} else {
					settings = colItem.settings ? colItem.settings : JSON.parse(JSON.stringify(InitialSettings));;
				}

				if (webview) {
					webview.postMessage({ type: responseTypes.getParentSettingsResponse, settings: settings });
				}
			}
		});
	}
	catch (err) {
		writeLog("error::GetParentSettings(): " + err);
	}
}

export function GetParentSettingsSync(colId: string, folderId: string) {
	try {
		return new Promise<ISettings>((resolve, _reject) => {
			const db = getDB();

			db.loadDatabase({}, function (err: any) {

				if (err) {
					resolve(null);
				}


				let settings: any;
				const colItem = db.getCollection('userCollections').by("id", colId);

				if (colItem) {
					if (folderId) {
						settings = findParentSettings(colItem, folderId);
						if (!settings) {
							settings = JSON.parse(JSON.stringify(InitialSettings));
						}
					} else {
						settings = colItem.settings ? colItem.settings : JSON.parse(JSON.stringify(InitialSettings));;
					}
				}

				resolve(settings ? settings as ISettings : null);
			});
		});
	}
	catch (err) {
		writeLog("error::GetParentSettingsSync(): " + err);
		throw err;
	}
}


export function ExecuteRequest(reqData: any, fetchConfig: FetchConfig, webview: vscode.Webview) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			let settings: any;

			const colItem = db.getCollection('userCollections').by("id", reqData.data.colId);

			if (colItem) {
				if (reqData.data.folderId) {
					settings = findParentSettings(colItem, reqData.data.folderId);
					if (!settings) {
						settings = JSON.parse(JSON.stringify(InitialSettings));
					}
				} else {
					settings = colItem.settings ? colItem.settings : JSON.parse(JSON.stringify(InitialSettings));;
				}

				apiFetch(reqData.data.reqData, reqData.data.variableData, settings, null, fetchConfig).then((data) => {
					webview.postMessage(data);
				});
			}
		});
	}
	catch (err) {
		writeLog("error::ExecuteRequest(): " + err);
	}
}

export function ExecuteMultipleRequest(reqData: any, fetchConfig: FetchConfig, webview: vscode.Webview) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			let settings: any;
			let requests: any[] = [];

			const colItem = db.getCollection('userCollections').by("id", reqData.data.colId);

			reqData.data.reqData.forEach(item => {
				if (item.auth.authType === "inherit") {

					if (colItem) {
						let id = item.data.itemPaths[item.id].split(";")[1];
						if (id === item.data.colId) {
							id = "";
						}

						if (id) {
							settings = findParentSettings(colItem, id);
							if (!settings) {
								settings = JSON.parse(JSON.stringify(InitialSettings));
							}
						} else {
							settings = colItem.settings ? colItem.settings : JSON.parse(JSON.stringify(InitialSettings));;
						}

						requests.push(apiFetch(item, reqData.data.variableData, settings, null, fetchConfig));
					}
				} else {
					requests.push(apiFetch(item, reqData.data.variableData, null, null, fetchConfig));
				}
			});

			if (requests.length > 0) {
				Promise.allSettled(requests).then((values) => {
					webview.postMessage({ type: responseTypes.multipleApiResponse, output: values });
				});
			}
		});
	}
	catch (err) {
		writeLog("error::ExecuteMultipleRequest(): " + err);
	}
}

export function SaveCollectionSettings(webview: vscode.Webview, colId: string, folderId: string, settings: ISettings) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const colItem = db.getCollection('userCollections').by("id", colId);

			if (colItem) {
				if (folderId) {
					let folderItem = findItem(colItem, folderId);
					if (folderItem) {
						folderItem.settings = settings;
					}
				} else {
					colItem.settings = settings;
				}

				db.saveDatabase();
			}

			if (webview) {
				webview.postMessage({ type: responseTypes.saveColSettingsResponse, colId: colId, folderId: folderId });
			}
		});
	}
	catch (err) {
		writeLog("error::SaveCollectionSettings(): " + err);
	}
}
