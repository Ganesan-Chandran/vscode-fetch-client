import { ActionsParametersMapping } from "../../../consts/test.consts";
import { Auth, BodyEntity, FoldersEntity, HeadersEntityOrFormEntity, ParamsEntity, RequestsEntity, Settings, TestsEntity, ThunderClient_Schema_1_2 } from "../../../types/thunderClient_1_2_types";
import { formatDate } from "../../dateTime.helper";
import { IAuth, ClientAuth, GrantType } from "../../../types/auth.types";
import { IBodyData, IRequestModel, MethodType } from "../../../types/request.types";
import { IFolder, ISettings, ICollections, IHistory } from "../../../types/sidebar.types";
import { InitialRequestHeaders, InitialAuth, InitialBody, InitialPreFetch, InitialSettings } from "../../../consts/initialValues.consts";
import { deepClone, isFolder } from "../../common.helper";
import { isJson } from "../../tests.helper";
import { ITableData } from "../../../types/common.types";
import { ITest, ISetVar } from "../../../types/prefetch.types";
import { v4 as uuidv4 } from "uuid";
import { writeLog } from "../../logger/logger";
import { XMLValidator } from "fast-xml-parser";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NEWLINE_REGEX = /(?:\\[rn]|[\r\n]+)+/g;

/** Maps Thunder Client test type strings to Fetch Client parameter names. */
const TEST_TYPE_MAP: Readonly<Record<string, string>> = {
	"res-code": "Response Code",
	"res-body": "Response Body",
	"res-time": "Response Time",
	"Content-Type": "Content-Type",
	"Content-Length": "Content-Length",
	"Content-Encoding": "Content-Encoding",
	"custom-header": "Header",
	"json-query": "JSON",
};

/** Normalises Thunder Client action aliases to the names used in ActionsParametersMapping. */
const ACTION_ALIAS_MAP: Readonly<Record<string, string>> = {
	istype: "type",
	isjson: "json",
};

const EMPTY_TABLE_ROW: ITableData = { isChecked: false, key: "", value: "" };
const EMPTY_TEST: ITest = { parameter: "", action: "", expectedValue: "" };
const EMPTY_SET_VAR: ISetVar = { parameter: "", key: "", variableName: "" };

// ---------------------------------------------------------------------------
// ThunderClientImport class
// ---------------------------------------------------------------------------

export class ThunderClientImport {
	private readonly collection: ThunderClient_Schema_1_2;

	constructor(collection: ThunderClient_Schema_1_2) {
		this.collection = collection;
	}

	getParams(params: ParamsEntity[]): ITableData[] {
		const fcParams: ITableData[] = (params ?? []).map(item => ({
			key: item.name ?? "",
			value: item.value ?? "",
			isChecked: !item.isDisabled,
		}));

		return [...fcParams, { ...EMPTY_TABLE_ROW }];
	}

	getHeaders(headers?: HeadersEntityOrFormEntity[]): ITableData[] {
		if (!headers?.length) {
			return deepClone(InitialRequestHeaders);
		}

		const fcHeaders: ITableData[] = headers
			.filter(h => !!h.name)
			.map(h => ({
				isChecked: !h.isDisabled,
				key: h.name,
				value: h.value,
			}));

		fcHeaders.push({ ...EMPTY_TABLE_ROW });
		return fcHeaders;
	}

