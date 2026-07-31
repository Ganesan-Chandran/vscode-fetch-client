import { apiFetch, FetchConfig } from "../fetchUtil";
import { executeTests } from "../../helpers/tests.helper";
import { IPreFetchContextProvider } from "./preFetch.types.ts";
import { PreFetchRunner } from "./preFetchRunner";
import { IRequestModel } from "../../types/request.types";
import { IReponseModel } from "../../types/response.types";
import { ISettings, IVariable } from "../../types/sidebar.types";
import { ITableData } from "../../types/common.types";

export interface IQGLiveRunOptions {
	request: IRequestModel;
	settings: ISettings | null | undefined;
	variable: IVariable | undefined;
	effectiveVarId: string;
	provider: IPreFetchContextProvider;
	fetchConfig: FetchConfig;
	encryptionKey: string | null;
	// Reloads the variable set by id - pre-requests may have refreshed it in the DB.
	reloadVariable?: (varId: string) => Promise<IVariable | undefined>;
}

export interface IQGLiveRunResult {
	response: IReponseModel | undefined;
	skippedReason?: string;
}

// Shared by the CLI ("fc-cli qc") and the VS Code Quality Gate webview so a live
// request run for analysis executes pre-requests, tests and set-vars identically
// on both surfaces instead of each duplicating (and drifting from) the logic.
export async function runLiveQualityGateRequest(
	opts: IQGLiveRunOptions,
): Promise<IQGLiveRunResult> {
	const { request, settings, provider, fetchConfig, encryptionKey } = opts;

	let variable = opts.variable;
	let variableData: ITableData[] = variable?.data ?? [];
	let isVariableUpdated = false;

	if ((settings?.preFetch?.requests?.length ?? 0) > 0) {
		const runner = new PreFetchRunner(fetchConfig, request.id, provider);
		await runner.RunPreRequests(settings!.preFetch, 0, request.name, true);

		if (!runner.allow) {
			return { response: undefined, skippedReason: runner.message };
		}
		isVariableUpdated = true;
	}

	if (
		(request.preFetch?.requests?.length ?? 0) > 0 &&
		request.preFetch.requests[0]?.reqId
	) {
		const runner = new PreFetchRunner(fetchConfig, request.id, provider);
		await runner.RunPreRequests(request.preFetch, 0, request.name, false);

		if (!runner.allow) {
			return { response: undefined, skippedReason: runner.message };
		}
		isVariableUpdated = true;
	}

	if (isVariableUpdated) {
		const updatedVariable = provider.getVariable();

		if (updatedVariable) {
			variable = updatedVariable;
			variableData = updatedVariable.data;
		} else if (opts.reloadVariable && opts.effectiveVarId) {
			const reloaded = await opts.reloadVariable(opts.effectiveVarId);

			if (reloaded?.data) {
				variable = reloaded;
				variableData = reloaded.data;
			}
		}
	}

	const raw = await apiFetch(
		request,
		variableData,
		settings ?? ({} as ISettings),
		null,
		fetchConfig,
	);

	const responseModel: IReponseModel = {
		id: request.id,
		response: {
			duration: raw.response.duration,
			isError: raw.response.isError,
			responseData: raw.response.responseData,
			responseType: raw.response.responseType,
			size: raw.response.size as string,
			status: raw.response.status,
			statusText: raw.response.statusText,
		},
		headers: raw.headers,
		cookies: raw.cookies,
		loading: false,
		testResults: [],
	};

	if (request.tests?.length > 0) {
		responseModel.testResults = executeTests(
			request.tests,
			responseModel,
			variableData,
		);
	}

	if (request.setvar?.length > 0) {
		await provider.updateVariable(request, variable, responseModel, encryptionKey);
	}

	return { response: responseModel };
}
