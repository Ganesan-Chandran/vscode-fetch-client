import fs from "fs";
import loki, { LokiFsAdapter } from "lokijs";
import * as vscode from "vscode";
import { IRequestModel } from '../../fetch-client-ui/components/RequestUI/redux/types';
import { InitialSettings } from '../../fetch-client-ui/components/SideBar/redux/reducer';
import { ICollections, IFolder } from '../../fetch-client-ui/components/SideBar/redux/types';
import { isFolder } from '../../fetch-client-ui/components/SideBar/util';
import { isJson } from '../../fetch-client-ui/components/TestUI/TestPanel/helper';
import { responseTypes } from '../configuration';
import { formatDate } from '../helper';
import { fetchClientImporter } from '../importers/fetchClient/fetchClientImporter_1_0';
import { postmanImporter } from '../importers/postman/postmanImporter_2_1';
import { POSTMAN_SCHEMA_V2_1, PostmanSchema_2_1 } from '../importers/postman/postman_2_1.types';
import { thunderClientImporter } from "../importers/thunderClient/thunderClientImporter_1_2";
import { ThunderClient_Schema_1_2 } from "../importers/thunderClient/thunderClient_1_2_types";
import { writeLog } from '../logger/logger';
import { FetchClientDataProxy } from '../validators/fetchClientCollectionValidator';
import { ImportType } from "./constants";
import { collectionDBPath, mainDBPath, variableDBPath } from "./dbPaths";

function getDB(): loki {
	const idbAdapter = new LokiFsAdapter();
	const db = new loki(mainDBPath(), { adapter: idbAdapter });
	db.autosaveDisable();
	return db;
}

function getCollectionDB(): loki {
	const idbAdapter = new LokiFsAdapter();
	const db = new loki(collectionDBPath(), { adapter: idbAdapter });
	db.autosaveDisable();
	return db;
}

function getVariableDB(): loki {
	const idbAdapter = new LokiFsAdapter();
	const db = new loki(variableDBPath(), { adapter: idbAdapter });
	db.autosaveDisable();
	return db;
}

export function SaveRequest(reqData: IRequestModel) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const apiRequests = db.getCollection("apiRequests");
			apiRequests.insert(reqData);
			db.saveDatabase();
		});

	} catch (err) {
		writeLog("error::SaveRequest(): " + err);
	}
}

export function UpdateRequest(reqData: IRequestModel) {
	try {
		const db = getDB();
		db.loadDatabase({}, function () {
			const apiRequests = db.getCollection("apiRequests");
			var req = apiRequests.findOne({ 'id': reqData.id });
			req.url = reqData.url;
			req.name = reqData.name;
			req.method = reqData.method;
			req.params = reqData.params;
			req.auth = reqData.auth;
			req.headers = reqData.headers;
			req.body = reqData.body;
			req.tests = reqData.tests;
			req.setvar = reqData.setvar;
			req.notes = reqData.notes;
			req.preFetch = reqData.preFetch;
			apiRequests.update(req);
			db.saveDatabase();
		});

	} catch (err) {
		writeLog("error::UpdateRequest(): " + err);
		throw err;
	}
}

export function GetRequestItem(reqId: string) {
	try {
		return new Promise<IRequestModel>((resolve, _reject) => {
			const db = getDB();
			db.loadDatabase({}, function (err: any) {
				if (err) {
					resolve(null);
				}
				const results = db.getCollection("apiRequests").chain().find({ 'id': reqId }).data();
				resolve(results && results.length > 0 ? results[0] as IRequestModel : null);
			});
		});
	} catch (err) {
		writeLog("error::GetRequestItem(): " + err);
		throw err;
	}
}

export function GetExitingItem(webview: vscode.Webview, id: string, callback: any = null, type: string = null) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const results = db.getCollection("apiRequests").chain().find({ 'id': id }).data();
			if (webview) {
				webview.postMessage({ type: type === "OpenAndRun" ? responseTypes.getOpenAndRunItemDataResponse : responseTypes.openExistingItemResponse, item: results });
			}

			if (callback) {
				callback(results);
			}
		});

	} catch (err) {
		writeLog("error::GetExitingItem(): " + err);
	}
}

