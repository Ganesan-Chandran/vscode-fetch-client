import { vsCodeLogger } from "../../extension";
import { ITableData } from "../../fetch-client-ui/components/Common/Table/types";
import { IRequestModel } from "../../fetch-client-ui/components/RequestUI/redux/types";
import { GetResponseTime } from "../../fetch-client-ui/components/ResponseUI/OptionsPanel/OptionTab/util";
import { formatDateWithMs } from "../helper";
import { getLogOption } from "../vscodeConfig";
import { writeLog } from "./logger";

export function logDetails(request: IRequestModel, reqHeaders: {}, requestBody: any, responseStatus: number, responseHeaders: ITableData[], responseData: any, duration: number) {
	logRequestDeatils(request, reqHeaders, requestBody);
	logResponseDeatils(responseStatus, responseHeaders, responseData, duration);
}

function logRequestDeatils(request: IRequestModel, reqHeaders: {}, requestBody: any) {
	try {
		let reqLog = `\n\n-----------------------------------------------------------------------------`;
		reqLog = reqLog + `\n▶ ${request.method.toUpperCase()}    ${request.url}\n`;
		reqLog = reqLog + `-----------------------------------------------------------------------------\n`;
		reqLog = reqLog + `𝘙𝘦𝘲𝘶𝘦𝘴𝘵 𝘋𝘦𝘵𝘢𝘪𝘭𝘴: \n Url: ${request.url}\n Method: ${request.method.toUpperCase()}\n`;
		reqLog = reqLog + ` Time: ${formatDateWithMs()}\n`;
		if (request.headers.filter(i => i.isChecked)?.length > 0) {
			reqLog = reqLog + ` Request Headers:`;
			for (var prop in reqHeaders) {
				reqLog = reqLog + `\n	${prop}: "${reqHeaders[prop]}"`;
			}
		}

		if (requestBody) {
			reqLog = reqLog + `\n Request Body:\n`;
			if (request.body.bodyType === "binary") {
				reqLog = reqLog + `	src: ${request.body.binary.fileName}\n`;
			} else if (request.body.bodyType === "formurlencoded") {
				reqLog = reqLog + `	${decodeURIComponent(requestBody.toString().replace(/\+/g, ' '))}`;
			} else if (request.body.bodyType === "formdata") {
				reqLog = reqLog + `	${requestBody.getBuffer()}`;
			} else {
				reqLog = reqLog + `	${requestBody}`;
			}
		}

		vsCodeLogger.log("INFO", reqLog);

	} catch (err) {
		writeLog("error::logRequestDeatils(): " + err);
	}
}

function logResponseDeatils(status: number, headers: ITableData[], responseData: any, duration: number) {
	try {
		let resLog = `\n𝘙𝘦𝘴𝘱𝘰𝘯𝘴𝘦 𝘋𝘦𝘵𝘢𝘪𝘭𝘴: \n Status: ${status} ${status <= 399 ? "✅" : "❌"}\n`;
		resLog = resLog + ` Time: ${GetResponseTime(duration)}\n\n`;

		if (getLogOption()) {
			if (headers.length > 0) {
				resLog = resLog + ` Response Headers:\n`;
				headers.forEach(({ key, value }) => {
					resLog = resLog + `	${key}: "${value}"\n`;
				});
			}

			resLog = resLog + ` Response Body:\n`;
			resLog = resLog + `	${responseData}`;
		}

		vsCodeLogger.log("INFO", resLog);
	} catch (err) {
		writeLog("error::logResponseDeatils(): " + err);
	}
}
