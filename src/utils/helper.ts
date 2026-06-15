import { checkSysVariable, getSysVariableWithValue } from "../fetch-client-ui/components/Common/Consts/sysVariables";
import { ITableData } from "../fetch-client-ui/components/Common/Table/types";
import { IRequestModel } from "../fetch-client-ui/components/RequestUI/redux/types";
import { ISettings } from "../fetch-client-ui/components/SideBar/redux/types";
import { responseTypes } from "./configuration";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const VARIABLE_PATTERN = /({{([^}}]+)}})/;
const VARIABLE_PATTERN_GLOBAL = /({{([^}}]+)}})/gm;

/** MIME types that map to plain-text / structured-text; treated as non-binary. */
const TEXT_CONTENT_TYPES = [
	"application/json",
	"application/ld+json",
	"application/vnd.api+json",
	"application/xml",
	"text/javascript",
	"application/javascript",
	"text/html",
	"text/css",
	"text/plain",
] as const;

export const MIMETypes: Record<string, string> = {
	"audio/aac": "aac",
	"application/x-abiword": "abw",
	"application/x-freearc": "arc",
	"image/avif": "avif",
	"video/x-msvideo": "avi",
	"application/vnd.amazon.ebook": "azw",
	"application/octet-stream": "bin",
	"image/bmp": "bmp",
	"application/x-bzip": "bz",
	"application/x-bzip2": "bz2",
	"application/x-cdf": "cda",
	"application/x-csh": "csh",
	"text/css": "css",
	"text/csv": "csv",
	"application/msword": "doc",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
	"application/vnd.ms-fontobject": "eot",
	"application/epub+zip": "epub",
	"application/gzip": "gz",
	"image/gif": "gif",
	"text/html": "html",
	"image/vnd.microsoft.icon": "ico",
	"text/calendar": "ics",
	"application/java-archive": "jar",
	"image/jpeg": "jpg",
	"text/javascript": "javascript",
	"application/json": "json",
	"application/ld+json": "json",
	"application/vnd.api+json": "json",
	"audio/midi": "mid",
	"audio/x-midi": "midi",
	"audio/mpeg": "mp3",
	"video/mp4": "mp4",
	"video/mpeg": "mpeg",
	"application/vnd.apple.installer+xml": "mpkg",
	"application/vnd.oasis.opendocument.presentation": "odp",
	"application/vnd.oasis.opendocument.spreadsheet": "ods",
	"application/vnd.oasis.opendocument.text": "odt",
	"audio/ogg": "oga",
	"video/ogg": "ogv",
	"application/ogg": "ogx",
	"audio/opus": "opus",
	"font/otf": "otf",
	"image/png": "png",
	"application/pdf": "pdf",
	"application/x-httpd-php": "php",
	"application/vnd.ms-powerpoint": "ppt",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
	"application/vnd.rar": "rar",
	"application/rtf": "rtf",
	"application/x-sh": "sh",
	"image/svg+xml": "svg",
	"application/x-shockwave-flash": "swf",
	"application/x-tar": "tar",
	"image/tiff": "tif tiff",
	"video/mp2t": "ts",
	"font/ttf": "ttf",
	"text/plain": "plaintext",
	"application/vnd.visio": "vsd",
	"audio/wav": "wav",
	"audio/webm": "weba",
	"video/webm": "webm",
	"image/webp": "webp",
	"font/woff": "woff",
	"font/woff2": "woff2",
	"application/xhtml+xml": "xhtml",
	"application/vnd.ms-excel": "xls",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
	"application/xml ": "xml",
	"application/vnd.mozilla.xul+xml": "xul",
	"application/zip": "zip",
	"video/3gpp": "3gp",
	"audio/3gpp": "3gp",
	"video/3gpp2": "3g2",
	"audio/3gpp2": "3g2",
	"application/x-7z-compressed": "7z",
};

// ---------------------------------------------------------------------------
// Content-type helpers
// ---------------------------------------------------------------------------

export function isFileType(headers: ITableData[]): boolean {
	const item = headers.find(t => t.key.toLowerCase() === "content-type");
	return item ? checkType(item.value) : false;
}

function checkType(value: string): boolean {
	const lower = value.toLowerCase();
	return !TEXT_CONTENT_TYPES.some(type => lower.includes(type));
}

export function getFileType(headers: ITableData[]): string {
	const item = headers.find(t => t.key.toLowerCase() === "content-type");
	if (!item) {
		return "";
	}

	const mimeKey = item.value.includes(";")
		? item.value.toLowerCase().split(";")[0].trim()
		: item.value.toLowerCase().trim();

	return MIMETypes[mimeKey] ?? "";
}

// ---------------------------------------------------------------------------
// Date formatting
// ---------------------------------------------------------------------------

export function formatDate(value?: string): string {
	const t = value ? new Date(value) : new Date();
	const date = String(t.getDate()).padStart(2, "0");
	const hh = String(t.getHours()).padStart(2, "0");
	const mm = String(t.getMinutes()).padStart(2, "0");
	const ss = String(t.getSeconds()).padStart(2, "0");
	return `${date}-${MONTHS[t.getMonth()]}-${t.getFullYear()} ${hh}:${mm}:${ss}`;
}

export function formatDateWithMs(value?: string): string {
	const t = value ? new Date(value) : new Date();
	const date = String(t.getDate()).padStart(2, "0");
	const hh = String(t.getHours()).padStart(2, "0");
	const mm = String(t.getMinutes()).padStart(2, "0");
	const ss = String(t.getSeconds()).padStart(2, "0");
	const ms = String(t.getMilliseconds()).padStart(4, "0");
	return `${date}-${MONTHS[t.getMonth()]}-${t.getFullYear()} ${hh}:${mm}:${ss}:${ms}`;
}