	getAuthDetails(auth?: Auth): IAuth {
		const fcAuth: IAuth = deepClone(InitialAuth);

		if (!auth) {
			fcAuth.authType = "inherit";
			return fcAuth;
		}

		switch (auth.type) {
			case "aws": {
				if (!auth.aws) {
					return fcAuth;
				}
				fcAuth.aws.accessKey = auth.aws.accessKeyId ?? "";
				fcAuth.aws.secretAccessKey = auth.aws.secretKey ?? "";
				fcAuth.aws.service = auth.aws.service ?? "";
				fcAuth.aws.sessionToken = auth.aws.sessionToken ?? "";
				fcAuth.aws.region = auth.aws.region ?? "";
				fcAuth.authType = "aws";
				return fcAuth;
			}

			case "basic": {
				if (!auth.basic) {
					return fcAuth;
				}
				fcAuth.userName = auth.basic.username ?? "";
				fcAuth.password = auth.basic.password ?? "";
				fcAuth.authType = "basic";
				return fcAuth;
			}

			case "bearer": {
				if (!auth.bearer) {
					return fcAuth;
				}
				fcAuth.password = auth.bearer;
				fcAuth.tokenPrefix = auth.bearerPrefix ?? "Bearer";
				fcAuth.authType = "bearertoken";
				return fcAuth;
			}

			case "oauth2": {
				if (!auth.oauth2) {
					return fcAuth;
				}
				const grantType = auth.oauth2.grantType ?? "";
				if (grantType !== "client_credentials" && grantType !== "password") {
					return fcAuth;
				}
				fcAuth.oauth.clientAuth = auth.oauth2.clientAuth === "in-header" ? ClientAuth.Header : ClientAuth.Body;
				fcAuth.oauth.clientId = auth.oauth2.clientId ?? "";
				fcAuth.oauth.clientSecret = auth.oauth2.clientSecret ?? "";
				fcAuth.oauth.grantType = grantType === "client_credentials" ? GrantType.Client_Crd : GrantType.PWD_Crd;
				fcAuth.oauth.password = auth.oauth2.password ?? "";
				fcAuth.oauth.username = auth.oauth2.username ?? "";
				fcAuth.oauth.scope = auth.oauth2.scope ?? "";
				fcAuth.oauth.tokenUrl = auth.oauth2.tokenUrl ?? "";
				fcAuth.oauth.advancedOpt.resource = auth.oauth2.resource ?? "";
				fcAuth.oauth.advancedOpt.audience = auth.oauth2.audience ?? "";
				fcAuth.authType = "oauth2";
				return fcAuth;
			}

			default:
				return fcAuth;
		}
	}

	getBody(body: BodyEntity): IBodyData {
		const fcBody: IBodyData = deepClone(InitialBody);

		if (!body) {
			return fcBody;
		}

		switch (body.type) {
			case "formdata": {
				fcBody.bodyType = "formdata";
				fcBody.formdata = [];

				body.form?.forEach(item => {
					fcBody.formdata.push({
						isChecked: !item.isDisabled,
						key: item.name ?? "",
						value: item.value ?? "",
						type: "Text",
					});
				});

				body.files?.forEach(item => {
					fcBody.formdata.push({
						isChecked: !item.isDisabled,
						key: item.name ?? "",
						value: item.value ?? "",
						type: "File",
					});
				});

				fcBody.formdata.push({ isChecked: false, key: "", value: "", type: "Text" });
				return fcBody;
			}

			case "formencoded": {
				fcBody.bodyType = "formurlencoded";
				fcBody.urlencoded = [];

				body.form?.forEach(item => {
					fcBody.urlencoded.push({
						isChecked: !item.isDisabled,
						key: item.name ?? "",
						value: item.value ?? "",
					});
				});

				fcBody.urlencoded.push({ ...EMPTY_TABLE_ROW });
				return fcBody;
			}

			case "graphql": {
				if (!body.graphql) {
					return fcBody;
				}
				fcBody.bodyType = "graphql";
				fcBody.graphql.query = JSON.stringify(body.graphql.query);
				fcBody.graphql.variables = JSON.stringify(body.graphql.variables);
				return fcBody;
			}

			case "json":
			case "xml":
			case "text": {
				const rawData = body.raw ?? "";
				fcBody.bodyType = "raw";
				fcBody.raw.data = rawData;
				fcBody.raw.lang = this.getRawBodyType(rawData.replace(NEWLINE_REGEX, ""));
				return fcBody;
			}

			case "binary": {
				fcBody.bodyType = "binary";
				fcBody.binary.fileName = body.binary ?? "";
				fcBody.binary.contentTypeOption = "manual";
				return fcBody;
			}

			default:
				return fcBody;
		}
	}

	getRawBodyType(data: string): string {
		if (isJson(data) === "true") {
			return "json";
		}
		if (XMLValidator.validate(data) === true) {
			return "xml";
		}
		if (this.isHTMLString(data)) {
			return "html";
		}
		return "text";
	}

	/** Returns true when the string contains HTML markup. */
	private isHTMLString(str: string): boolean {
		const stripped = (str || "")
			.replace(/<([^>]+?)([^>]*?)>(.*?)<\/\1>/ig, "")
			.replace(/(<([^>]+)>)/ig, "")
			.trim();
		return stripped !== (str || "").trim();
	}

	getTests(tests: TestsEntity[]): ITest[] {
		if (!tests?.length) {
			return [{ ...EMPTY_TEST }];
		}

		const fcTest: ITest[] = tests.reduce<ITest[]>((acc, item) => {
			const parameter = this.getTestType(item.type);
			const action = this.getAction(parameter, item.action);
			if (parameter && action) {
				acc.push({
					parameter,
					action,
					expectedValue: item.value ?? "",
					customParameter: item.custom
						? (item.type === "json-query" ? item.custom.replace("json.", "") : item.custom)
						: "",
				});
			}
			return acc;
		}, []);

		return [...fcTest, { ...EMPTY_TEST }];
	}

