import { IPreFetch, IRequestModel } from "../fetch-client-ui/components/RequestUI/redux/types";
import { InitialResponse } from "../fetch-client-ui/components/ResponseUI/redux/reducer";
import { IReponseModel } from "../fetch-client-ui/components/ResponseUI/redux/types";
import { ISettings, IVariable } from "../fetch-client-ui/components/SideBar/redux/types";
import { executeTests, setVariable } from "../fetch-client-ui/components/TestUI/TestPanel/helper";
import { GetParentSettingsSync, GetVariableByColId } from "./db/collectionDBUtil";
import { GetRequestItem } from "./db/mainDBUtil";
import { GetVariableByIdSync, UpdateVariableSync } from "./db/varDBUtil";
import { apiFetch, FetchConfig } from "./fetchUtil";


export class PreFetchRunner {
	private readonly fetchConfig: FetchConfig;
	private executingRequests: string[] = [];
	private allow: boolean = true;
	private response: IReponseModel = {
		response: JSON.parse(JSON.stringify(InitialResponse)),
		headers: [],
		cookies: [],
		loading: false,
		testResults: []
	};
	public message: string = "";


	constructor(fetchConfig: FetchConfig, reqId: string) {
		this.executingRequests.push(reqId);
		this.fetchConfig = fetchConfig;
	}

	RunPreRequests = async (preFetch: IPreFetch, fetchIndex: number, reqIndex: number, parentName: string, isCollectionPreRequest: boolean) => {
		let request: IRequestModel;
		let parentSettings: ISettings;
		let updateVariable: IVariable;

		if (!this.allow) {
			return;
		}

		let item = this.executingRequests.find(i => i === preFetch.requests[reqIndex].reqId);

		if (item) {
			this.allow = false;
			this.message = `Circular Dependency in Request ${parentName}`;
			return;
		} else {
			this.executingRequests.push(preFetch.requests[reqIndex].reqId);
		}

		for (let i = 0; i < preFetch.requests.length && this.allow; i++) {
			reqIndex = i;
			if (i > 0 && request?.id) {
				let condition = preFetch.requests[i].condition;
				for (let j = 0; j < condition.length; j++) {
					if (!condition[j].parameter || !condition[j].action) {
						break;
					}
					let testResult = executeTests(condition, this.response, updateVariable?.data);
					if (testResult.findIndex(i => i.result === false) !== -1) {
						this.allow = false;
						this.message = `'Condition ${reqIndex}' failed in 'Pre-Request ${reqIndex}' in the Request '${parentName}'`;
						return;
					}
				}
			}

			let reqId = preFetch.requests[i].reqId;
			let parentId = preFetch.requests[i].parentId;
			let colId = preFetch.requests[i].colId;

			if (!reqId) {
				return;
			}

			let varId = await GetVariableByColId(colId);
			let variable = await GetVariableByIdSync(varId);

			if (parentId === colId) {
				parentSettings = await GetParentSettingsSync(colId, "");
			} else {
				parentSettings = await GetParentSettingsSync(colId, parentId);
			}

			request = await GetRequestItem(reqId);

			if (request && this.allow) {
				if (request.preFetch?.requests?.length > 0 && !isCollectionPreRequest) {
					await this.RunPreRequests(request.preFetch, fetchIndex + 1, 0, request.name, isCollectionPreRequest);
					if (!this.allow) {
						return;
					}
					let index = this.executingRequests.findIndex(i => i === reqId);
					if (index !== -1) {
						this.executingRequests.splice(index);
					}
					let res = await apiFetch(request, variable?.data, parentSettings, null, this.fetchConfig);
					this.response.response = res.response;
					this.response.headers = res.headers;
					this.response.cookies = res.cookies;
					updateVariable = await this.updateVariable(request, variable);
				} else {
					let res = await apiFetch(request, variable?.data, parentSettings, null, this.fetchConfig);
					this.response.response = res.response;
					this.response.headers = res.headers;
					this.response.cookies = res.cookies;
					updateVariable = await this.updateVariable(request, variable);
				}
			}
		}
	};

	updateVariable = async (request: IRequestModel, variable: IVariable): Promise<IVariable> => {
		if (this.response.response.status !== 0 && this.response.response.status <= 399 && request.setvar.length - 1 > 0 && variable?.id) {
			let variables = setVariable(variable, request.setvar, this.response);
			let variableResult = await UpdateVariableSync(variables);
			return variableResult;
		}
		return variable;
	};
}

