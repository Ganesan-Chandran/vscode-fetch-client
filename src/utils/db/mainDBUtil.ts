import { createAutoDBCache } from "./dbManager";
import { FetchClientDataProxy } from '../validators/fetchClientCollectionValidator';
import { fetchClientImporter } from '../importers/fetchClient/fetchClientImporter_1_0';
import { formatDate } from '../helper';
import { getCollectionDB, saveCollectionDB } from "./collectionDBUtil";
import { getVariableDB } from "./varDBUtil";
import { IFolder, ICollections } from "../../fetch-client-core/types/sidebar.types";
import { ImportType } from "../../fetch-client-core/consts/import.consts";
import { InitialSettings } from '../../fetch-client-ui/components/SideBar/redux/reducer';
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { isFolder } from '../../fetch-client-ui/components/SideBar/util';
import { isJson } from '../../fetch-client-ui/components/TestUI/TestPanel/helper';
import { mainDBPath } from "./helper";
import { POSTMAN_SCHEMA_V2_1, PostmanSchema_2_1 } from '../../fetch-client-core/types/postman_2_1.types';
import { postmanImporter } from '../importers/postman/postmanImporter_2_1';
import { responseTypes } from '../../fetch-client-core/consts/requestTypes.consts';
import { ThunderClient_Schema_1_2 } from "../../fetch-client-core/types/thunderClient_1_2_types";
import { thunderClientImporter } from "../importers/thunderClient/thunderClientImporter_1_2";
import { writeLog } from '../logger/logger';
import * as vscode from "vscode";
import fs from "fs";
import loki, { Collection } from "lokijs";

const { getLoadedDB: getMainDB, saveDB: saveMainDB, flush: flushMainDB, invalidate: invalidateMainDB } = createAutoDBCache(mainDBPath);
export { getMainDB, saveMainDB, flushMainDB, invalidateMainDB };

function getRequestCollection(db: loki): Collection<IRequestModel> {
	return db.getCollection("apiRequests");
}

export async function SaveRequest(reqData: IRequestModel): Promise<void> {
	try {
		const db = await getMainDB();
		getRequestCollection(db).insert(reqData);
		saveMainDB(db);
	} catch (err) {
		writeLog("error::SaveRequest(): " + err);
	}
}

export async function UpdateRequest(reqData: IRequestModel): Promise<void> {
	try {
		const db = await getMainDB();
		const collection = getRequestCollection(db);
		const req = collection.findOne({ id: reqData.id });

		if (!req) {
			writeLog("error::UpdateRequest(): record not found - id=" + reqData.id);
			return;
		}

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

		collection.update(req);
		saveMainDB(db);
	} catch (err) {
		writeLog("error::UpdateRequest(): " + err);
		throw err;
	}
}

export async function GetRequestItem(reqId: string): Promise<IRequestModel | null> {
	try {
		const db = await getMainDB();
		const results = getRequestCollection(db)
			.chain()
			.find({ id: reqId })
			.data({ forceClones: true, removeMeta: true });

		return results.length > 0 ? (results[0] as IRequestModel) : null;
	} catch (err) {
		writeLog("error::GetRequestItem(): " + err);
		throw err;
	}
}

export async function GetExitingItem(
	webview: vscode.Webview,
	id: string,
	callback?: (results: IRequestModel[]) => void,
	type?: string
): Promise<void> {
	try {
		const db = await getMainDB();
		const results = getRequestCollection(db)
			.chain()
			.find({ id })
			.data({ forceClones: true, removeMeta: true }) as IRequestModel[];

		const msgType =
			type === "OpenAndRun"
				? responseTypes.getOpenAndRunItemDataResponse
				: responseTypes.openExistingItemResponse;

		webview?.postMessage({ type: msgType, item: results });
		callback?.(results);
	} catch (err) {
		writeLog("error::GetExitingItem(): " + err);
	}
}

