import { createAutoDBCache } from "./dbManager";
import { DeleteExitingItem, DeleteExitingItems, RenameRequestItem } from './mainDBUtil';
import { getHistoryLimitConfiguration } from '../vscodeConfig';
import { historyDBPath } from "./helper";
import { IHistory } from "../../fetch-client-core/types/sidebar.types";
import { responseTypes } from '../../fetch-client-core/consts/requestTypes.consts';
import { writeLog } from '../logger/logger';
import * as vscode from "vscode";

const { getLoadedDB: getHistoryDB, saveDB, flush: flushHistoryDB, invalidate: invalidateHistoryDB } = createAutoDBCache(historyDBPath);
export { getHistoryDB, flushHistoryDB, invalidateHistoryDB };

export async function SaveHistory(item: IHistory, webviewView: vscode.WebviewView) {
	try {
		const db = await getHistoryDB();
		const userHistory = db.getCollection("userHistory");
		userHistory.insert(item);
		await saveDB(db);
		webviewView.webview.postMessage({ type: responseTypes.newHistoryResponse, history: item });


	} catch (err) {
		writeLog("error::SaveHistory(): " + err);
	}
}

export async function UpdateHistory(item: IHistory) {
	try {
		const db = await getHistoryDB();
		const userHistory = db.getCollection("userHistory");
		var req = userHistory.findOne({ 'id': item.id });
		if (req) {
			req.name = item.name;
			req.method = item.method;
			req.url = item.url;
			req.createdTime = item.createdTime;
			userHistory.update(req);
			await saveDB(db);
		}

	} catch (err) {
		writeLog("error::UpdateHistory(): " + err);
	}
}

export async function GetHistoryById(id: string, webview: vscode.Webview) {
	try {
		const db = await getHistoryDB();
		const userHistory = db.getCollection("userHistory").find({ 'id': id });
		webview.postMessage({ type: responseTypes.getHistoryItemResponse, history: userHistory });

	} catch (err) {
		writeLog("error::GetHistoryById(): " + err);
	}
}

export async function GetAllHistory(webviewView: vscode.WebviewView) {
	try {
		const db = await getHistoryDB();

		let limit = getHistoryLimitConfiguration();
		let userHistory: any;
		let len = db.getCollection("userHistory").find().length;
		switch (limit) {
			case "All":
				userHistory = db.getCollection("userHistory").data.reverse();
				break;
			default:
				let intLimit = parseInt(limit);
				if (len > intLimit) {
					userHistory = db.getCollection("userHistory").chain().offset(len - intLimit).limit(intLimit).data().reverse();
				} else {
					userHistory = db.getCollection("userHistory").chain().limit(intLimit).data().reverse();
				}
				break;
		}
		webviewView.webview.postMessage({ type: responseTypes.getAllHistoryResponse, history: userHistory });

	} catch (err) {
		writeLog("error::GetAllHistory(): " + err);
	}
}

export async function DeleteAllHistory(webviewView: vscode.WebviewView) {
	try {
		const db = await getHistoryDB();
		const userHistory = db.getCollection("userHistory");
		let results = userHistory.chain().data({ forceClones: true, removeMeta: true });

		const ids = results.map(item => item.id);

		userHistory.removeDataOnly();
		await saveDB(db);

		DeleteExitingItems(ids);

		webviewView.webview.postMessage({ type: responseTypes.deleteAllHistoryResponse });

	} catch (err) {
		writeLog("error::DeleteAllHistory(): " + err);
	}
}

export async function DeleteHistory(webviewView: vscode.WebviewView, id: string) {
	try {
		const db = await getHistoryDB();

		db.getCollection("userHistory").findAndRemove({ 'id': id });
		await saveDB(db);
		DeleteExitingItem(id);
		webviewView.webview.postMessage({ type: responseTypes.deleteHistoryResponse, id: id });

	} catch (err) {
		writeLog("error::DeleteHistory(): " + err);
	}
}

export async function RenameHistory(webviewView: vscode.WebviewView, id: string, name: string) {
	try {
		const db = await getHistoryDB();
		db.getCollection("userHistory").findAndUpdate({ 'id': id }, item => { item.name = name; });
		await saveDB(db);
		RenameRequestItem(id, name);
		webviewView.webview.postMessage({ type: responseTypes.renameHistoryResponse, params: { id: id, name: name } });

	} catch (err) {
		writeLog("error::RenameHistory(): " + err);
	}
}
