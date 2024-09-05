import * as vscode from "vscode";
import { Webview } from "vscode";
import { sideBarProvider, vsCodeLogger } from "../../extension";
import { IPreFetch, IReqSettings, IRequestModel } from "../../fetch-client-ui/components/RequestUI/redux/types";
import { IPreFetchResponse } from "../../fetch-client-ui/components/ResponseUI/redux/types";
import { IHistory, ISettings, IVariable } from "../../fetch-client-ui/components/SideBar/redux/types";
import { responseTypes } from "../configuration";
import { SaveHistory, UpdateHistory } from "../db/historyDBUtil";
import { SaveRequest, UpdateRequest } from "../db/mainDBUtil";
import { GetVariableByIdSync } from "../db/varDBUtil";
import { apiFetch, FetchConfig } from "../fetchUtil";
import { formatDate, getErrorResponse } from "../helper";
import { writeLog } from "../logger/logger";
import { PreFetchRunner } from "../PreFetchRunner";

export async function ExecuteAPIRequest(message: any, fetchConfig: FetchConfig, webview: Webview) {
	try {
		let request = message.data.reqData as IRequestModel;
		let settings = message.data.settings as ISettings;
		let reqSettings = message.data.reqSettings as IReqSettings;
		let isVariableUpdated: boolean = false;
		let updatedVariable: IVariable = message.data.variableData;
		let continueRequest: boolean = true;
		let runMainRequest: boolean = true;
		let parentPreFetchResponse: IPreFetchResponse[] = [];
		let preFetchResponse: IPreFetchResponse[] = [];

		// Run PreRequests in the parent
		if ((!reqSettings || reqSettings?.skipParentPreFetch === false) && settings?.preFetch?.requests?.length > 0) {
			[runMainRequest, continueRequest, parentPreFetchResponse] = await runPreRequest(message, settings.preFetch, true, fetchConfig, webview);
			if (!runMainRequest || !continueRequest) {
				webview?.postMessage({ type: responseTypes.preFetchResponse, preFetchResponse: parentPreFetchResponse });
			}

			if (!runMainRequest) {
				return;
			}

			isVariableUpdated = true;
		}

		// Run PreRequests in the request item
		if (continueRequest && request.preFetch?.requests?.length > 0 && request.preFetch?.requests[0].reqId) {
			[runMainRequest, continueRequest, preFetchResponse] = await runPreRequest(message, request.preFetch, false, fetchConfig, webview);
			preFetchResponse = [...parentPreFetchResponse, ...preFetchResponse];
			webview?.postMessage({ type: responseTypes.preFetchResponse, preFetchResponse: preFetchResponse });
			if (!runMainRequest) {
				return;
			}
			isVariableUpdated = true;
		} else if (continueRequest && parentPreFetchResponse?.length > 0) {
			webview?.postMessage({ type: responseTypes.preFetchResponse, preFetchResponse: parentPreFetchResponse });
		}

		if (isVariableUpdated && message.data.variableData?.data?.length > 0) {
			updatedVariable = await GetVariableByIdSync(message.data.variableData?.id);
		}

		_executeAPIRequest(message, updatedVariable, fetchConfig, webview);
	} catch (err) {
		writeLog("error::helper::ExecuteAPIRequest()" + err);
		throw err;
	}
}

async function runPreRequest(message: any, preFetch: IPreFetch, isParentPreRequest: boolean, fetchConfig: FetchConfig, webview: Webview): Promise<[runMainRequest: boolean, continueRequest: boolean, preFetchResponse: IPreFetchResponse[]]> {
	let request = message.data.reqData as IRequestModel;
	let preFetchCollectionRunner = new PreFetchRunner(fetchConfig, request.id);
	await preFetchCollectionRunner.RunPreRequests(preFetch, 0, request.name, isParentPreRequest);
	if (preFetchCollectionRunner.message) {
		if (fetchConfig.runMainRequest === true) {
			setTimeout(() => {
				vsCodeLogger.log("INFO", "\n\n" + preFetchCollectionRunner.message + "\n");
			}, 500);
			return [true, preFetchCollectionRunner.allow, preFetchCollectionRunner.preFetchResponses];
		} else {
			fetchConfig.source = null;
			let errorResponse = getErrorResponse();
			errorResponse.response.responseData = preFetchCollectionRunner.message;
			webview.postMessage(errorResponse);
			return [false, preFetchCollectionRunner.allow, preFetchCollectionRunner.preFetchResponses];
		}
	}

	return [true, true, preFetchCollectionRunner.preFetchResponses];
}

function _executeAPIRequest(message: any, variable: IVariable, fetchConfig: FetchConfig, webview: Webview) {
	apiFetch(message.data.reqData, variable?.data, message.data.settings, message.data.reqSettings, fetchConfig).then((data) => {
		fetchConfig.source = null;
		webview.postMessage(data);

		let item: IHistory = {
			id: message.data.reqData.id,
			method: message.data.reqData.method,
			name: message.data.reqData.name ? message.data.reqData.name : message.data.reqData.url,
			url: message.data.reqData.url,
			createdTime: message.data.reqData.createdTime ? message.data.reqData.createdTime : formatDate()
		};

		let reqData = message.data.reqData as IRequestModel;
		if (reqData.body.bodyType === "binary") {
			reqData.body.binary.data = "";
		}

		if (message.data.isNew) {
			SaveRequest(reqData);
			SaveHistory(item, sideBarProvider.view);
		} else {
			UpdateRequest(reqData);
			UpdateHistory(item);
		}
	});
}

export function ShowInformationDialog(info: string) {
	vscode.window.showInformationMessage(info, { modal: true });
}