export function CopyExitingItems(oldIds: string[], ids: any) {
	try {

		if (oldIds.length === 0) {
			return;
		}

		const db = getDB();

		db.loadDatabase({}, function () {
			let apiRequests = db.getCollection("apiRequests");
			const results = apiRequests.chain().find({ 'id': { '$in': oldIds } }).data({ forceClones: true, removeMeta: true });

			if (results && results.length > 0) {
				results.forEach(item => {
					item.id = ids[item.id];
					item.name = item.name + " (Copy)";
				});

				apiRequests.insert(results);
				db.saveDatabase();
			}
		});

	} catch (err) {
		writeLog("error::CopyExitingItems(): " + err);
	}
}

export function DeleteExitingItem(id: string) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			db.getCollection("apiRequests").findAndRemove({ 'id': id });
			db.saveDatabase();
		});

	} catch (err) {
		writeLog("error::DeleteExitingItem(): " + err);
	}
}

export function DeleteExitingItems(ids: string[]) {
	try {

		if (ids.length === 0) {
			return;
		}

		const db = getDB();

		db.loadDatabase({}, function () {
			db.getCollection("apiRequests").findAndRemove({ 'id': { '$in': ids } });
			db.saveDatabase();
		});

	} catch (err) {
		writeLog("error::DeleteExitingItems(): " + err);
	}
}

function findItem(source: any, Id: string) {
	let pos = source.data.findIndex((el: any) => el.id === Id);

	if (pos !== -1) {
		return source.data[pos];
	}

	for (let i = 0; i < source.data.length; i++) {
		if (isFolder(source.data[i])) {
			return findItem(source.data[i], Id);
		}
	}

	return "";
}

function ExportItemFromFolder(source: any, apiRequests: any, exportData: any[], isSub: boolean, level: number): any {
	let totalResults = [];

	source.data.filter(item => item.data !== undefined).forEach((item) => {
		let currentResults = ExportItemFromFolder(item, apiRequests, [exportData], true, level + 1);
		totalResults.push(currentResults);
	});

	const ids = source.data.filter(item => item.data === undefined).map(itm => itm.id);
	let results = apiRequests.chain().find({ 'id': { '$in': ids } }).data({ forceClones: true, removeMeta: true });

	if (isSub) {
		source.data = totalResults.length > 0 ? [...totalResults, ...results] : results;
	} else {
		exportData = [...totalResults, ...results];
		return exportData;
	}

	return source;
}

