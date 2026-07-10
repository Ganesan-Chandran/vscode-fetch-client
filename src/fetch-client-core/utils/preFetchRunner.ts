import { apiFetch, FetchConfig } from "./fetchUtil";
import {
	Col_Repository_GetParentSettings,
	Col_Repository_GetVariableByColId,
} from "../db/collectionDB.repository";
import { executeTests, setVariable } from "../helpers/tests.helper";
import {
	getVariableEncryptionConfiguration,
	getVariableEncryptionKey,
} from "./vscodeConfig";
import { InitialResponse } from "../consts/initialValues.consts";
import { IPreFetch, IRunRequest } from "../types/prefetch.types";
import { IPreFetchResponse, IReponseModel } from "../types/response.types";
import { IRequestModel } from "../types/request.types";
import { IVariable, ISettings } from "../types/sidebar.types";
import { Main_Repository_GetRequestItem } from "../db/mainDB.repository";
import {
	Var_Repository_GetVariableByIdSync,
	Var_Repository_UpdateVariableSync,
} from "../db/variableDB.repository";
import { writeLog } from "../helpers/logger/logger";

function createEmptyPreFetchResponse(): IPreFetchResponse {
	return {
		reqId: "",
		name: "",
		resStatus: 0,
		testResults: [],
		childrenResponse: [],
	};
}

interface RequestContext {
	request: IRequestModel;
	variable: IVariable | undefined;
	parentSettings: ISettings;
}

export class PreFetchRunner {
	private readonly fetchConfig: FetchConfig;
	private readonly executingRequests: string[];
	private _allow: boolean = true;
	private _message: string = "";
	private readonly response: IReponseModel;
	public preFetchResponses: IPreFetchResponse[] = [];
	private _encryptionKey = getVariableEncryptionConfiguration()
		? getVariableEncryptionKey()
		: null;

	get allow(): boolean {
		return this._allow;
	}

	get message(): string {
		return this._message;
	}

	constructor(fetchConfig: FetchConfig, reqId: string) {
		this.fetchConfig = fetchConfig;
		this.executingRequests = [reqId];
		this.response = {
			id: reqId,
			response: { ...InitialResponse },
			headers: [],
			cookies: [],
			loading: false,
			testResults: [],
		};
	}

