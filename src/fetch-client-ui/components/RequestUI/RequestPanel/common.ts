import { Dispatch } from "redux";
import { v4 as uuidv4 } from 'uuid';
import { requestTypes } from "../../../../utils/configuration";
import { formatDate } from "../../../../utils/helper";
import { GetDataFromHTML, notesMaxLimit } from "../../Common/helper";
import vscode from "../../Common/vscodeAPI";
import { ResponseActions } from "../../ResponseUI/redux";
import { ISettings, IVariable } from "../../SideBar/redux/types";
import { Actions } from "../redux";
import { IReqSettings, IRequestModel } from "../redux/types";

export const SendRequest = (dispatch: Dispatch<any>, newReq: boolean, colId: string, requestData: IRequestModel, selectedVariable: IVariable, parentSettings: ISettings, reqSettings: IReqSettings) => {
  dispatch(ResponseActions.SetResponseLoadingAction(true));

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
