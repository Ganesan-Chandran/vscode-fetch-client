import loki, { LokiFsAdapter } from 'lokijs';
import * as vscode from 'vscode';
import { IAutoRequest } from '../../fetch-client-ui/components/AutoRequest/types';
import { FCScheduler } from '../autoRequest/scheduler';
import { responseTypes } from '../configuration';
import { writeLog } from '../logger/logger';
import { autoRequestDBPath } from './dbPaths';

function getDB(): loki {
	const idbAdapter = new LokiFsAdapter();
	const db = new loki(autoRequestDBPath(), { adapter: idbAdapter });
	return db;
}

export function SaveAutoRequest(requests: IAutoRequest[]) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const autoRequests = db.getCollection('autoRequests');
			requests.forEach(item => {
				if (item.colId && item.reqId) {
					let autoRequest = autoRequests.find({ id: item.id });
					if (autoRequest === null || autoRequest?.length === 0) {
						autoRequests.insert(item);
					} else {
						autoRequest[0].id = item.id;
						autoRequest[0].colId = item.colId;
						autoRequest[0].reqId = item.reqId;
						autoRequest[0].parentId = item.parentId;
						autoRequest[0].interval = item.interval;
						autoRequest[0].duration = item.duration;
						autoRequest[0].status = item.status;
						autoRequest[0].cron = item.cron;
						autoRequest[0].createdTime = item.createdTime;
					}
				}
			});

			let scheduler = FCScheduler.Instance;
			scheduler.CreateJobs(requests, true);

			let extraRequest: IAutoRequest[] = autoRequests.data.filter(entry1 => !requests.some(entry2 => entry1.id === entry2.id));
			extraRequest.forEach(item => {
				autoRequests.findAndRemove({ 'id': item.id });
				scheduler.RemoveJob(item);
			});

			db.saveDatabase();
			vscode.window.showInformationMessage("Successfully enabled the auto requests", { modal: true });
		});

	} catch (err) {
		writeLog("error::SaveAutoRequest(): " + err);
	}
}

export function GetAllAutoRequest(webview: vscode.Webview) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const autoRequests = db.getCollection('autoRequests').data;
			webview.postMessage({ type: responseTypes.getAllAutoRequestResponse, autoRequests: autoRequests });
		});

	} catch (err) {
		writeLog("error::GetAllAutoRequest(): " + err);
	}
}

export function GetAutoRequestById(id: string, webview: vscode.Webview) {
	try {
		const db = getDB();

		db.loadDatabase({}, function () {
			const autoRequests = db.getCollection('autoRequests').find({ 'id': id });
			db.saveDatabase();
			if (webview) {
				webview.postMessage({ type: responseTypes.getAutoRequestByIdResponse, data: autoRequests });
			}
		});

	} catch (err) {
		writeLog("error::GetAutoRequestById(): " + err);
	}
}
