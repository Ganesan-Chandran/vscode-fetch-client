import { vsCodeLogger } from "../../extension";
import { ITableData } from "../../fetch-client-ui/components/Common/Table/types";
import { IRequestModel } from "../../fetch-client-ui/components/RequestUI/redux/types";
import { GetResponseTime } from "../../fetch-client-ui/components/ResponseUI/OptionsPanel/OptionTab/util";
import { formatDateWithMs } from "../helper";
import { getLogOption } from "../vscodeConfig";
import { writeLog } from "./logger";

export function logDetails(
	request: IRequestModel,
	reqHeaders: Record<string, string>,
	requestBody: unknown,
	responseStatus: number,
	responseHeaders: ITableData[],
	responseData: unknown,
	duration: number
): void {
	logRequestDetails(request, reqHeaders, requestBody);
	logResponseDetails(responseStatus, responseHeaders, responseData, duration);
}

function logRequestDetails(request: IRequestModel, reqHeaders: Record<string, string>, requestBody: unknown): void {
	try {
		let reqLog = `\n\n-----------------------------------------------------------------------------`;
		reqLog += `\n▶ ${request.method.toUpperCase()}    ${request.url}\n`;
		reqLog += `-----------------------------------------------------------------------------\n`;
		reqLog += `𝘙𝘦𝘲𝘶𝘦𝘴𝘵 𝘋𝘦𝘵𝘢𝘪𝘭𝘴: \n Url: ${request.url}\n Method: ${request.method.toUpperCase()}\n`;
		reqLog += ` Time: ${formatDateWithMs()}\n`;

		if (request.headers.filter(i => i.isChecked).length > 0) {
			reqLog += ` Request Headers:`;
			for (const [prop, val] of Object.entries(reqHeaders)) {
				reqLog += `\n\t${prop}: "${val}"`;
			}
		}

		if (requestBody) {
			reqLog += `\n Request Body:\n`;
			const body = request.body;
			if (body.bodyType === "binary") {
				reqLog += `\tsrc: ${body.binary?.fileName ?? ''}\n`;
			} else if (body.bodyType === "formurlencoded") {
				reqLog += `\t${decodeURIComponent(String(requestBody).replace(/\+/g, ' '))}`;
			} else if (body.bodyType === "formdata") {
				const formData = requestBody as { getBuffer(): Buffer };
				reqLog += `\t${formData.getBuffer()}`;
			} else {
				reqLog += `\t${requestBody}`;
			}
		}

		vsCodeLogger.log("info", reqLog);
	} catch (err) {
		writeLog(`error::logRequestDetails(): ${err}`);
	}
}

function logResponseDetails(status: number, headers: ITableData[], responseData: unknown, duration: number): void {
	try {
		let resLog = `\n𝘙𝘦𝘴𝘱𝘰𝘯𝘴𝘦 𝘋𝘦𝘵𝘢𝘪𝘭𝘴: \n Status: ${status} ${status <= 399 ? "✅" : "❌"}\n`;
		resLog += ` Time: ${GetResponseTime(duration)}\n\n`;

		if (getLogOption()) {
			if (headers.length > 0) {
				resLog += ` Response Headers:\n`;
				for (const { key, value } of headers) {
					resLog += `\t${key}: "${value}"\n`;
				}
			}

			resLog += ` Response Body:\n`;
			resLog += `\t${responseData}`;
		}

		vsCodeLogger.log("info", resLog);
	} catch (err) {
		writeLog(`error::logResponseDetails(): ${err}`);
	}
}