// ---------------------------------------------------------------------------
// Variable substitution
// ---------------------------------------------------------------------------

export function replaceValueWithVariable(request: IRequestModel, varData: Record<string, string>): IRequestModel {
	request.url = replaceDataWithVariable(request.url, varData);

	if (request.params.some(item => item.isChecked)) {
		request.params = replaceTableDataWithVariable(request.params, varData);
	}

	if (request.headers.some(item => item.isChecked)) {
		request.headers = replaceTableDataWithVariable(request.headers, varData);
	}

	request.auth.userName = replaceDataWithVariable(request.auth.userName, varData);
	request.auth.password = replaceDataWithVariable(request.auth.password, varData);
	request.auth.tokenPrefix = replaceDataWithVariable(request.auth.tokenPrefix, varData);

	if (request.auth.aws) {
		request.auth.aws.accessKey = replaceDataWithVariable(request.auth.aws.accessKey, varData);
		request.auth.aws.secretAccessKey = replaceDataWithVariable(request.auth.aws.secretAccessKey, varData);
		request.auth.aws.service = replaceDataWithVariable(request.auth.aws.service, varData);
		request.auth.aws.region = replaceDataWithVariable(request.auth.aws.region, varData);
		request.auth.aws.sessionToken = replaceDataWithVariable(request.auth.aws.sessionToken, varData);
	}

	if (request.body.bodyType === "formurlencoded" && request.body.urlencoded.some(item => item.isChecked)) {
		request.body.urlencoded = replaceTableDataWithVariable(request.body.urlencoded, varData);
	}

	if (request.body.bodyType === "formdata" && request.body.formdata.some(item => item.isChecked)) {
		request.body.formdata = replaceTableDataWithVariable(request.body.formdata, varData);
	}

	if (request.body.bodyType === "raw") {
		request.body.raw.data = replaceDataWithVariable(request.body.raw.data, varData);
	}

	if (request.body.bodyType === "graphql") {
		request.body.graphql.query = replaceDataWithVariable(request.body.graphql.query, varData);
		request.body.graphql.variables = replaceDataWithVariable(request.body.graphql.variables, varData);
	}

	return request;
}

export function replaceAuthSettingsInRequest(request: IRequestModel, settings: ISettings): IRequestModel {
	if (settings.auth) {
		request.auth.authType = settings.auth.authType;
		request.auth.userName = settings.auth.userName;
		request.auth.password = settings.auth.password;
		request.auth.tokenPrefix = settings.auth.tokenPrefix;
		if (request.auth.aws && settings.auth.aws) {
			request.auth.aws.accessKey = settings.auth.aws.accessKey;
			request.auth.aws.secretAccessKey = settings.auth.aws.secretAccessKey;
			request.auth.aws.service = settings.auth.aws.service;
			request.auth.aws.region = settings.auth.aws.region;
			request.auth.aws.sessionToken = settings.auth.aws.sessionToken;
		}
	}

	return request;
}

export function replaceHeaderSettingsInRequest(request: IRequestModel, settings: ISettings): IRequestModel {
	if (settings.headers) {
		for (const header of settings.headers) {
			if (header.isChecked && header.key) {
				const exists = request.headers.some(
					item => item.key.toLowerCase() === header.key.toLowerCase() && item.isChecked
				);
				if (!exists) {
					request.headers.push(header);
				}
			}
		}
	}

	return request;
}

function replaceTableDataWithVariable(data: ITableData[], varData: Record<string, string>): ITableData[] {
	for (const item of data) {
		if (VARIABLE_PATTERN.test(item.key)) {
			item.key.match(VARIABLE_PATTERN_GLOBAL)?.forEach(p => {
				item.key = updateVariable(p, item.key, varData);
			});
		}

		if (VARIABLE_PATTERN.test(item.value)) {
			item.value.match(VARIABLE_PATTERN_GLOBAL)?.forEach(p => {
				item.value = updateVariable(p, item.value, varData);
			});
		}
	}

	return data;
}

export function replaceDataWithVariable(data: string, varData: Record<string, string>): string {
	if (!VARIABLE_PATTERN.test(data)) {
		return data;
	}

	data.match(VARIABLE_PATTERN_GLOBAL)?.forEach(item => {
		data = updateVariable(item, data, varData);
	});

	return data;
}

function updateVariable(item: string, data: string, varData: Record<string, string>): string {
	if (item.includes("{{#") && item.includes("}}")) {
		const variable = checkSysVariable(item);
		if (variable) {
			const value = getSysVariableWithValue(variable);
			data = data.replace(item, value?.toString() ?? item);
		}
	} else if (varData && Object.keys(varData).length > 0) {
		const key = item.replace("{{", "").replace("}}", "");
		const replacedValue = varData[key];
		if (replacedValue !== undefined) {
			data = data.replace(
				item,
				VARIABLE_PATTERN.test(replacedValue)
					? replaceDataWithVariable(replacedValue, varData)
					: replacedValue
			);
		}
	}

	return data;
}

// ---------------------------------------------------------------------------
// Misc utilities
// ---------------------------------------------------------------------------

export function getRandomNumber(digit: number): string {
	return Math.random().toFixed(digit).split('.')[1];
}

export function getErrorResponse() {
	return {
		type: responseTypes.apiResponse,
		response: {
			responseData: "",
			status: 0,
			statusText: "",
			size: "0",
			duration: 0,
			isError: true,
			responseType: {
				isBinaryFile: false,
				format: ""
			}
		},
		headers: [],
		cookies: []
	};
}
