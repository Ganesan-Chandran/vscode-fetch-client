import { Col_Repository_GetVariableByColId, Col_Repository_GetParentSettings } from "../../db/collectionDB.repository";
import { Main_Repository_GetRequestItem } from "../../db/mainDB.repository";
import { Var_Repository_GetVariableByIdSync, Var_Repository_UpdateVariableSync } from "../../db/variableDB.repository";
import { setVariable } from "../../helpers/tests.helper";
import { IRunRequest } from "../../types/prefetch.types";
import { IRequestModel } from "../../types/request.types";
import { IReponseModel } from "../../types/response.types";
import { IVariable } from "../../types/sidebar.types";
import { IPreFetchContextProvider, RequestContext } from "./preFetch.types.ts";

export class DbPreFetchContextProvider
	implements IPreFetchContextProvider {
	async loadRequestContext(
		runRequest: IRunRequest,
		_parentName: string,
		encryptionKey: string | null,
	): Promise<RequestContext | undefined> {
		const { reqId, parentId, colId } = runRequest;

		const varId = await Col_Repository_GetVariableByColId(colId);
		const variable = await Var_Repository_GetVariableByIdSync(varId, encryptionKey);

		const parentSettings = parentId === colId
			? await Col_Repository_GetParentSettings(colId, "")
			: await Col_Repository_GetParentSettings(colId, parentId);

		const request = await Main_Repository_GetRequestItem(reqId);

		if (!request) {
			return undefined;
		}

		return {
			request,
			variable,
			parentSettings,
		};
	}

	getVariable(): IVariable | undefined {
		return undefined;
	}

	async updateVariable(
		request: IRequestModel,
		variable: IVariable | undefined,
		response: IReponseModel,
		encryptionKey: string | null,
	): Promise<IVariable | undefined> {
		if (
			response.response.status !== 0 &&
			response.response.status <= 399 &&
			request.setvar.length > 1 &&
			variable?.id
		) {
			const updated = setVariable(variable, request.setvar, response);

			return await Var_Repository_UpdateVariableSync(
				updated,
				encryptionKey,
			);
		}

		return variable;
	}
}