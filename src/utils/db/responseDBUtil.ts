import * as vscode from "vscode";
import loki, { LokiFsAdapter } from "lokijs";
import { writeLog } from '../logger/logger';
import { responseDBPath } from "./helper";
import { IReponseModel } from "../../fetch-client-ui/components/ResponseUI/redux/types";
import { responseTypes } from "../configuration";

function getDB(): loki {
	const idbAdapter = new LokiFsAdapter();
	const db = new loki(responseDBPath(), { adapter: idbAdapter });
	db.autosaveDisable();
	return db;
}

export function SaveResponse(resData: IReponseModel) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const apiResponses = db.getCollection("apiResponses");
			const res = apiResponses.findOne({ 'id': resData.id });
			if (res) {
				res.response = resData.response;
				res.headers = resData.headers;
				res.cookies = resData.cookies;
				apiResponses.update(res);
			} else {
				apiResponses.insert(resData);
			}
			db.saveDatabase();
		});

	} catch (err) {
		writeLog("error::SaveResponse(): " + err);
	}
}

export function GetExitingItemResponse(webview: vscode.Webview, id: string) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const results = db.getCollection("apiResponses")?.find({ 'id': id });
			if (results) {
				webview.postMessage({ type: responseTypes.apiResponse, data: results });
			}
		});

	} catch (err) {
		writeLog("error::GetExitingItemResponse(): " + err);
	}
}
