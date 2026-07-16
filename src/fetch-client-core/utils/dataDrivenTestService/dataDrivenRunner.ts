import { apiFetch, FetchConfig } from "../fetchUtil";
import { CliPreFetchContextProvider } from "../preFetchService/cliPreFetchContextProvider";
import { executeTests } from "../../helpers/tests.helper";
import { formatDate } from "../../helpers/dateTime.helper";
import { ICollections, ISettings, IVariable } from "../../types/sidebar.types";
import { IReponseModel } from "../../types/response.types";
import {
	IDataDrivenConfig,
	IDataDrivenResult,
	IDataDrivenRowResult,
} from "./dataDriven.types";
import { IRequestModel } from "../../types/request.types";
import { PreFetchRunner } from "../preFetchService/preFetchRunner";

export interface IDataDrivenCancelRef {
	cancelled: boolean;
}

export async function runDataDrivenTest(
	selectedRequests: IRequestModel[],
	collection: ICollections,
	requestMap: Map<string, IRequestModel>,
	dataRows: Record<string, string>[],
	baseVariable: IVariable | undefined,
	parentSettings: ISettings,
	config: IDataDrivenConfig,
	fetchConfig: FetchConfig,
	cancelRef: IDataDrivenCancelRef,
	onRowResult?: (result: IDataDrivenRowResult) => void,
): Promise<IDataDrivenResult> {
	const results: IDataDrivenRowResult[] = [];
	const startTime = formatDate();
	let stopped = false;

	const rowsToRun = dataRows;

	for (
		let rowIndex = 0;
		rowIndex < rowsToRun.length && !stopped && !cancelRef.cancelled;
		rowIndex++
	) {
		const rowData = rowsToRun[rowIndex];

		const rowVariable: IVariable = baseVariable
			? JSON.parse(JSON.stringify(baseVariable))
			: {
					id: "",
					name: "DataDriven",
					createdTime: "",
					modifiedTime: "",
					isActive: true,
					data: [],
				};

		for (const [key, value] of Object.entries(rowData)) {
			const idx = rowVariable.data.findIndex((d) => d.key === key);
			if (idx !== -1) {
				rowVariable.data[idx] = {
					...rowVariable.data[idx],
					key,
					value,
					isChecked: true,
				};
			} else {
				rowVariable.data.push({ key, value, isChecked: true });
			}
		}

		const provider = new CliPreFetchContextProvider(
			collection,
			requestMap,
			rowVariable,
		);

		for (const req of selectedRequests) {
			if (cancelRef.cancelled) {
				break;
			}

			if ((parentSettings?.preFetch?.requests?.length ?? 0) > 0) {
				const colRunner = new PreFetchRunner(fetchConfig, req.id, provider);
				await colRunner.RunPreRequests(
					parentSettings.preFetch,
					0,
					req.name,
					true,
				);
			}

			if (
				(req.preFetch?.requests?.length ?? 0) > 0 &&
				req.preFetch.requests[0]?.reqId
			) {
				const reqRunner = new PreFetchRunner(fetchConfig, req.id, provider);
				await reqRunner.RunPreRequests(req.preFetch, 0, req.name, false);

				if (!reqRunner.allow) {
					const errResult: IDataDrivenRowResult = {
						rowIndex: rowIndex + 1,
						requestId: req.id,
						requestName: req.name || req.url,
						method: req.method,
						url: req.url,
						status: 0,
						statusText: "Pre-Request Failed",
						duration: 0,
						testTotal: 0,
						testPassed: 0,
						isError: true,
						error: reqRunner.message,
					};
					results.push(errResult);
					onRowResult?.(errResult);

					if (config.stopOnRowFailure) {
						stopped = true;
					}
					continue;
				}
			}

			const currentVariable = provider.getVariable() ?? rowVariable;

			const start = Date.now();
			let rowResult: IDataDrivenRowResult;

			try {
				const res = await apiFetch(
					req,
					currentVariable.data,
					parentSettings,
					null,
					fetchConfig,
				);
				const duration = Date.now() - start;
				const status = res?.response?.status ?? 0;
				const statusText = res?.response?.statusText ?? "";
				const isError = !res || status === 0 || status >= 400;

				let testTotal = 0;
				let testPassed = 0;
				if (req.tests?.length > 0) {
					const responseModel: IReponseModel = {
						id: req.id,
						response: {
							duration: res?.response?.duration ?? duration,
							isError,
							responseData: res?.response?.responseData,
							responseType: res?.response?.responseType,
							size: res?.response?.size as string,
							status,
							statusText,
						},
						headers: res?.headers ?? [],
						cookies: res?.cookies ?? [],
						loading: false,
						testResults: [],
					};
					const testResults = executeTests(
						req.tests,
						responseModel,
						currentVariable.data,
					);
					testTotal = testResults.length;
					testPassed = testResults.filter((t) => t.result === true).length;
				}

				rowResult = {
					rowIndex: rowIndex + 1,
					requestId: req.id,
					requestName: req.name || req.url,
					method: req.method,
					url: req.url,
					status,
					statusText,
					duration,
					testTotal,
					testPassed,
					isError,
				};
			} catch (err) {
				rowResult = {
					rowIndex: rowIndex + 1,
					requestId: req.id,
					requestName: req.name || req.url,
					method: req.method,
					url: req.url,
					status: 0,
					statusText: "Error",
					duration: Date.now() - start,
					testTotal: 0,
					testPassed: 0,
					isError: true,
					error: (err as Error).message,
				};
			}

			results.push(rowResult);
			onRowResult?.(rowResult);

			if (config.stopOnRowFailure && rowResult.isError) {
				stopped = true;
				break;
			}
		}
	}

	const passed = results.filter(
		(r) => !r.isError && (r.testTotal === 0 || r.testPassed === r.testTotal),
	).length;

	return {
		testName: collection.name,
		startTime,
		endTime: formatDate(),
		totalRows: rowsToRun.length,
		totalRequests: results.length,
		passedRequests: passed,
		failedRequests: results.length - passed,
		rows: results,
	};
}
