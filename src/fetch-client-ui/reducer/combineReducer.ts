import { combineReducers, Reducer } from "redux";
import { CookieReducer } from "../components/Cookies/redux/reducer";
import { ICookiesModel } from "../components/Cookies/redux/types";
import { UIReducer } from "../components/MainUI/redux/reducer";
import { ICommonConfig } from "../components/MainUI/redux/types";
import { ReqColReducer } from "../components/RequestUI/redux/colReducer";
import { RequestReducer } from "../components/RequestUI/redux/reducer";
import { ReqSettingsReducer } from "../components/RequestUI/redux/reqSettingsReducer";
import { IReqColModel, IReqSettings, IRequestModel } from "../components/RequestUI/redux/types";
import { ResponseReducer } from "../components/ResponseUI/redux";
import { IReponseModel } from "../components/ResponseUI/redux/types";
import { SideBarReducer } from "../components/SideBar/redux";
import { ISideBarModel } from "../components/SideBar/redux/types";
import { VariableReducer } from "../components/Variables/redux/reducer";
import { IVariableModel } from "../components/Variables/redux/types";

export interface IRootState {
	requestData: IRequestModel,
	responseData: IReponseModel,
	uiData: ICommonConfig,
	sideBarData: ISideBarModel,
	variableData: IVariableModel,
	cookieData: ICookiesModel,
	reqColData: IReqColModel,
	reqSettings: IReqSettings
}

const createRootReducer: () => Reducer<IRootState> =
	(): Reducer<IRootState> => combineReducers<IRootState>({
		requestData: RequestReducer,
		responseData: ResponseReducer,
		uiData: UIReducer,
		sideBarData: SideBarReducer,
		variableData: VariableReducer,
		cookieData: CookieReducer,
		reqColData: ReqColReducer,
		reqSettings: ReqSettingsReducer
	});

export default createRootReducer;