	getSetVariables(tests: TestsEntity[]): ISetVar[] {
		if (!tests?.length) {
			return [{ ...EMPTY_SET_VAR }];
		}

		const fcVar: ISetVar[] = tests
			.filter(i => i.type === "set-env-var" && i.custom?.startsWith("json."))
			.map(item => ({
				parameter: "JSON",
				key: item.custom.replace("json.", ""),
				variableName: item.value?.replace("{{", "").replace("}}", "") ?? "",
			}));

		return [...fcVar, { ...EMPTY_SET_VAR }];
	}

	getAction(type: string, action: string): string {
		if (!type || !action) {
			return "";
		}

		const parameterDef = ActionsParametersMapping[type];
		if (!parameterDef) {
			return "";
		}

		const normalisedAction = ACTION_ALIAS_MAP[action] ?? action;
		return (
			parameterDef["action"]?.find(
				(o: { name: string }) => o.name.toLowerCase() === normalisedAction.toLowerCase()
			)?.["value"] ?? ""
		);
	}

	getTestType(type: string): string {
		return TEST_TYPE_MAP[type] ?? "";
	}

	getRequestItem(req: RequestsEntity): IRequestModel {
		return {
			id: uuidv4(),
			url: req.url,
			name: req.name,
			createdTime: formatDate(),
			method: req.method.toLowerCase() as MethodType,
			params: this.getParams(req.params),
			auth: this.getAuthDetails(req.auth),
			headers: this.getHeaders(req.headers),
			body: this.getBody(req.body),
			tests: this.getTests(req.tests),
			setvar: this.getSetVariables(req.tests),
			notes: "",
			preFetch: deepClone(InitialPreFetch),
		};
	}

	importFolderItem(item: FoldersEntity): IFolder {
		return {
			id: uuidv4(),
			name: item.name,
			type: "folder",
			createdTime: formatDate(),
			data: [],
			settings: item.settings ? this.importSettings(item.settings) : deepClone(InitialSettings),
		};
	}

	importSettings(parentSettings: Settings): ISettings {
		return {
			auth: this.getAuthDetails(parentSettings.auth),
			preFetch: { requests: [] },
			headers: this.getHeaders(parentSettings.headers),
		};
	}

	private getParentItem(source: ICollections | IFolder, searchId: string): IFolder | null {
		const pos = source.data.findIndex(el => el.id === searchId);
		if (pos !== -1) {
			return source.data[pos] as IFolder;
		}

		for (const item of source.data) {
			if (isFolder(item)) {
				const found = this.getParentItem(item as IFolder, searchId);
				if (found) {
					return found;
				}
			}
		}

		return null;
	}

	importCollection(): { fcCollection: ICollections; fcRequests: IRequestModel[] } {
		const requests: IRequestModel[] = [];
		const ids: Record<string, string> = {};

		const collection: ICollections = {
			id: uuidv4(),
			name: this.collection.collectionName,
			createdTime: formatDate(),
			variableId: "",
			data: [],
			settings: this.collection.settings
				? this.importSettings(this.collection.settings)
				: deepClone(InitialSettings),
		};

		this.collection.folders?.forEach((folderItem: FoldersEntity) => {
			const fcFolder = this.importFolderItem(folderItem);
			ids[folderItem._id] = fcFolder.id;

			if (folderItem.containerId) {
				const parentFolder = this.getParentItem(collection, ids[folderItem.containerId]);
				parentFolder?.data.push(fcFolder);
			} else {
				collection.data.push(fcFolder);
			}
		});

		this.collection.requests?.forEach((request: RequestsEntity) => {
			const req = this.getRequestItem(request);

			const history: IHistory = {
				id: req.id,
				name: req.name,
				method: req.method,
				url: req.url,
				createdTime: formatDate(),
			};

			requests.push(req);

			if (request.containerId) {
				const folder = this.getParentItem(collection, ids[request.containerId]);
				folder?.data.push(history);
			} else {
				collection.data.push(history);
			}
		});

		return { fcCollection: collection, fcRequests: requests };
	}
}

export const thunderClientImporter = (rawData: string): { fcCollection: ICollections; fcRequests: IRequestModel[] } | null => {
	try {
		const collection = JSON.parse(rawData) as ThunderClient_Schema_1_2;
		if (collection.clientName === "Thunder Client") {
			return new ThunderClientImport(collection).importCollection();
		}
	} catch (err) {
		writeLog("error::thunderClientImporter(): - Error Message : " + err);
	}

	return null;
};
