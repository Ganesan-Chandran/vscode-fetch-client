import { IPreFetch, IRequestModel } from "../fetch-client-ui/components/RequestUI/redux/types";
import { InitialResponse } from "../fetch-client-ui/components/ResponseUI/redux/reducer";
import { IPreFetchResponse, IReponseModel } from "../fetch-client-ui/components/ResponseUI/redux/types";
import { ISettings, IVariable } from "../fetch-client-ui/components/SideBar/redux/types";
import { executeTests, setVariable } from "../fetch-client-ui/components/TestUI/TestPanel/helper";
import { GetParentSettingsSync, GetVariableByColId } from "./db/collectionDBUtil";
import { GetRequestItem } from "./db/mainDBUtil";
import { GetVariableByIdSync, UpdateVariableSync } from "./db/varDBUtil";
import { apiFetch, FetchConfig } from "./fetchUtil";


export class PreFetchRunner {
	private readonly fetchConfig: FetchConfig;
	private executingRequests: string[] = [];
	public allow: boolean = true;
	private response: IReponseModel = {
		response: JSON.parse(JSON.stringify(InitialResponse)),
		headers: [],
		cookies: [],
		loading: false,
		testResults: []
	};
	public preFetchResponses: IPreFetchResponse[] = [];
	public message: string = "";


	constructor(fetchConfig: FetchConfig, reqId: string) {
		this.executingRequests.push(reqId);
		this.fetchConfig = fetchConfig;
	}

	RunPreRequests = async (preFetch: IPreFetch, reqIndex: number, parentName: string, isCollectionPreRequest: boolean, parentIndex: number = -1, parentPreFetchResponse: IPreFetchResponse = null) => {
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

		let filterPreFetchRequests = preFetch.requests?.filter(i => i.reqId && i.reqId !== "undefined");

		for (let i = 0; i < filterPreFetchRequests.length && this.allow; i++) {

			if (parentIndex === -1) {
				this.preFetchResponses.push({
					reqId: "",
					name: "",
					resStatus: 0,
					testResults: [],
					childrenResponse: []
				});
			} else {
				parentPreFetchResponse.childrenResponse.push({
					reqId: "",
					name: "",
					resStatus: 0,
					testResults: [],
					childrenResponse: []
				});
			}

			reqIndex = i;

			if (i > 0 && request?.id) {
				let condition = filterPreFetchRequests[i].condition.filter(i => i.parameter && i.action);
				if (condition?.length > 0) {
					let testResult = executeTests(condition, this.response, updateVariable?.data);
					let failedResult = testResult.findIndex(it => it.result === false);

					if (parentIndex === -1) {
						this.preFetchResponses[i].testResults = testResult;
						if (failedResult !== -1) {
							this.preFetchResponses[i].reqId = "-1";
						}
					} else {
						let childIndex = parentPreFetchResponse.childrenResponse?.length;
						parentPreFetchResponse.childrenResponse[childIndex - 1].testResults = testResult;
						if (failedResult !== -1) {
							parentPreFetchResponse.reqId = "-1";
							parentPreFetchResponse.childrenResponse[childIndex - 1].reqId = "-1";
						}
					}

					if (failedResult !== -1) {
						this.allow = false;
						this.message = `'Condition ${reqIndex}' failed in 'Pre-Request ${reqIndex}' in the Request '${parentName}'`;
						return;
					}
				}
			}

			let reqId = filterPreFetchRequests[i].reqId;
			let parentId = filterPreFetchRequests[i].parentId;
			let colId = filterPreFetchRequests[i].colId;

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

				if (parentIndex !== -1) {
					parentPreFetchResponse.childrenResponse[i].name = request.name;
				} else {
					this.preFetchResponses[i].name = request.name;
				}

				if (request.preFetch?.requests?.length > 0 && !isCollectionPreRequest) {

					await this.RunPreRequests(request.preFetch, 0, request.name, isCollectionPreRequest, reqIndex, parentIndex === -1 ? this.preFetchResponses[i] : parentPreFetchResponse.childrenResponse[i]);
					if (!this.allow) {
						return;
					}

					let index = this.executingRequests.findIndex(i => i === reqId);
					if (index !== -1) {
						this.executingRequests.splice(index);
					}

					let res = await apiFetch(request, variable?.data, parentSettings, null, this.fetchConfig);

					if (parentIndex !== -1) {
						parentPreFetchResponse.childrenResponse[i].reqId = request.id;
						parentPreFetchResponse.childrenResponse[i].resStatus = res?.response?.status;
					} else {
						this.preFetchResponses[i].reqId = request.id;
						this.preFetchResponses[i].resStatus = res?.response?.status;
					}

					if (res && res.response?.status >= 400 && res.response?.status <= 599) {
						if (parentIndex !== -1) {
							parentPreFetchResponse.reqId = "-1";
						}
						this.allow = false;
						this.message = `Pre-Request '${request.name}' failed in the Request '${parentName}'`;
						return;
					}
					this.response.response = res.response;
					this.response.headers = res.headers;
					this.response.cookies = res.cookies;

					updateVariable = await this.updateVariable(request, variable);
				} else {
					let res = await apiFetch(request, variable?.data, parentSettings, null, this.fetchConfig);

					if (parentIndex !== -1) {
						parentPreFetchResponse.childrenResponse[i].reqId = request.id;
						parentPreFetchResponse.childrenResponse[i].name = request.name;
						parentPreFetchResponse.childrenResponse[i].resStatus = res?.response?.status;
					} else {
						this.preFetchResponses[i].reqId = request.id;
						this.preFetchResponses[i].name = request.name;
						this.preFetchResponses[i].resStatus = res?.response?.status;
					}

					if (res && res.response?.status >= 400 && res.response?.status <= 599) {
						if (parentIndex !== -1) {
							parentPreFetchResponse.reqId = "-1";
						}
						this.allow = false;
						this.message = `Pre-Request '${request.name}' failed in the Request '${parentName}'`;
						return;
					}
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

