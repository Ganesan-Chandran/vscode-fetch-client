import { formatDate } from "../../../../utils/helper";
import { IRequestModel } from "../../RequestUI/redux/types";
import { FormatBytes, GetResponseTime } from "../../ResponseUI/OptionsPanel/OptionTab/util";
import { IReponseModel } from "../../ResponseUI/redux/types";
import { IVariable } from "../../SideBar/redux/types";

export function exportJson(
	req: IRequestModel[],
	selectedReq: boolean[],
	res: IReponseModel[][],
	sourceColName: string,
	selectedVariable: IVariable,
	totalIterations: number
): any {

	let iteration: any[] = [];
	for (let i = 0; i < totalIterations; i++) {
		let iterationData: any[] = [];
		req.forEach((item, index) => {
			if (selectedReq[index]) {
				iterationData.push({
					request: {
						id: item.id,
						url: item.url,
						name: item.name,
						createdTime: item.createdTime,
						method: item.method.toUpperCase(),
						notes: item.notes
					},
					response: res[i] && res[i][index] ? {
						status: res[i][index].response.status,
						statusText: res[i][index].response.statusText,
						duration: getResponseDuration(res, i, index),
						size: getResponseSize(res, i, index)
					} : "[]",
					tests: res[i] && res[i][index] && res[i][index].testResults ? res[i][index].testResults.map((itm) => {
						return {
							testCase: itm.test,
							actualValue: itm.actualValue,
							result: itm.result
						};
					}) : "[]",
					totalTests: res[i] && res[i][index] && res[i][index].testResults ? res[i][index].testResults.length : 0,
					passedTests: res[i] && res[i][index] && res[i][index].testResults ? res[i][index].testResults.filter(re => re.result === true).length : 0,
					failedTests: res[i] && res[i][index] && res[i][index].testResults ? res[i][index].testResults.filter(re => re.result === false).length : 0,
				});
			}
		});

		let totalRequests = selectedReq.filter(item => item === true).length;
		let passedCount = passedRequestsCount(res[i]);

		let iterationInfo = {
			iteration: i + 1,
			totalRequests: totalRequests,
			passedRequests: passedCount,
			failedRequests: totalRequests - passedCount,
			iterationData: iterationData
		};
		iteration.push(iterationInfo);
	}

	let exportData = {
		app: "Fetch Client",
		collectionName: sourceColName,
		version: "1.0",
		exportedDate: formatDate(),
		variableName: selectedVariable.name,
		totalIterations: totalIterations,
		iterations: iteration
	};

	return exportData;
}

export function exportCSV(
	req: IRequestModel[],
	selectedReq: boolean[],
	res: IReponseModel[][],
	sourceColName: string,
	selectedVariable: IVariable,
	totalIterations: number
): string {
	let data = `app,Fetch Client\ncollectionName,${sourceColName}\nversion,1.0\nexportedDate,${formatDate()}\nvariableName,${selectedVariable.name}\ntotalIterations,${totalIterations}\n\n`;

	for (let i = 0; i < totalIterations; i++) {
		data = data + `iteration,${i + 1}\n`;
		data = data + `Id,Url,Name,Method,Status,Status Text,Duration,Size,Total Tests,Total Passed,Total Failed\n`;
		req.forEach((item, index) => {
			if (selectedReq[index]) {
				data = data + `${item.id},${item.url},${item.name},${item.method.toUpperCase()},${res[i] && res[i][index] ? res[i][index].response.status : ""},${res[i] && res[i][index] ? res[i][index].response.statusText : ""},${getResponseDuration(res, i, index)},${getResponseSize(res, i, index)},${res[i] && res[i][index] && res[i][index].testResults ? res[i][index].testResults.length : 0},${res[i] && res[i][index] && res[i][index].testResults ? res[i][index].testResults.filter(re => re.result === true).length : 0},${res[i] && res[i][index] && res[i][index].testResults ? res[i][index].testResults.filter(re => re.result === false).length : 0}\n`;
			}
		});
		data = data + "\n";
	}

	return data;
}

function passedRequestsCount(res: IReponseModel[]) {
	let count = 0;
	for (let i = 0; i < res?.length; i++) {
		if (res[i]?.response?.status >= 200 && res[i]?.response?.status < 205) {
			count++;
		}
	}

	return count;
}

function getResponseDuration(res: IReponseModel[][], selectedIteration: number, index: number) {
	return res[selectedIteration] && res[selectedIteration][index] ? res[selectedIteration][index]?.response.isError ? "0 ms" : GetResponseTime(res[selectedIteration][index].response.duration) : "";
}

function getResponseSize(res: IReponseModel[][], selectedIteration: number, index: number) {
	return res[selectedIteration] && res[selectedIteration][index] ? res[selectedIteration][index]?.response.size ? FormatBytes(parseInt(res[selectedIteration][index].response.size)) : "" : "";
}
