import { IRequestModel } from "../../types/request.types";
import { IValidationResult } from "./dataDriven.types";

const VAR_PATTERN = /{{([^{}]+)}}/g;

function extractFromString(str: string, out: Set<string>): void {
	if (!str) {
		return;
	}
	VAR_PATTERN.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = VAR_PATTERN.exec(str)) !== null) {
		const name = m[1].trim();
		// skip system variables (prefixed with #)
		if (!name.startsWith("#")) {
			out.add(name);
		}
	}
}

export function extractVariablesFromRequest(req: IRequestModel): Set<string> {
	const vars = new Set<string>();

	extractFromString(req.url, vars);

	req.params?.forEach((p) => {
		if (p.isChecked) {
			extractFromString(p.key, vars);
			extractFromString(p.value, vars);
		}
	});

	req.headers?.forEach((h) => {
		if (h.isChecked) {
			extractFromString(h.key, vars);
			extractFromString(h.value, vars);
		}
	});

	extractFromString(req.auth?.userName, vars);
	extractFromString(req.auth?.password, vars);
	extractFromString(req.auth?.tokenPrefix, vars);

	if (req.auth?.aws) {
		extractFromString(req.auth.aws.accessKey, vars);
		extractFromString(req.auth.aws.secretAccessKey, vars);
		extractFromString(req.auth.aws.service, vars);
		extractFromString(req.auth.aws.region, vars);
		extractFromString(req.auth.aws.sessionToken, vars);
	}

	const body = req.body;
	if (body) {
		if (body.bodyType === "raw") {
			extractFromString(body.raw?.data, vars);
		}
		if (body.bodyType === "graphql") {
			extractFromString(body.graphql?.query, vars);
			extractFromString(body.graphql?.variables, vars);
		}
		body.formdata?.forEach((f) => {
			if (f.isChecked) {
				extractFromString(f.key, vars);
				extractFromString(f.value, vars);
			}
		});
		body.urlencoded?.forEach((u) => {
			if (u.isChecked) {
				extractFromString(u.key, vars);
				extractFromString(u.value, vars);
			}
		});
	}

	return vars;
}

export function extractSetVarNames(req: IRequestModel): Set<string> {
	const names = new Set<string>();
	req.setvar?.forEach((sv) => {
		if (sv.variableName) {
			names.add(sv.variableName);
		}
	});
	return names;
}

/**
 * Validate that all {{variable}} placeholders used in the selected requests
 * (and their pre-requests' setvar outputs) are present as columns in the
 * data file. Values may be empty — they will be filled at runtime by pre-req.
 */
export function validateVariables(
	requests: IRequestModel[],
	requestMap: Map<string, IRequestModel>,
	csvColumns: string[],
): IValidationResult {
	const allUsedVars = new Set<string>();

	for (const req of requests) {
		// Variables used in the main request
		extractVariablesFromRequest(req).forEach((v) => allUsedVars.add(v));

		// For each pre-request: variables used + setvar output names
		const preReqIds =
			req.preFetch?.requests
				?.map((r) => r.reqId)
				.filter((id) => !!id && id !== "undefined") ?? [];

		for (const preId of preReqIds) {
			const preReq = requestMap.get(preId);
			if (preReq) {
				extractVariablesFromRequest(preReq).forEach((v) => allUsedVars.add(v));
				// setvar output column must also be present (empty value allowed)
				extractSetVarNames(preReq).forEach((v) => allUsedVars.add(v));
			}
		}

		// Also check setvar on the main request itself
		extractSetVarNames(req).forEach((v) => allUsedVars.add(v));
	}

	const columnSet = new Set(csvColumns);
	const presentVars: string[] = [];
	const missingVars: string[] = [];

	allUsedVars.forEach((v) => {
		if (columnSet.has(v)) {
			presentVars.push(v);
		} else {
			missingVars.push(v);
		}
	});

	return {
		valid: missingVars.length === 0,
		missingVars,
		presentVars,
	};
}
