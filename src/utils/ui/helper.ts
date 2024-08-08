import { Webview } from "vscode";
import { sideBarProvider, vsCodeLogger } from "../../extension";
import { IPreFetch, IReqSettings, IRequestModel } from "../../fetch-client-ui/components/RequestUI/redux/types";
import { IHistory, ISettings, IVariable } from "../../fetch-client-ui/components/SideBar/redux/types";
import { apiFetch, FetchConfig } from "../fetchUtil";
import { formatDate, getErrorResponse } from "../helper";
import { PreFetchRunner } from "../PreFetchRunner";
import { SaveRequest, UpdateRequest } from "../db/mainDBUtil";
import { SaveHistory, UpdateHistory } from "../db/historyDBUtil";
import { GetVariableByIdSync } from "../db/varDBUtil";
import { writeLog } from "../logger/logger";

export async function ExecuteAPIRequest(message: any, fetchConfig: FetchConfig, webview: Webview) {
  try {
    let request = message.data.reqData as IRequestModel;
    let settings = message.data.settings as ISettings;
    let reqSettings = message.data.reqSettings as IReqSettings;
    let isVariableUpdated: boolean = false;
    let updatedVariable: IVariable = message.data.variableData;

    // Run PreRequests in the parent
    if ((!reqSettings || reqSettings?.skipParentPreFetch === false) && settings?.preFetch?.requests?.length > 0) {
      let continueRequest = await runPreRequest(message, settings.preFetch, true, fetchConfig, webview);
      if (!continueRequest) {
        return;
      }
      isVariableUpdated = true;
    }

    // Run PreRequests in the request item
    if (request.preFetch?.requests?.length > 0 && request.preFetch?.requests[0].reqId) {
      let continueRequest = await runPreRequest(message, request.preFetch, false, fetchConfig, webview);
      if (!continueRequest) {
        return;
      }
      isVariableUpdated = true;
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

async function runPreRequest(message: any, preFetch: IPreFetch, isParentPreRequest: boolean, fetchConfig: FetchConfig, webview: Webview): Promise<boolean> {
  let request = message.data.reqData as IRequestModel;
  let preFetchCollectionRunner = new PreFetchRunner(fetchConfig, request.id);
  await preFetchCollectionRunner.RunPreRequests(preFetch, 0, 0, request.name, isParentPreRequest);
  if (preFetchCollectionRunner.message) {
    if (fetchConfig.runMainRequest === true) {
      setTimeout(() => {
        vsCodeLogger.log("INFO", "\n\n" + preFetchCollectionRunner.message + "\n");
      }, 500);
      return true;
    } else {
      fetchConfig.source = null;
      let errorResponse = getErrorResponse();
      errorResponse.response.responseData = preFetchCollectionRunner.message;
      webview.postMessage(errorResponse);
      return false;
    }
  }

  return true;
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