export async function CopyExitingItems(oldIds: string[], ids: Record<string, string>): Promise<void> {
	if (oldIds.length === 0) {
		return;
	}

	try {
		const db = await getMainDB();
		const collection = getRequestCollection(db);
		const clones = collection
			.chain()
			.find({ id: { $in: oldIds } })
			.data({ forceClones: true, removeMeta: true });

		if (clones.length === 0) {
			return;
		}

		clones.forEach(item => {
			item.id = ids[item.id];
			item.name = item.name + " (Copy)";
		});

		collection.insert(clones);
		saveMainDB(db);
	} catch (err) {
		writeLog("error::CopyExitingItems(): " + err);
	}
}

export async function DeleteExitingItem(id: string): Promise<void> {
	try {
		const db = await getMainDB();
		getRequestCollection(db).findAndRemove({ id });
		saveMainDB(db);
	} catch (err) {
		writeLog("error::DeleteExitingItem(): " + err);
	}
}

export async function DeleteExitingItems(ids: string[]): Promise<void> {
	if (ids.length === 0) {
		return;
	}

	try {
		const db = await getMainDB();
		getRequestCollection(db).findAndRemove({ id: { $in: ids } });
		saveMainDB(db);
	} catch (err) {
		writeLog("error::DeleteExitingItems(): " + err);
	}
}

export async function RenameRequestItem(id: string, name: string): Promise<void> {
	try {
		const db = await getMainDB();
		const collection = getRequestCollection(db);
		const req = collection.findOne({ id });

		if (!req) {
			return;
		}

		req.name = name;
		collection.update(req);
		saveMainDB(db);
	} catch (err) {
		writeLog("error::RenameRequestItem(): " + err);
	}
}

export async function GetColsRequests(
	ids: string[],
	paths: unknown,
	webview: vscode.Webview
): Promise<void> {
	try {
		const db = await getMainDB();
		const apiRequests = getRequestCollection(db)
			.chain()
			.find({ id: { $in: ids } })
			.data({ forceClones: true, removeMeta: true });

		webview?.postMessage({
			type: responseTypes.getCollectionsByIdResponse,
			collections: apiRequests,
			paths,
		});
	} catch (err) {
		writeLog("error::GetColsRequests(): " + err);
	}
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

function ExportItemFromFolder(
	source: { data: any[] },
	apiRequests: Collection<any>,
	isSub: boolean
): any {
	const subFolders: any[] = [];
	const leafIds: string[] = [];

	for (const item of source.data) {
		if (item.data !== undefined) {
			subFolders.push(ExportItemFromFolder(item, apiRequests, true));
		} else {
			leafIds.push(item.id);
		}
	}

	const leafRequests = apiRequests
		.chain()
		.find({ id: { $in: leafIds } })
		.data({ removeMeta: true });

	const merged = [...subFolders, ...leafRequests];

	if (isSub) {
		source.data = merged;
		return source;
	}

	return merged;
}

function buildExportPayload(
	cols: any[],
	apiRequests: Collection<any>,
	hisId: string,
	folderId: string
): any {
	const col = cols[0];

	const exportData: any = {
		app: "Fetch Client",
		id: col.id,
		name: col.name.toUpperCase().trim() === "DEFAULT" ? "Default Export" : col.name,
		version: "1.0",
		type: "collections",
		createdTime: col.createdTime,
		exportedDate: formatDate(),
		data: [],
		settings: col.settings ?? JSON.parse(JSON.stringify(InitialSettings)),
	};

	if (hisId) {
		const results = apiRequests
			.chain()
			.find({ id: { $in: [hisId] } })
			.data({ removeMeta: true });

		if (folderId) {
			const folder = findItem(col, folderId);
			(folder as IFolder).data = results;
			exportData.data.push(folder);
		} else {
			exportData.data.push(results[0]);
		}
	} else if (folderId) {
		const folder = findItem(col, folderId);
		const results = ExportItemFromFolder(folder, apiRequests, false);
		if (results) {
			(folder as IFolder).data = results;
			exportData.data.push(folder);
		}
	} else {
		const results = ExportItemFromFolder(col, apiRequests, false);
		if (results) {
			exportData.data = results;
		}
	}

	return exportData;
}

export async function Export(
	path: string,
	colId: string,
	hisId: string,
	folderId: string
): Promise<void> {
	try {
		const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);

		const cols = colDB
			.getCollection('userCollections')
			.chain()
			.find({ id: colId })
			.data({ forceClones: true, removeMeta: true });

		const exportData = buildExportPayload(cols, getRequestCollection(db), hisId, folderId);

		fs.writeFile(path, JSON.stringify(exportData), (error) => {
			if (error) {
				vscode.window.showErrorMessage(
					`Could not save to '${path}'. Error Message : ${error.message}`,
					{ modal: true }
				);
				writeLog("error::Export()::FileWrite() " + error.message);
			} else {
				vscode.window.showInformationMessage(
					`Successfully saved to '${path}'.`,
					{ modal: true }
				);
			}
		});
	} catch (err) {
		writeLog("error::Export(): " + err);
	}
}

