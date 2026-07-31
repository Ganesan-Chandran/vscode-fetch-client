import { formatDate } from "../../fetch-client-core/helpers/dateTime.helper";
import { IMockServer } from "../../fetch-client-core/types/mockServer.types";
import {
	MockServer_Repository_Delete,
	MockServer_Repository_GetAll,
	MockServer_Repository_GetById,
	MockServer_Repository_Insert,
	MockServer_Repository_Rename,
	MockServer_Repository_Update,
} from "../../fetch-client-core/db/mockServerDB.repository";
import { responseTypes } from "../../fetch-client-core/consts/requestTypes.consts";
import { v4 as uuidv4 } from "uuid";
import { writeLog } from "../../fetch-client-core/helpers/logger/logger";
import * as vscode from "vscode";
import { getRequestLogs, getServerStatus } from "../utils/mockServerRunner";

export async function GetAllMockServers(
	webview: vscode.Webview,
): Promise<void> {
	try {
		const servers = await MockServer_Repository_GetAll();
		webview.postMessage({
			type: responseTypes.getAllMockServersResponse,
			data: servers,
		});
	} catch (err) {
		writeLog("error::GetAllMockServers(): " + err);
	}
}

export async function GetMockServerById(
	id: string,
	webview: vscode.Webview,
): Promise<void> {
	try {
		const server = await MockServer_Repository_GetById(id);
		if (!server) {
			return;
		}
		webview.postMessage({
			type: responseTypes.getMockServerByIdResponse,
			data: {
				server,
				runtime: {
					status: getServerStatus(server.id),
					logs: getRequestLogs(server.id),
				},
			},
		});
	} catch (err) {
		writeLog("error::GetMockServerById(): " + err);
	}
}

export async function SaveMockServer(
	item: IMockServer,
	webview: vscode.Webview,
	sideBarView: vscode.WebviewView,
): Promise<void> {
	try {
		const newServer: IMockServer = {
			...item,
			id: item.id || uuidv4(),
			createdTime: formatDate(),
			modifiedTime: formatDate(),
		};
		await MockServer_Repository_Insert(newServer);

		webview.postMessage({
			type: responseTypes.saveMockServerResponse,
			data: newServer,
		});

		if (sideBarView) {
			sideBarView.webview.postMessage({
				type: responseTypes.saveMockServerResponse,
				data: newServer,
			});
		}
	} catch (err) {
		writeLog("error::SaveMockServer(): " + err);
	}
}

export async function UpdateMockServer(
	item: IMockServer,
	webview: vscode.Webview,
	sideBarView: vscode.WebviewView,
): Promise<void> {
	try {
		await MockServer_Repository_Update(item);

		webview.postMessage({
			type: responseTypes.updateMockServerResponse,
			data: item,
		});

		if (sideBarView) {
			sideBarView.webview.postMessage({
				type: responseTypes.updateMockServerResponse,
				data: item,
			});
		}
	} catch (err) {
		writeLog("error::UpdateMockServer(): " + err);
	}
}

export async function RenameMockServer(
	id: string,
	name: string,
	webviewView: vscode.WebviewView,
): Promise<void> {
	try {
		await MockServer_Repository_Rename(id, name);
		const updated = await MockServer_Repository_GetById(id);
		if (updated) {
			webviewView.webview.postMessage({
				type: responseTypes.updateMockServerResponse,
				data: updated,
			});
		}
	} catch (err) {
		writeLog("error::RenameMockServer(): " + err);
	}
}

export async function DeleteMockServer(
	id: string,
	webview: vscode.Webview,
	sideBarView: vscode.WebviewView,
): Promise<void> {
	try {
		await MockServer_Repository_Delete(id);

		webview.postMessage({
			type: responseTypes.deleteMockServerResponse,
			data: { id },
		});

		if (sideBarView) {
			sideBarView.webview.postMessage({
				type: responseTypes.deleteMockServerResponse,
				data: { id },
			});
		}
	} catch (err) {
		writeLog("error::DeleteMockServer(): " + err);
	}
}
