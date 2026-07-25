import { IRunRequest } from "../../types/prefetch.types";
import { IRequestModel } from "../../types/request.types";
import { IReponseModel } from "../../types/response.types";
import { ISettings, IVariable } from "../../types/sidebar.types";

export interface RequestContext {
	request: IRequestModel;
	variable: IVariable | undefined;
	parentSettings: ISettings;
}

export interface IPreFetchContextProvider {
	loadRequestContext(
		runRequest: IRunRequest,
		parentName: string,
		encryptionKey: string | null,
	): Promise<RequestContext | undefined>;

	updateVariable(
		request: IRequestModel,
		variable: IVariable | undefined,
		response: IReponseModel,
		encryptionKey: string | null,
	): Promise<IVariable | undefined>;

	getVariable(): IVariable | undefined;
}
