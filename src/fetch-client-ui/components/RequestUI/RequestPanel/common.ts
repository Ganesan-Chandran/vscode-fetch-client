import { Actions } from "../redux";
import { AppDispatch } from "../../../store/appStore";
import { formatDate } from "../../../../fetch-client-core/helpers/dateTime.helper";
import { GetDataFromHTML, notesMaxLimit } from "../../Common/helper";
import { IReqSettings } from '../../../../fetch-client-core/types/prefetch.types';
import { IRequestModel } from '../../../../fetch-client-core/types/request.types';
import { ISettings, IVariable } from "../../../../fetch-client-core/types/sidebar.types";
import { requestTypes } from "../../../../fetch-client-core/consts/requestTypes.consts";
import { ResponseActions } from "../../ResponseUI/redux";
import { v4 as uuidv4 } from 'uuid';
import vscode from "../../Common/vscodeAPI";

export const SendRequest = (dispatch: AppDispatch, newReq: boolean, colId: string, requestData: IRequestModel, selectedVariable: IVariable, parentSettings: ISettings, reqSettings: IReqSettings) => {
	dispatch(ResponseActions.SetResponseLoadingAction(true));
	dispatch(ResponseActions.SetPreFetchResponseAction([]));

	let reqData = { ...requestData };

	if (newReq) {
		reqData.id = uuidv4();
		reqData.name = reqData.url.trim();
		reqData.createdTime = formatDate();
		dispatch(Actions.SetRequestAction(reqData));
	}

	const data = GetDataFromHTML(reqData.notes);
	reqData.notes = data.length > notesMaxLimit ? "" : reqData.notes;

	vscode.postMessage({ type: requestTypes.apiRequest, data: { reqData: reqData, isNew: newReq, variableData: selectedVariable, settings: parentSettings, colId: colId, reqSettings: reqSettings } });
};