export function BulkExport(path: string, selectedCols: string[], webview: vscode.Webview) {
	try {
		const colDB = getCollectionDB();

		colDB.loadDatabase({}, function () {

			selectedCols?.forEach(async (item: string) => {

				const cols = colDB.getCollection('userCollections').chain().find({ "id": item }).data({ forceClones: true, removeMeta: true });

				const apiRequests = await GetAPIRequestSync();

				let exportData = ExportCollection(cols, apiRequests, "", "");

				let fullPath = path + "\\" + "fetch-client-collection_" + exportData.name.replace(/[/\\?%*:|"<>]/g, '-') + ".json";

				fs.writeFile(fullPath, JSON.stringify(exportData), (error) => {
					if (error) {
						vscode.window.showErrorMessage("Could not save to '" + path + "'. Error Message : " + error.message, { modal: true });
						writeLog("error::BulkExport()::FileWrite()" + error.message);
					}
				});
			});

			webview?.postMessage({ type: responseTypes.bulkColExportResponse });
		});

	} catch (err) {
		writeLog("error::BulkExport(): " + err);
	}
}

function GetAPIRequestSync() {
	return new Promise<Collection<any>>((resolve, _reject) => {
		const db = getDB();

		db.loadDatabase({}, function (err: any) {
			if (err) {
				resolve(null);
			}
			const apiRequests = db.getCollection("apiRequests");
			resolve(apiRequests ? apiRequests : null);
		});
	});
}

export function Export(path: string, colId: string, hisId: string, folderId: string) {
	try {
		const db = getDB();
		const colDB = getCollectionDB();

		colDB.loadDatabase({}, function () {
			const cols = colDB.getCollection('userCollections').chain().find({ "id": colId }).data({ forceClones: true, removeMeta: true });

			db.loadDatabase({}, function () {
				const apiRequests = db.getCollection("apiRequests");

				let exportData = ExportCollection(cols, apiRequests, hisId, folderId);

				fs.writeFile(path, JSON.stringify(exportData), (error) => {
					if (error) {
						vscode.window.showErrorMessage("Could not save to '" + path + "'. Error Message : " + error.message, { modal: true });
						writeLog("error::Export()::FileWrite()" + error.message);
					} else {
						vscode.window.showInformationMessage("Successfully saved to '" + path + "'.", { modal: true });
					}
				});
			});
		});

	} catch (err) {
		writeLog("error::Export(): " + err);
	}
}

function ExportCollection(cols: any[], apiRequests: Collection<any>, hisId: string, folderId: string): any {
	let exportData = {
		app: "Fetch Client",
		id: cols[0].id,
		name: cols[0].name.toUpperCase().trim() === "DEFAULT" ? "Default Export" : cols[0].name,
		version: "1.0",
		type: "collections",
		createdTime: cols[0].createdTime,
		exportedDate: formatDate(),
		data: [],
		settings: cols[0].settings ? cols[0].settings : JSON.parse(JSON.stringify(InitialSettings))
	};

	if (hisId) {
		if (folderId) {
			let item = findItem(cols[0], folderId);
			let results = apiRequests.chain().find({ 'id': { '$in': [hisId] } }).data({ forceClones: true, removeMeta: true });
			(item as IFolder).data = results;
			exportData.data.push(item);
		} else {
			let results = apiRequests.chain().find({ 'id': { '$in': [hisId] } }).data({ forceClones: true, removeMeta: true });
			exportData.data.push(results[0]);
		}
	} else {
		if (folderId) {
			let folder = findItem(cols[0], folderId);
			let results = ExportItemFromFolder(folder, apiRequests, [], false, 0);
			if (results) {
				(folder as IFolder).data = results;
				exportData.data.push(folder);
			}
		} else {
			let results = ExportItemFromFolder(cols[0], apiRequests, [], false, 0);
			if (results) {
				exportData.data = results;
			}
		}
	}

	return exportData;
}

export function RenameRequestItem(id: string, name: string) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			let req = db.getCollection("apiRequests").find({ 'id': id });
			if (req && req.length > 0) {
				req[0].name = name;
				db.saveDatabase();
			}
		});

	} catch (err) {
		writeLog("error::RenameRequestItem(): " + err);
	}
}

function ValidateData(data: string): ImportType | null {
	try {
		if (!data || data.length === 0 || !isJson(data)) {
			vscode.window.showErrorMessage("Could not import the collection - Empty Data.", { modal: true });
			writeLog("error::Import::ValidateData() " + "Error Message : Could not import the collection - Empty Data.");
			return null;
		}

		try {
			FetchClientDataProxy.Parse(data);
			return ImportType.FetchClient_1_0;
		} catch (err) {
			writeLog("error::Import::ValidateData() " + err);
			let postmanData = JSON.parse(data) as PostmanSchema_2_1;
			if (postmanData.info?._postman_id && postmanData.info?.schema === POSTMAN_SCHEMA_V2_1) {
				return ImportType.Postman_2_1;
			}

			let thunderClientData = JSON.parse(data) as ThunderClient_Schema_1_2;
			if (thunderClientData.clientName = "Thunder Client") {
				if (thunderClientData.version !== "1.2") {
					vscode.window.showErrorMessage("Could not import the collection - Invalid thunder client version.", { modal: true });
					return null;
				}
				return ImportType.ThunderClient_1_2;
			}

			return null;
		}
	}
	catch (err) {
		vscode.window.showErrorMessage("Could not import the collection - Invalid Data.", { modal: true });
		writeLog("error::Import::ValidateData() " + "Error Message : Could not import the collection - " + err);
		return null;
	}
}

function insertCollections(colDB: loki, webviewView: vscode.WebviewView, fcCollection: ICollections) {
	colDB.loadDatabase({}, function () {
		const userCollections = colDB.getCollection('userCollections');
		userCollections.insert(fcCollection);
		colDB.saveDatabase();
		webviewView.webview.postMessage({ type: responseTypes.importResponse, data: fcCollection });
	});
}

