import { IRequestModel } from "../types/request.types";
import { ISettings } from "../types/sidebar.types";
import { ITableData } from "../types/common.types";
import {
	checkSysVariable,
	getSysVariableWithValue,
} from "./systemVariable.helper";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VARIABLE_PATTERN = /({{([^}}]+)}})/;
const VARIABLE_PATTERN_GLOBAL = /({{([^}}]+)}})/gm;

// ---------------------------------------------------------------------------
// Variable substitution
// ---------------------------------------------------------------------------

export function replaceValueWithVariable(
	request: IRequestModel,
	varData: Record<string, string>,
): IRequestModel {
	request.url = replaceDataWithVariable(request.url, varData);

	if (request.params.some((item) => item.isChecked)) {
		request.params = replaceTableDataWithVariable(request.params, varData);
	}

	if (request.headers.some((item) => item.isChecked)) {
		request.headers = replaceTableDataWithVariable(request.headers, varData);
	}

	request.auth.userName = replaceDataWithVariable(
		request.auth.userName,
		varData,
	);
	request.auth.password = replaceDataWithVariable(
		request.auth.password,
		varData,
	);
	request.auth.tokenPrefix = replaceDataWithVariable(
		request.auth.tokenPrefix,
		varData,
	);

	if (request.auth.aws) {
		request.auth.aws.accessKey = replaceDataWithVariable(
			request.auth.aws.accessKey,
			varData,
		);
		request.auth.aws.secretAccessKey = replaceDataWithVariable(
			request.auth.aws.secretAccessKey,
			varData,
		);
		request.auth.aws.service = replaceDataWithVariable(
			request.auth.aws.service,
			varData,
		);
		request.auth.aws.region = replaceDataWithVariable(
			request.auth.aws.region,
			varData,
		);
		request.auth.aws.sessionToken = replaceDataWithVariable(
			request.auth.aws.sessionToken,
			varData,
		);
	}

	if (
		request.body.bodyType === "formurlencoded" &&
		request.body.urlencoded.some((item) => item.isChecked)
	) {
		request.body.urlencoded = replaceTableDataWithVariable(
			request.body.urlencoded,
			varData,
		);
	}

	if (
		request.body.bodyType === "formdata" &&
		request.body.formdata.some((item) => item.isChecked)
	) {
		request.body.formdata = replaceTableDataWithVariable(
			request.body.formdata,
			varData,
		);
	}

	if (request.body.bodyType === "raw") {
		request.body.raw.data = replaceDataWithVariable(
			request.body.raw.data,
			varData,
		);
	}

	if (request.body.bodyType === "graphql") {
		request.body.graphql.query = replaceDataWithVariable(
			request.body.graphql.query,
			varData,
		);
		request.body.graphql.variables = replaceDataWithVariable(
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

function replaceTableDataWithVariable(
	data: ITableData[],
	varData: Record<string, string>,
): ITableData[] {
	for (const item of data) {
		if (VARIABLE_PATTERN.test(item.key)) {
			item.key.match(VARIABLE_PATTERN_GLOBAL)?.forEach((p) => {
				item.key = updateVariable(p, item.key, varData);
			});
		}

		if (VARIABLE_PATTERN.test(item.value)) {
			item.value.match(VARIABLE_PATTERN_GLOBAL)?.forEach((p) => {
				item.value = updateVariable(p, item.value, varData);
			});
		}
	}

	return data;
}

export function replaceDataWithVariable(
	data: string,
	varData: Record<string, string>,
): string {
	if (!VARIABLE_PATTERN.test(data)) {
		return data;
	}

	data.match(VARIABLE_PATTERN_GLOBAL)?.forEach((item) => {
		data = updateVariable(item, data, varData);
	});

	return data;
}

function updateVariable(
	item: string,
	data: string,
	varData: Record<string, string>,
): string {
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
					: replacedValue,
			);
		}
	}

	return data;
}
