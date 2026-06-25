import { access } from "fs/promises";
import { createReadStream } from "fs";
import { getSSLConfiguration, getProtocolConfiguration } from "./vscodeConfig";
import { IReqSettings } from '../types/prefetch.types';
import { IRequestModel } from '../types/request.types';
import { ISettings } from '../types/sidebar.types';
import { isFileType, getFileType, getErrorResponse, getRandomNumber } from "../helpers/common.helper";
import { ITableData } from '../types/common.types';
import { logDetails } from "../helpers/logger/requestLog";
import { replaceAuthSettingsInRequest, replaceHeaderSettingsInRequest, replaceValueWithVariable } from "../helpers/variable.helper";
import { Request as awsRequest, sign } from 'aws4';
import { responseTypes } from "../consts/requestTypes.consts";
import { writeLog } from "../helpers/logger/logger";
import * as https from "https";
import axios, { AxiosRequestConfig, CancelTokenSource } from "axios";
import FormData from 'form-data';

export interface FetchConfig {
	timeOut: number;
	headersCase: boolean;
	runMainRequest?: boolean;
	source?: CancelTokenSource;
}

type RequestBody = string | FormData | URLSearchParams | Buffer;

// ---------------------------------------------------------------------------
// Request pre-processing helpers
// ---------------------------------------------------------------------------

export const updateAuthSettings = (requestData: IRequestModel, settings?: ISettings): IRequestModel => {
	if (settings && requestData.auth.authType === "inherit") {
		const copy: IRequestModel = JSON.parse(JSON.stringify(requestData));
		return replaceAuthSettingsInRequest(copy, settings);
	}
	return requestData;
};

export const updateHeaderSettings = (requestData: IRequestModel, settings?: ISettings): IRequestModel => {
	if (settings?.headers && settings.headers.length > 0) {
		const copy: IRequestModel = JSON.parse(JSON.stringify(requestData));
		return replaceHeaderSettingsInRequest(copy, settings);
	}
	return requestData;
};

export const updateVariables = (requestData: IRequestModel, variableData?: ITableData[]): IRequestModel => {
	const varData: Record<string, string> = {};
	if (variableData && variableData.length > 0) {
		for (const item of variableData) {
			varData[item.key] = item.value;
		}
	}
	const copy: IRequestModel = JSON.parse(JSON.stringify(requestData));
	return replaceValueWithVariable(copy, varData);
};

// ---------------------------------------------------------------------------
// Main fetch
// ---------------------------------------------------------------------------

