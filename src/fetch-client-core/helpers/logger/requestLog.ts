import { getLogOption } from "../../utils/vscodeConfig";
import { IRequestModel } from "../../types/request.types";
import { ITableData } from "../../types/common.types";
import { vsCodeLogger } from "../../../extension";
import { writeLog } from "./logger";
import { formatDateWithMs, GetResponseTime } from "../dateTime.helper";

export function logDetails(
	request: IRequestModel,
	reqHeaders: Record<string, string>,
	requestBody: unknown,
	responseStatus: number,
	responseHeaders: ITableData[],
	responseData: unknown,
	duration: number
): void {
	try {
		let log = `\n-----------------------------------------------------------------------------\n`;
		log += `▶ ${request.method.toUpperCase()}    ${request.url}\n`;
		log += `-----------------------------------------------------------------------------\n`;
		log += `𝘙𝘦𝘲𝘶𝘦𝘴𝘵 𝘋𝘦𝘵𝘢𝘪𝘭𝘴: \n Url: ${request.url}\n Method: ${request.method.toUpperCase()}\n`;
		log += ` Time: ${formatDateWithMs()}\n`;

		if (request.headers.filter(i => i.isChecked).length > 0) {
			log += ` Request Headers:`;
			for (const [prop, val] of Object.entries(reqHeaders)) {
				log += `\n\t${prop}: "${val}"`;
			}
			log += "\n";
		}

		if (requestBody) {
			log += ` Request Body:\n`;
			const body = request.body;
			if (body.bodyType === "binary") {
				log += `\tsrc: ${body.binary?.fileName ?? ''}\n`;
			} else if (body.bodyType === "formurlencoded") {
				log += `\t${decodeURIComponent(String(requestBody).replace(/\+/g, ' '))}`;
			} else if (body.bodyType === "formdata") {
				const formData = requestBody as { getBuffer(): Buffer };
				log += `\t${formData.getBuffer()}`;
			} else {
				log += `\t${requestBody}`;
			}

			log += "\n";
		}

		log += `\n𝘙𝘦𝘴𝘱𝘰𝘯𝘴𝘦 𝘋𝘦𝘵𝘢𝘪𝘭𝘴: \n Status: ${responseStatus} ${responseStatus <= 399 ? "✅" : "❌"}\n`;
		log += ` Time: ${GetResponseTime(duration)}\n`;

		if (getLogOption()) {
			if (responseHeaders.length > 0) {
				log += ` Response Headers:\n`;
				for (const { key, value } of responseHeaders) {
					log += `\t${key}: "${value}"\n`;
				}
			}

			log += ` Response Body:\n`;
			log += `\t${responseData}`;
			log += "\n\n";
		} else {
			log += "\n";
		}

		vsCodeLogger.log("info", log);
	} catch (err) {
		writeLog(`error::logRequestDetails(): ${err}`);
	}
}
