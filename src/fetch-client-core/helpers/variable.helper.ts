import {
	checkSysVariable,
	getSysVariableWithValue,
} from "./systemVariable.helper";


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VARIABLE_PATTERN = /({{([^}}]+)}})/;
const VARIABLE_PATTERN_GLOBAL = /({{([^}}]+)}})/gm;

export function replaceDataWithVariable(
	data: string,
	varData: Record<string, string>,
): string {
	if (!VARIABLE_PATTERN.test(data)) {
		return data;
	}

	data.match(VARIABLE_PATTERN_GLOBAL)?.forEach(async (item) => {
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
		data = replaceSysVariable(item, data);
	} else if (varData && Object.keys(varData).length > 0) {
		data = replacePlainVariable(item, data, varData);
	}

	return data;
}

export function replaceSysVariable(item: string, data: string): string {
	const variable = checkSysVariable(item);
	if (!variable) {
		return data;
	}

	const value = getSysVariableWithValue(variable);
	return data.replace(item, value?.toString() ?? item);
}

export function replacePlainVariable(
	item: string,
	data: string,
	varData: Record<string, string>,
): string {
	const key = item.replace(/^{{/, "").replace(/}}$/, "").trim();
	const replacedValue = varData[key];

	if (replacedValue === undefined) {
		return data;
	}

	const finalValue = VARIABLE_PATTERN.test(replacedValue)
		? replaceDataWithVariable(replacedValue, varData)
		: replacedValue;

	return data.replace(item, finalValue);
}