export const apiFetch = async (
	requestData: IRequestModel,
	variableData: ITableData[],
	settings: ISettings,
	reqSettings: IReqSettings,
	fetchConfig: FetchConfig,
	resType: string = responseTypes.apiResponse
) => {
	const reqHeaders: Record<string, string> = {};
	let fetchDuration = 0;
	let reqData: RequestBody = "";

	let request = updateAuthSettings(requestData, settings);
	request = updateVariables(request, variableData);

	if (!reqSettings || !reqSettings.skipParentHeaders) {
		request = updateHeaderSettings(request, settings);
	}

	try {
		// --- Auth headers ---
		if (request.auth.authType === "bearertoken" || request.auth.authType === "oauth2") {
			const headerKey = fetchConfig.headersCase ? "Authorization" : "authorization";
			reqHeaders[headerKey] = `${request.auth.tokenPrefix} ${request.auth.password}`;
		}

		for (const { isChecked, key, value } of request.headers) {
			if (isChecked && key) {
				reqHeaders[fetchConfig.headersCase ? key : key.toLocaleLowerCase()] = value;
			}
		}

		// --- Build request body ---
		if (request.body.bodyType === "formdata") {
			const bodyFormData = new FormData();
			for (const { isChecked, key, value, type } of request.body.formdata) {
				if (isChecked && key) {
					if (type === "File") {
						try {
							await access(value);
						} catch {
							throw new Error(`Error : ENOENT: No such file or directory - ${value}`);
						}
						bodyFormData.append(key, createReadStream(value));
					} else {
						bodyFormData.append(key, value);
					}
				}
			}
			reqData = bodyFormData;
		} else if (request.body.bodyType === "formurlencoded") {
			const bodyUrlEncoded = new URLSearchParams();
			for (const { isChecked, key, value } of request.body.urlencoded) {
				if (isChecked && key) {
					bodyUrlEncoded.append(key, value);
				}
			}
			reqData = bodyUrlEncoded;
		} else if (request.body.bodyType === "raw") {
			reqData = request.body.raw.data;
		} else if (request.body.bodyType === "binary") {
			if (!request.body.binary.data) {
				throw new Error(`Error : ENOENT: No such file or directory - ${request.body.binary.fileName}`);
			}
			reqData = request.body.binary.data as Buffer;
		} else if (request.body.bodyType === "graphql") {
			reqData = JSON.stringify({
				query: request.body.graphql.query,
				variables: request.body.graphql.variables,
			});
		}

		// --- Content-Type header ---
		if (request.body.bodyType === "formdata") {
			const formHeaders = (reqData as FormData).getHeaders();
			reqHeaders[fetchConfig.headersCase ? "Content-Type" : "content-type"] =
				formHeaders["content-type"] ?? getContentType("formdata", "");
		} else if (request.body.bodyType !== "none" && !reqHeaders["Content-Type"] && !reqHeaders["content-type"]) {
			reqHeaders[fetchConfig.headersCase ? "Content-Type" : "content-type"] =
				getContentType(request.body.bodyType, request.body.bodyType === "raw" ? request.body.raw.lang : "");
		}

		// --- SSL ---
		(https.globalAgent as { options: { rejectUnauthorized?: boolean } }).options.rejectUnauthorized = getSSLConfiguration();

		// Use a per-request instance to prevent interceptors from stacking on the global instance
		const instance = axios.create({ withCredentials: true });
		let startTime = 0;
		instance.interceptors.request.use((config) => { startTime = Date.now(); return config; });
		instance.interceptors.response.use((config) => { fetchDuration = Date.now() - startTime; return config; });

		const url = validateURL(request.url)
			? request.url
			: `${getProtocolConfiguration()}://${request.url}`;
		request.url = url;

		let requestConfig: AxiosRequestConfig;

		if (request.auth.authType === "aws") {
			const baseRequest: awsRequest = {
				host: getHost(url),
				method: request.method.toUpperCase(),
				path: getPath(url),
				headers: reqHeaders,
				...(request.auth.aws.service && { service: request.auth.aws.service }),
				...(request.auth.aws.region && { region: request.auth.aws.region }),
			};

			if (reqData) {
				if (request.body.bodyType === "formdata") {
					baseRequest.body = (reqData as FormData).getBuffer();
				} else if (request.body.bodyType === "formurlencoded") {
					baseRequest.body = JSON.stringify((reqData as URLSearchParams).toString());
				} else {
					baseRequest.body = JSON.stringify(reqData);
				}
			}

			const signedRequest = sign(baseRequest, {
				secretAccessKey: request.auth.aws.secretAccessKey,
				accessKeyId: request.auth.aws.accessKey,
				sessionToken: request.auth.aws.sessionToken,
			});

			if (signedRequest.headers) {
				delete signedRequest.headers.Host;
				delete signedRequest.headers['Content-Length'];
			}

			requestConfig = {
				url,
				method: signedRequest.method as AxiosRequestConfig['method'],
				headers: signedRequest.headers as AxiosRequestConfig['headers'],
				data: reqData,
				validateStatus: () => true,
				transformResponse: [(data: unknown) => data],
				timeout: fetchConfig.timeOut,
				responseType: 'arraybuffer',
				maxContentLength: Infinity,
				maxBodyLength: Infinity,
			};
		} else {
			requestConfig = {
				url,
				method: request.method,
				headers: reqHeaders,
				auth: request.auth.authType === "basic"
					? { username: request.auth.userName, password: request.auth.password }
					: undefined,
				data: reqData,
				validateStatus: () => true,
				transformResponse: [(data: unknown) => data],
				timeout: fetchConfig.timeOut,
				responseType: 'arraybuffer',
				maxContentLength: Infinity,
				maxBodyLength: Infinity,
			};
		}

		if (fetchConfig.source) {
			requestConfig.cancelToken = fetchConfig.source.token;
		}

		const resp = await instance(requestConfig);
		const respHeaders: ITableData[] = [];
		const resCookies: ITableData[] = [];
		let responseData: string | undefined;
		let cookieData: string | string[] | undefined;

		for (const [key, value] of Object.entries(resp.headers)) {
			if (key.trim().toLowerCase() === "set-cookie") {
				cookieData = value as string | string[];
			}
			respHeaders.push({ isFixed: true, key, value: String(value) });
		}

		const isFile = isFileType(respHeaders);

		if (!isFile) {
			responseData = new Uint8Array(resp.data as ArrayBuffer).reduce(
				(data, byte) => data + String.fromCharCode(byte),
				''
			);
		}

		if (cookieData) {
			const cookieEntries = typeof cookieData === 'string' ? cookieData.split(";") : cookieData;
			for (const raw of cookieEntries) {
				const entry = raw.trim();
				const eqIdx = entry.indexOf("=");
				if (eqIdx !== -1) {
					resCookies.push({
						isFixed: true,
						isChecked: true,
						key: entry.substring(0, eqIdx),
						value: entry.substring(eqIdx + 1),
					});
				}
			}
		}

		setTimeout(() => {
			logDetails(request, reqHeaders, reqData, resp.status, respHeaders,
				isFile ? "View Response is not supported for 'file' type in the log window." : responseData,
				fetchDuration);
		}, 500);

		return {
			type: resType,
			response: {
				responseData: isFile ? resp.data : responseData,
				status: resp.status,
				statusText: resp.statusText,
				size: (resp.data as ArrayBuffer).byteLength,
				duration: fetchDuration,
				isError: false,
				responseType: {
					isBinaryFile: isFile,
					format: getFileType([...respHeaders]),
				},
			},
			headers: respHeaders,
			cookies: resCookies,
		};
	} catch (err) {
		const error = err as Error;
		writeLog("error::apiFetch(): " + error);

		const apiResponse = getErrorResponse();
		apiResponse.response.responseData = axios.isCancel(err)
			? `Request cancelled: ${error.message}`
			: error.message;

		setTimeout(() => {
			logDetails(request, reqHeaders, reqData, apiResponse.response.status,
				apiResponse.headers as ITableData[], error.message, fetchDuration);
		}, 500);

		return apiResponse;
	}
};

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

const RAW_CONTENT_TYPES: Record<string, string> = {
	json: "application/json",
	html: "text/html",
	xml: "text/xml",
	text: "text/plain",
};

function getRawContentType(rawType: string): string {
	return RAW_CONTENT_TYPES[rawType] ?? "text/plain";
}

function getContentType(type: string, rawLang: string): string {
	switch (type) {
		case "formdata":
			return `multipart/form-data; boundary=${generateBoundaryValue()}`;
		case "formurlencoded":
			return "application/x-www-form-urlencoded";
		case "raw":
			return getRawContentType(rawLang);
		case "graphql":
			return "application/json";
		default:
			return "application/octet-stream";
	}
}

function generateBoundaryValue(): string {
	return `--------------------------${getRandomNumber(25)}`;
}

function validateURL(url: string): boolean {
	return url.startsWith("http://") || url.startsWith("https://");
}

function getHost(urlString: string): string {
	return new URL(urlString).host;
}

function getPath(urlString: string): string {
	return new URL(urlString).pathname;
}