	RunPreRequests = async (
		preFetch: IPreFetch,
		startReqIndex: number,
		parentName: string,
		isCollectionPreRequest: boolean,
		parentIndex: number = -1,
		parentPreFetchResponse: IPreFetchResponse | undefined = undefined,
	): Promise<void> => {
		if (!this._allow) {
			return;
		}

		const firstReqId = preFetch.requests[startReqIndex]?.reqId;
		if (!firstReqId) {
			return;
		}

		if (this.executingRequests.includes(firstReqId) && isCollectionPreRequest) {
			return;
		}

		if (this.executingRequests.includes(firstReqId)) {
			this._allow = false;
			this._message = `Circular Dependency in Request ${parentName}`;
			return;
		}

		this.executingRequests.push(firstReqId);

		const filteredRequests = preFetch.requests.filter(
			(r) => r.reqId && r.reqId !== "undefined",
		);

		// Tracks the last successfully loaded request for condition evaluation on the next iteration
		let previousRequest: IRequestModel | undefined;
		let updatedVariable: IVariable | undefined;

		for (let i = 0; i < filteredRequests.length && this._allow; i++) {
			const responseSlot = createEmptyPreFetchResponse();

			if (parentIndex === -1) {
				this.preFetchResponses.push(responseSlot);
			} else {
				parentPreFetchResponse!.childrenResponse.push(responseSlot);
			}

			const targetResponse =
				parentIndex === -1
					? this.preFetchResponses[i]
					: parentPreFetchResponse!.childrenResponse[i];

			// Evaluate conditions gating this request (skip for the first request)
			if (i > 0 && previousRequest?.id) {
				const conditions = filteredRequests[i].condition.filter(
					(c) => c.parameter && c.action,
				);
				if (conditions.length > 0) {
					const testResults = executeTests(
						conditions,
						this.response,
						updatedVariable?.data,
					);
					const failedIndex = testResults.findIndex((t) => t.result === false);

					targetResponse.testResults = testResults;
					if (failedIndex !== -1) {
						targetResponse.reqId = "-1";
						if (parentIndex !== -1) {
							parentPreFetchResponse!.reqId = "-1";
						}
						this._allow = false;
						this._message = `'Condition ${i}' failed in 'Pre-Request ${i}' in the Request '${parentName}'`;
						return;
					}
				}
			}

			const { reqId } = filteredRequests[i];
			if (!reqId) {
				return;
			}

			const context = await this.loadRequestContext(
				filteredRequests[i],
				parentName,
			);
			if (!context) {
				return;
			}
			if (!this._allow) {
				continue;
			}

			const { request, variable, parentSettings } = context;

			targetResponse.name = request.name;

			const hasNestedPreFetch =
				(request.preFetch?.requests?.length ?? 0) > 0 &&
				!isCollectionPreRequest;

			if (hasNestedPreFetch) {
				await this.RunPreRequests(
					request.preFetch,
					0,
					request.name,
					isCollectionPreRequest,
					i,
					targetResponse,
				);
				if (!this._allow) {
					return;
				}

				// Remove from tracking so the same request can appear in sibling branches
				const execIdx = this.executingRequests.indexOf(reqId);
				if (execIdx !== -1) {
					this.executingRequests.splice(execIdx, 1);
				}
			}

			let res: Awaited<ReturnType<typeof apiFetch>>;
			try {
				res = await apiFetch(
					request,
					variable?.data,
					parentSettings,
					null,
					this.fetchConfig,
				);
			} catch (err) {
				this._allow = false;
				this._message = `Pre-Request '${request.name}' failed in the Request '${parentName}'`;
				return;
			}

			targetResponse.reqId = request.id;
			targetResponse.name = request.name;
			targetResponse.resStatus = res?.response?.status;

			if (res?.response?.status >= 400 && res?.response?.status <= 599) {
				if (parentIndex !== -1) {
					parentPreFetchResponse!.reqId = "-1";
				}
				this._allow = false;
				this._message = `Pre-Request '${request.name}' failed in the Request '${parentName}'`;
				return;
			}

			this.response.response = {
				...res.response,
				size: String(res.response.size),
			};
			this.response.headers = res.headers;
			this.response.cookies = res.cookies;

			previousRequest = request;
			updatedVariable = await this.updateVariable(request, variable);
		}
	};

	private loadRequestContext = async (
		runRequest: IRunRequest,
		parentName: string,
	): Promise<RequestContext | undefined> => {
		const { reqId, parentId, colId } = runRequest;
		try {
			const varId = await Col_Repository_GetVariableByColId(colId);
			const variable = await Var_Repository_GetVariableByIdSync(
				varId,
				this._encryptionKey,
			);
			const parentSettings =
				parentId === colId
					? await Col_Repository_GetParentSettings(colId, "")
					: await Col_Repository_GetParentSettings(colId, parentId);
			const request = await Main_Repository_GetRequestItem(reqId);

			if (!request) {
				return undefined;
			}

			return { request, variable, parentSettings };
		} catch (err) {
			writeLog(`error::PreFetchRunner::loadRequestContext: ${err}`);
			this._allow = false;
			this._message = `Failed to load Pre-Request data for '${parentName}'`;
			return undefined;
		}
	};

	private updateVariable = async (
		request: IRequestModel,
		variable: IVariable | undefined,
	): Promise<IVariable | undefined> => {
		if (
			this.response.response.status !== 0 &&
			this.response.response.status <= 399 &&
			request.setvar.length > 1 &&
			variable?.id
		) {
			try {
				const updated = setVariable(variable, request.setvar, this.response);
				return await Var_Repository_UpdateVariableSync(
					updated,
					this._encryptionKey,
				);
			} catch (err) {
				writeLog(`error::PreFetchRunner::updateVariable: ${err}`);
			}
		}
		return variable;
	};
}
