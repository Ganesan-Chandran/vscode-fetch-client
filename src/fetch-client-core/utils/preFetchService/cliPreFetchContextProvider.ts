import { IPreFetchContextProvider, RequestContext } from "./preFetch.types.ts";
import { IReponseModel } from "../../types/response.types";
import { IRequestModel } from "../../types/request.types";
import { IRunRequest } from "../../types/prefetch.types";
import { IVariable, ICollections } from "../../types/sidebar.types";
import { setVariable } from "../../helpers/tests.helper";
import { resolveParentSettings } from "../../helpers/settings.helper";

export class CliPreFetchContextProvider
	implements IPreFetchContextProvider {

	constructor(
		private readonly collection: ICollections,
		private readonly requestMap: Map<string, IRequestModel>,
		private _variable: IVariable | undefined,
	) { }

	get variable(): IVariable | undefined {
		return this._variable;
	}

	async loadRequestContext(
		runRequest: IRunRequest,
		_parentName: string,
		_key: string | null,
	): Promise<RequestContext | undefined> {

		const request = this.requestMap.get(runRequest.reqId);

		if (!request) {
			return undefined;
		}

		const settings =
			resolveParentSettings(
				this.collection,
				runRequest.parentId === runRequest.colId
					? ""
					: runRequest.parentId,
			);

		return {
			request,
			variable: this.variable,
			parentSettings: settings,
		};
	}

	getVariable(): IVariable | undefined {
		return this._variable;
	}

	async updateVariable(
		request: IRequestModel,
		variable: IVariable | undefined,
		response: IReponseModel,
		_encryptionKey: string | null,
	) {
		if (!variable) {
			return variable;
		}

		const updated = setVariable(
			variable,
			request.setvar,
			response,
		);

		// update memory
		this._variable = updated;

		return updated;
	}
}