export function Import(webviewView: vscode.WebviewView, path: string) {
	try {
		const data = fs.readFileSync(path, "utf8");
		var type = ValidateData(data);
		switch (type) {
			case ImportType.FetchClient_1_0:
				ImportFC(webviewView, data);
				break;
			case ImportType.Postman_2_1:
				ImportPostman(webviewView, data);
				break;
			case ImportType.ThunderClient_1_2:
				ImportThunderClient(webviewView, data);
				break;
			default:
				vscode.window.showErrorMessage("Could not import the collection - Invalid data.", { modal: true });
		}

	} catch (err) {
		vscode.window.showErrorMessage("Could not import the collection - Invalid data.", { modal: true });
		writeLog("error::Import(): - Error Message : " + err);
	}
}

function ImportPostman(webviewView: vscode.WebviewView, data: string) {
	try {
		const convertedData = postmanImporter(data);
		if (!convertedData || !convertedData.fcCollection || !convertedData.fcRequests) {
			return;
		}

		const db = getDB();
		const colDB = getCollectionDB();
		const varDB = getVariableDB();

		db.loadDatabase({}, function () {
			const apiRequests = db.getCollection("apiRequests");
			apiRequests.insert(convertedData.fcRequests);
			db.saveDatabase();

			if (convertedData.fcVariable) {
				varDB.loadDatabase({}, function () {
					const userVariables = varDB.getCollection('userVariables');
					userVariables.insert(convertedData.fcVariable);
					varDB.saveDatabase();
					webviewView.webview.postMessage({ type: responseTypes.importVariableResponse, vars: convertedData.fcVariable });
					insertCollections(colDB, webviewView, convertedData.fcCollection);
				});
			} else {
				insertCollections(colDB, webviewView, convertedData.fcCollection);
			}
		});
	} catch (err) {
		vscode.window.showErrorMessage("Could not import the collection - Invalid data.", { modal: true });
		writeLog("error::ImportPostman(): - Error Message : " + err);
	}
}

function ImportThunderClient(webviewView: vscode.WebviewView, data: string) {
	try {
		const convertedData = thunderClientImporter(data);
		if (!convertedData || !convertedData.fcCollection || !convertedData.fcRequests) {
			return;
		}

		const db = getDB();
		const colDB = getCollectionDB();

		db.loadDatabase({}, function () {
			const apiRequests = db.getCollection("apiRequests");
			apiRequests.insert(convertedData.fcRequests);
			db.saveDatabase();

			insertCollections(colDB, webviewView, convertedData.fcCollection);
		});
	} catch (err) {
		vscode.window.showErrorMessage("Could not import the collection - Invalid data.", { modal: true });
		writeLog("error::ImportThunderClient(): - Error Message : " + err);
	}
}

function ImportFC(webviewView: vscode.WebviewView, data: string) {
	try {
		const parsedData = JSON.parse(data);

		const convertedData = fetchClientImporter(parsedData);
		if (!convertedData || !convertedData.fcCollection || !convertedData.fcRequests) {
			return;
		}

		const db = getDB();
		const colDB = getCollectionDB();

		db.loadDatabase({}, function () {
			const apiRequests = db.getCollection("apiRequests");
			apiRequests.insert(convertedData.fcRequests);
			db.saveDatabase();

			colDB.loadDatabase({}, function () {
				const userCollections = colDB.getCollection("userCollections");
				userCollections.insert(convertedData.fcCollection);
				colDB.saveDatabase();

				webviewView.webview.postMessage({ type: responseTypes.importResponse, data: convertedData.fcCollection });
			});
		});

	} catch (err) {
		vscode.window.showErrorMessage("Could not import the collection - Invalid data.", { modal: true });
		writeLog("error::ImportFC(): - Error Message : " + err);
	}
}

export function GetColsRequests(ids: string[], paths: any, webview: vscode.Webview) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const apiRequests = db.getCollection("apiRequests").find({ 'id': { '$in': ids } });
			webview.postMessage({ type: responseTypes.getCollectionsByIdResponse, collections: apiRequests, paths: paths });
		});

	} catch (err) {
		writeLog("error::GetColsRequests(): " + err);
	}
}
