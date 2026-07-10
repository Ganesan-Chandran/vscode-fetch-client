import { combineReducers } from "redux";
import { CookieReducer } from "../components/Cookies/redux/reducer";
import { ICommonConfig } from "../../fetch-client-core/types/common.types";
import { ICookiesModel } from "../../fetch-client-core/types/cookie.types";
import { IReponseModel } from "../../fetch-client-core/types/response.types";
import {
	IReqColModel,
	IReqSettings,
} from "../../fetch-client-core/types/prefetch.types";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { ISideBarModel } from "../../fetch-client-core/types/sidebar.types";
import { IVariableModel } from "../components/Variables/redux/types";
import { ReqColReducer } from "../components/RequestUI/redux/colReducer";
import { ReqSettingsReducer } from "../components/RequestUI/redux/reqSettingsReducer";
import { RequestReducer } from "../components/RequestUI/redux/reducer";
import { ResponseReducer } from "../components/ResponseUI/redux";
import { SideBarReducer } from "../components/SideBar/redux";
import { UIReducer } from "../components/MainUI/redux/reducer";
import { VariableReducer } from "../components/Variables/redux/reducer";

export interface IRootState {
	requestData: IRequestModel;
	responseData: IReponseModel;
	uiData: ICommonConfig;
	sideBarData: ISideBarModel;
	variableData: IVariableModel;
	cookieData: ICookiesModel;
	reqColData: IReqColModel;
	reqSettings: IReqSettings;
}

const createRootReducer = () =>
	combineReducers({
		requestData: RequestReducer,
		responseData: ResponseReducer,
		uiData: UIReducer,
		sideBarData: SideBarReducer,
		variableData: VariableReducer,
		cookieData: CookieReducer,
		reqColData: ReqColReducer,
		reqSettings: ReqSettingsReducer,
	});

export default createRootReducer;
