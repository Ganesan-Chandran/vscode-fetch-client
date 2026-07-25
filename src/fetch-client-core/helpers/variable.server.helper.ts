import { IRequestModel } from "../types/request.types";
import { ISettings } from "../types/sidebar.types";
import { ITableData } from "../types/common.types";
import { getSecretCached } from "../utils/secretMangerService/awsConnectivityService";
import { replacePlainVariable, replaceSysVariable } from "./variable.helper";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VARIABLE_PATTERN = /({{([^}}]+)}})/;
const VARIABLE_PATTERN_GLOBAL = /({{([^}}]+)}})/gm;
const AWS_KEY_REGEX = /^aws:([^:{}]+):([^:{}]+)(?::([^:{}]+))?$/;

// ---------------------------------------------------------------------------
// Variable substitution
// ---------------------------------------------------------------------------

export async function replaceValueWithVariable(
	request: IRequestModel,
	varData: Record<string, string>,
): Promise<IRequestModel> {
	request.url = await replaceDataWithVariable(request.url, varData);

	if (request.params.some((item) => item.isChecked)) {
		request.params = await replaceTableDataWithVariable(request.params, varData);
	}

	if (request.headers.some((item) => item.isChecked)) {
		request.headers = await replaceTableDataWithVariable(request.headers, varData);
	}

	request.auth.userName = await replaceDataWithVariable(
		request.auth.userName,
		varData,
	);
	request.auth.password = await replaceDataWithVariable(
		request.auth.password,
		varData,
	);
	request.auth.tokenPrefix = await replaceDataWithVariable(
		request.auth.tokenPrefix,
		varData,
	);

	if (request.auth?.aws) {
		request.auth.aws.accessKey = await replaceDataWithVariable(
			request.auth.aws.accessKey,
			varData,
		);
		request.auth.aws.secretAccessKey = await replaceDataWithVariable(
			request.auth.aws.secretAccessKey,
			varData,
		);
		request.auth.aws.service = await replaceDataWithVariable(
			request.auth.aws.service,
			varData,
		);
		request.auth.aws.region = await replaceDataWithVariable(
			request.auth.aws.region,
			varData,
		);
		request.auth.aws.sessionToken = await replaceDataWithVariable(
			request.auth.aws.sessionToken,
			varData,
		);
	}

	if (request.auth?.oauth) {
		request.auth.oauth.authorizationUrl = await replaceDataWithVariable(request.auth.oauth.authorizationUrl, varData);
		request.auth.oauth.username = await replaceDataWithVariable(request.auth.oauth.username, varData);
		request.auth.oauth.tokenUrl = await replaceDataWithVariable(request.auth.oauth.tokenUrl, varData);
		request.auth.oauth.tokenName = await replaceDataWithVariable(request.auth.oauth.tokenName, varData);
		request.auth.oauth.scope = await replaceDataWithVariable(request.auth.oauth.scope, varData);
		request.auth.oauth.password = await replaceDataWithVariable(request.auth.oauth.password, varData);
		request.auth.oauth.clientSecret = await replaceDataWithVariable(request.auth.oauth.clientSecret, varData);
		request.auth.oauth.clientId = await replaceDataWithVariable(request.auth.oauth.clientId, varData);
		if (request.auth?.oauth?.advancedOpt) {
			request.auth.oauth.advancedOpt.audience = await replaceDataWithVariable(request.auth.oauth.advancedOpt?.audience, varData);
			request.auth.oauth.advancedOpt.resource = await replaceDataWithVariable(request.auth.oauth.advancedOpt?.resource, varData);
		}
	}

	if (
		request.body.bodyType === "formurlencoded" &&
		request.body.urlencoded.some((item) => item.isChecked)
	) {
		request.body.urlencoded = await replaceTableDataWithVariable(
			request.body.urlencoded,
			varData,
		);
	}

	if (
		request.body.bodyType === "formdata" &&
		request.body.formdata.some((item) => item.isChecked)
	) {
		request.body.formdata = await replaceTableDataWithVariable(
			request.body.formdata,
			varData,
		);
	}

	if (request.body.bodyType === "raw") {
		request.body.raw.data = await replaceDataWithVariable(
			request.body.raw.data,
			varData,
		);
	}

	if (request.body.bodyType === "graphql") {
		request.body.graphql.query = await replaceDataWithVariable(
			request.body.graphql.query,
			varData,
		);
		request.body.graphql.variables = await replaceDataWithVariable(
			request.body.graphql.variables,
			varData,
		);
	}

	return request;
}

