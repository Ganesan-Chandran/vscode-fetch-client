import { InitialAuth, InitialBinaryData, InitialBody, InitialPreFetch, InitialSetVar, InitialTest } from "../../fetch-client-ui/components/RequestUI/redux/reducer";
import { ITableData } from "../../fetch-client-core/types/common.types";
import { MethodType, IRequestModel } from "../../fetch-client-core/types/request.types";
import { MIMETypes } from "../../fetch-client-core/consts/mimetype.consts";
import { v4 as uuidv4 } from 'uuid';
import { writeLog } from "../logger/logger";
import { XMLValidator } from "fast-xml-parser";
import parser from "yargs-parser";

const VALID_METHODS = new Set<MethodType>(["get", "post", "put", "patch", "delete", "options", "head"]);

const isJson = (str: string): boolean => {
	try {
		JSON.parse(str);
		return true;
	} catch {
		return false;
	}
};

const removeQuotes = (str: string): string =>
	str.trim().replace(/^["\u201C\u201D'\u2018\u2019]+|["\u201C\u201D'\u2018\u2019]+$/g, "");

const stringIsUrl = (url: string): boolean =>
	/(?:^|[ \t])((https?:\/\/)?(?:localhost|\d{1,3}(?:\.\d{1,3}){3}|\[[\da-fA-F:]+\]|[\w-]+(?:\.[\w-]+)+)(:\d+)?(\/\S*)?)/.test(url);

const parseField = (str: string): string[] => str.split(/: (.+)/);

const generateFormUrlEncode = (data: string): ITableData[] => {
	const searchParams = new URLSearchParams(data);
	const params: ITableData[] = [];
	for (const [key, value] of searchParams) {
		if (key?.trim()) {
			params.push({ isChecked: true, key: key.trim(), value: value.trim() });
		}
	}
	params.push({ isChecked: false, key: "", value: "" });
	return params;
};

const createInitialRequest = (): IRequestModel => ({
	id: uuidv4(),
	url: "",
	name: "",
	createdTime: "",
	method: "get",
	params: [],
	auth: JSON.parse(JSON.stringify(InitialAuth)),
	headers: [],
	body: JSON.parse(JSON.stringify(InitialBody)),
	tests: JSON.parse(JSON.stringify(InitialTest)),
	setvar: JSON.parse(JSON.stringify(InitialSetVar)),
	notes: "",
	preFetch: JSON.parse(JSON.stringify(InitialPreFetch)),
});

const getContentTypeHeader = (request: IRequestModel): string | undefined =>
	request.headers.find(item => item.key.toLowerCase() === "content-type")?.value;

const checkAuthHeader = (request: IRequestModel, field: string[]): boolean => {
	if (field[0]?.toLowerCase() !== "authorization" || !field[1]) {
		return false;
	}

	const authValue = field[1];
	const authValueLower = authValue.toLowerCase();

	if (authValueLower.includes("bearer ")) {
		request.auth.authType = "bearertoken";
		request.auth.password = authValue.replace(/bearer /i, "");
		request.auth.tokenPrefix = "Bearer";
		return true;
	}

	if (authValueLower.startsWith("basic ")) {
		try {
			const decoded = atob(authValue.substring(6));
			const colonIndex = decoded.indexOf(":");
			if (colonIndex !== -1) {
				request.auth.authType = "basic";
				request.auth.userName = decoded.substring(0, colonIndex);
				request.auth.password = decoded.substring(colonIndex + 1);
				return true;
			}
		} catch {
			// Invalid base64 — fall through to add as a regular header
		}
	}

	return false;
};

const addHeader = (request: IRequestModel, item: string): void => {
	const field = parseField(item);
	if (!field[0]?.trim() || field[1] === undefined) {
		return;
	}
	if (!checkAuthHeader(request, field)) {
		request.headers.push({ isChecked: true, key: field[0], value: field[1] });
	}
};

const parseHeader = (request: IRequestModel, header: string | string[]): void => {
	if (Array.isArray(header)) {
		header.forEach(item => addHeader(request, item));
	} else {
		addHeader(request, header);
	}
};

const parseDataUrlEncode = (request: IRequestModel, data: string | string[]): ITableData[] => {
	const contentTypeHeader = getContentTypeHeader(request);
	if (!contentTypeHeader) {
		request.headers.push({
			isChecked: true,
			key: "Content-Type",
			value: "application/x-www-form-urlencoded",
		});
	}

	if (Array.isArray(data)) {
		const encoded = data.map(item => encodeURI(item)).join("&");
		return generateFormUrlEncode(encoded);
	}

	return generateFormUrlEncode(data);
};

const parseFormData = (data: string | string[]): ITableData[] => {
	const items = Array.isArray(data) ? data : [data];
	const formdata: ITableData[] = [];
	for (const item of items) {
		const eqIndex = item.indexOf("=");
		if (eqIndex === -1) { continue; }
		const key = item.substring(0, eqIndex).trim();
		const val = item.substring(eqIndex + 1).trim();
		if (!key) { continue; }
		const isFile = val.startsWith("@");
		formdata.push({
			isChecked: true,
			key,
			value: isFile ? val.substring(1) : val,
			type: isFile ? "File" : "Text",
		});
	}
	formdata.push({ isChecked: false, key: "", value: "" });
	return formdata;
};

const parseData = (request: IRequestModel, data: string): void => {
	const contentTypeHeader = getContentTypeHeader(request);

	if (contentTypeHeader?.includes("application/x-www-form-urlencoded")) {
		request.body.urlencoded = parseDataUrlEncode(request, data);
		request.body.bodyType = "formurlencoded";
	} else if (contentTypeHeader?.includes("application/json")) {
		request.body.bodyType = "raw";
		request.body.raw.lang = "json";
		request.body.raw.data = isJson(data) ? JSON.parse(data) : data;
	} else if (
		contentTypeHeader?.includes("application/xml") ||
		contentTypeHeader?.includes("text/xml")
	) {
		request.body.bodyType = "raw";
		if (XMLValidator.validate(data) === true) {
			request.body.raw.data = data;
			request.body.raw.lang = "xml";
		}
	} else if (
		contentTypeHeader?.includes("application/html") ||
		contentTypeHeader?.includes("text/html")
	) {
		request.body.raw.data = data;
		request.body.raw.lang = "html";
		request.body.bodyType = "raw";
	} else if (contentTypeHeader?.includes("text/plain")) {
		request.body.raw.data = data;
		request.body.raw.lang = "text";
		request.body.bodyType = "raw";
	} else if (contentTypeHeader && MIMETypes[contentTypeHeader]) {
		request.body.binary = { ...JSON.parse(JSON.stringify(InitialBinaryData)), data };
		request.body.bodyType = "binary";
	} else if (isJson(data)) {
		request.headers.push({ isChecked: true, key: "Content-Type", value: "application/json" });
		request.body.raw.data = JSON.parse(data);
		request.body.raw.lang = "json";
	} else if (XMLValidator.validate(data) === true) {
		request.headers.push({ isChecked: true, key: "Content-Type", value: "text/xml" });
		request.body.raw.data = data;
		request.body.raw.lang = "xml";
	} else {
		request.body.raw.data = data;
		request.body.raw.lang = "text";
		request.body.bodyType = "raw";
	}
};

const ensurePostMethod = (request: IRequestModel): void => {
	if (
		request.method === "get" ||
		request.method === "options" ||
		request.method === "head"
	) {
		request.method = "post";
	}
};

export const ConvertCurlToRequest = (curlRequest: string): IRequestModel | null => {
	try {
		if (!curlRequest?.trim()) {
			return null;
		}

		let normalized = curlRequest.trim();

		if (!normalized.toLowerCase().startsWith("curl ")) {
			return null;
		}

		normalized = normalized.replace(/^\s+|\s+$/gm, "").replace(/(\r\n|\n|\r)/gm, " ");

		const argvs = parser(normalized);
		const request = createInitialRequest();
		let isGetFlag = false;

		for (const [argv, value] of Object.entries(argvs)) {
			switch (argv) {
				case "_": {
					(value as string[]).forEach((item: string) => {
						const cleaned = removeQuotes(item);
						if (stringIsUrl(cleaned)) {
							request.url = cleaned;
						}
					});
					break;
				}

				case "X":
				case "request": {
					const method = String(value).toLowerCase() as MethodType;
					if (VALID_METHODS.has(method)) {
						request.method = method;
					}
					break;
				}

				case "H":
				case "header":
					parseHeader(request, value as string | string[]);
					break;

				case "u":
				case "user": {
					const [username, password] = String(value).split(":");
					request.auth.authType = "basic";
					request.auth.userName = username ?? "";
					request.auth.password = password ?? "";
					break;
				}

				case "A":
				case "user-agent":
					request.headers.push({ isChecked: true, key: "user-agent", value: String(value) });
					break;

				case "I":
				case "head":
					request.method = "head";
					break;

				case "b":
				case "cookie": {
					const cookieValue = Array.isArray(value)
						? (value as string[]).join("; ")
						: String(value);
					request.headers.push({ isChecked: true, key: "Cookie", value: cookieValue });
					break;
				}

				case "d":
				case "data":
				case "data-raw":
				case "data-ascii": {
					const dataStr = Array.isArray(value)
						? (value as string[]).join("&")
						: String(value);
					parseData(request, dataStr);
					ensurePostMethod(request);
					break;
				}

				case "data-urlencode":
					request.body.urlencoded = parseDataUrlEncode(request, value as string | string[]);
					request.body.bodyType = "formurlencoded";
					ensurePostMethod(request);
					break;

				case "data-binary": {
					const rawBinary = String(value);
					request.body.binary = {
						...JSON.parse(JSON.stringify(InitialBinaryData)),
						data: rawBinary.startsWith("@") ? rawBinary.substring(1) : rawBinary,
					};
					request.body.bodyType = "binary";
					ensurePostMethod(request);
					break;
				}

				case "compressed": {
					const hasAcceptEncoding = request.headers.some(
						item => item.key.toLowerCase() === "accept-encoding"
					);
					if (!hasAcceptEncoding) {
						request.headers.push({
							isChecked: true,
							key: "Accept-Encoding",
							value: typeof value === "boolean" ? "gzip, deflate" : String(value),
						});
					}
					break;
				}

				case "G":
				case "get":
					isGetFlag = true;
					request.method = "get";
					break;

				case "url": {
					const urlValue = removeQuotes(String(value));
					if (stringIsUrl(urlValue)) {
						request.url = urlValue;
					}
					break;
				}

				case "F":
				case "form":
					request.body.formdata = parseFormData(value as string | string[]);
					request.body.bodyType = "formdata";
					ensurePostMethod(request);
					break;

				case "e":
				case "referer":
				case "referrer":
					request.headers.push({ isChecked: true, key: "Referer", value: String(value) });
					break;

				case "oauth2Bearer":
				case "oauth2-bearer":
					request.auth.authType = "bearertoken";
					request.auth.password = String(value);
					request.auth.tokenPrefix = "Bearer";
					break;

				default:
					break;
			}
		}

		if (isGetFlag) {
			const queryParts: string[] = [];
			if (request.body.urlencoded?.some(p => p.key.trim())) {
				request.body.urlencoded
					.filter(p => p.key.trim())
					.forEach(p => queryParts.push(`${p.key}=${p.value}`));
				request.body.urlencoded = [];
			} else if (request.body.raw?.data && typeof request.body.raw.data === "string") {
				queryParts.push(request.body.raw.data);
				request.body.raw.data = "";
			}
			if (queryParts.length > 0) {
				const queryParams = new URLSearchParams(queryParts.join("&"));
				for (const [key, val] of queryParams) {
					if (key?.trim()) {
						request.params.push({ isChecked: true, key: key.trim(), value: val.trim() });
					}
				}
			}
			request.body.bodyType = "none";
		}

		request.params.push({ isChecked: false, key: "", value: "" });
		request.headers.push({ isChecked: false, key: "", value: "" });

		return request;
	} catch (err) {
		writeLog("error::ConvertCurlToRequest(): " + err);
		return null;
	}
};