export async function BulkExport(
	path: string,
	selectedCols: string[],
	webview: vscode.Webview
): Promise<void> {
	if (!selectedCols?.length) {
		webview?.postMessage({ type: responseTypes.bulkColExportResponse });
		return;
	}

	try {
		const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);
		const apiRequests = getRequestCollection(db);

		const writePromises = selectedCols.map((colId) => {
			const cols = colDB
				.getCollection('userCollections')
				.chain()
				.find({ id: colId })
				.data({ forceClones: true, removeMeta: true });

			const exportData = buildExportPayload(cols, apiRequests, "", "");
			const safeName = exportData.name.replace(/[/\\?%*:|"<>]/g, '-');
			const fullPath = `${path}\\fetch-client-collection_${safeName}.json`;

			return new Promise<void>((resolve) => {
				fs.writeFile(fullPath, JSON.stringify(exportData), (error) => {
					if (error) {
						vscode.window.showErrorMessage(
							`Could not save to '${path}'. Error Message : ${error.message}`,
							{ modal: true }
						);
						writeLog("error::BulkExport()::FileWrite() " + error.message);
					}
					resolve();
				});
			});
		});

		await Promise.all(writePromises);
		webview?.postMessage({ type: responseTypes.bulkColExportResponse });
	} catch (err) {
		writeLog("error::BulkExport(): " + err);
	}
}

function validateImportData(data: string): ImportType | null {
	if (!data || data.length === 0 || !isJson(data)) {
		vscode.window.showErrorMessage(
			"Could not import the collection - Empty Data.",
			{ modal: true }
		);
		writeLog("error::Import::validateImportData() - Empty Data.");
		return null;
	}

	try {
		FetchClientDataProxy.Parse(data);
		return ImportType.FetchClient_1_0;
	} catch (fcErr) {
		writeLog("error::Import::validateImportData() " + fcErr);
	}

	try {
		const postmanData = JSON.parse(data) as PostmanSchema_2_1;
		if (postmanData.info?._postman_id && postmanData.info?.schema === POSTMAN_SCHEMA_V2_1) {
			return ImportType.Postman_2_1;
		}

		const thunderData = JSON.parse(data) as ThunderClient_Schema_1_2;
		if (thunderData.clientName === "Thunder Client") {
			if (thunderData.version !== "1.2") {
				vscode.window.showErrorMessage(
					"Could not import the collection - Invalid thunder client version.",
					{ modal: true }
				);
				return null;
			}
			return ImportType.ThunderClient_1_2;
		}
	} catch (parseErr) {
		vscode.window.showErrorMessage(
			"Could not import the collection - Invalid Data.",
			{ modal: true }
		);
		writeLog("error::Import::validateImportData() - " + parseErr);
	}

	return null;
}

function insertCollectionAndNotify(
	colDB: loki,
	webviewView: vscode.WebviewView,
	fcCollection: ICollections
): void {
	const userCollections = colDB.getCollection('userCollections');
	userCollections.insert(fcCollection);
	saveCollectionDB(colDB);
	webviewView?.webview?.postMessage({ type: responseTypes.importResponse, data: fcCollection });
}

export async function Import(webviewView: vscode.WebviewView, path: string): Promise<void> {
	try {
		const data = fs.readFileSync(path, "utf8");
		const type = validateImportData(data);

		switch (type) {
			case ImportType.FetchClient_1_0:
				await ImportFC(webviewView, data);
				break;
			case ImportType.Postman_2_1:
				await ImportPostman(webviewView, data);
				break;
			case ImportType.ThunderClient_1_2:
				await ImportThunderClient(webviewView, data);
				break;
			default:
				vscode.window.showErrorMessage(
					"Could not import the collection - Invalid data.",
					{ modal: true }
				);
		}
	} catch (err) {
		vscode.window.showErrorMessage(
			"Could not import the collection - Invalid data.",
			{ modal: true }
		);
		writeLog("error::Import() - " + err);
	}
}

async function ImportPostman(webviewView: vscode.WebviewView, data: string): Promise<void> {
	try {
		const convertedData = postmanImporter(data);
		if (!convertedData?.fcCollection || !convertedData?.fcRequests) {
			return;
		}

		const [db, colDB, varDB] = await Promise.all([
			getMainDB(),
			getCollectionDB(),
			getVariableDB(),
		]);

		getRequestCollection(db).insert(convertedData.fcRequests);
		saveMainDB(db);

		if (convertedData.fcVariable) {
			varDB.getCollection('userVariables').insert(convertedData.fcVariable);
			webviewView?.webview?.postMessage({
				type: responseTypes.importVariableResponse,
				vars: convertedData.fcVariable,
			});
		}

		insertCollectionAndNotify(colDB, webviewView, convertedData.fcCollection);
	} catch (err) {
		vscode.window.showErrorMessage(
			"Could not import the collection - Invalid data.",
			{ modal: true }
		);
		writeLog("error::ImportPostman() - " + err);
	}
}

async function ImportThunderClient(webviewView: vscode.WebviewView, data: string): Promise<void> {
	try {
		const convertedData = thunderClientImporter(data);
		if (!convertedData?.fcCollection || !convertedData?.fcRequests) {
			return;
		}

		const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);

		getRequestCollection(db).insert(convertedData.fcRequests);
		saveMainDB(db);

		insertCollectionAndNotify(colDB, webviewView, convertedData.fcCollection);
	} catch (err) {
		vscode.window.showErrorMessage(
			"Could not import the collection - Invalid data.",
			{ modal: true }
		);
		writeLog("error::ImportThunderClient() - " + err);
	}
}

async function ImportFC(webviewView: vscode.WebviewView, data: string): Promise<void> {
	try {
		const parsedData = JSON.parse(data);
		const convertedData = fetchClientImporter(parsedData);
		if (!convertedData?.fcCollection || !convertedData?.fcRequests) {
			return;
		}

		const [db, colDB] = await Promise.all([getMainDB(), getCollectionDB()]);

		getRequestCollection(db).insert(convertedData.fcRequests);
		saveMainDB(db);

		colDB.getCollection('userCollections').insert(convertedData.fcCollection);
		saveCollectionDB(colDB);

		webviewView?.webview?.postMessage({
			type: responseTypes.importResponse,
			data: convertedData.fcCollection,
		});
	} catch (err) {
		vscode.window.showErrorMessage(
			"Could not import the collection - Invalid data.",
			{ modal: true }
		);
		writeLog("error::ImportFC() - " + err);
	}
}