export function replaceAuthSettingsInRequest(
	request: IRequestModel,
	settings: ISettings,
): IRequestModel {
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
		if (request.auth.oauth && settings.auth.oauth) {
			request.auth.oauth.authorizationUrl = settings.auth.oauth.authorizationUrl;
			request.auth.oauth.clientAuth = settings.auth.oauth.clientAuth;
			request.auth.oauth.clientId = settings.auth.oauth.clientId;
			request.auth.oauth.clientSecret = settings.auth.oauth.clientSecret;
			request.auth.oauth.grantType = settings.auth.oauth.grantType;
			request.auth.oauth.password = settings.auth.oauth.password;
			request.auth.oauth.scope = settings.auth.oauth.scope;
			request.auth.oauth.tokenName = settings.auth.oauth.tokenName;
			request.auth.oauth.tokenUrl = settings.auth.oauth.tokenUrl;
			request.auth.oauth.username = settings.auth.oauth.username;
			request.auth.oauth.advancedOpt.audience = settings.auth.oauth?.advancedOpt?.audience;
			request.auth.oauth.advancedOpt.resource = settings.auth.oauth?.advancedOpt?.resource;
		}
	}

	return request;
}

export function replaceHeaderSettingsInRequest(
	request: IRequestModel,
	settings: ISettings,
): IRequestModel {
	if (settings.headers) {
		for (const header of settings.headers) {
			if (header.isChecked && header.key) {
				const exists = request.headers.some(
					(item) =>
						item.key.toLowerCase() === header.key.toLowerCase() &&
						item.isChecked,
				);
				if (!exists) {
					request.headers.push(header);
				}
			}
		}
	}

	return request;
}

export async function replaceDataWithVariable(
	data: string,
	varData: Record<string, string>,
): Promise<string> {
	if (!data || !VARIABLE_PATTERN.test(data)) {
		return data;
	}

	const matches = data.match(VARIABLE_PATTERN_GLOBAL) ?? [];
	for (const p of matches) {
		data = await updateVariable(p, data, varData);
	}

	return data;
}

async function replaceTableDataWithVariable(
	data: ITableData[],
	varData: Record<string, string>,
): Promise<ITableData[]> {
	for (const item of data) {
		item.key = await replaceDataWithVariable(item.key, varData);
		item.value = await replaceDataWithVariable(item.value, varData);
	}

	return data;
}

async function updateVariable(
	item: string,
	data: string,
	varData: Record<string, string>,
): Promise<string> {

	if (item.startsWith("{{#") && item.includes("}}")) {
		return replaceSysVariable(item, data);
	}

	if (item.startsWith("{{aws:") && item.includes("}}")) {
		return await replaceAwsSecretVariable(item, data);
	}

	if (Object.keys(varData).length > 0) {
		return replacePlainVariable(item, data, varData);
	}

	return data;
}

async function replaceAwsSecretVariable(
	item: string,
	data: string,
): Promise<string> {
	const key = item.replace(/^{{/, "").replace(/}}$/, "").trim();
	const match = AWS_KEY_REGEX.exec((key ?? "").trim());
	if (!match) {
		return data;
	}

	const [, profile, secretName, jsonKey] = match;
	const secretData = await getSecretCached(profile, secretName);
	if (!secretData?.raw) {
		return data;
	}

	let replacedValue: unknown;
	if (jsonKey) {
		try {
			replacedValue = JSON.parse(secretData.raw)?.[jsonKey];
		} catch {
			return data;
		}
	} else {
		replacedValue = secretData.raw;
	}

	if (replacedValue === undefined || replacedValue === null) {
		return data;
	}

	return data.replace(item, String(replacedValue));
}
