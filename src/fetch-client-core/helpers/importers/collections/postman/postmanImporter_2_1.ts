import {
	ApikeyElement,
	Auth,
	Body,
	Header,
	Items,
	POSTMAN_SCHEMA_V2_1,
	PostmanSchema_2_1,
	RequestObject,
	URLObject,
	Variable,
} from "../../../../types/postman_2_1.types";
import { formatDate } from "../../../dateTime.helper";
import { IAuth, ClientAuth, GrantType } from "../../../../types/auth.types";
import {
	ICollections,
	IVariable,
	IHistory,
	IFolder,
	ISettings,
} from "../../../../types/sidebar.types";
import {
	InitialAuth,
	InitialBody,
	InitialPreFetch,
	InitialSetVar,
	InitialTest,
} from "../../../../consts/initialValues.consts";
import {
	IRequestModel,
	IBodyData,
	MethodType,
} from "../../../../types/request.types";
import { isJson } from "../../../tests.helper";
import { ITableData } from "../../../../types/common.types";
import { PostmanScriptParser } from "./postmanScript.helper";
import { v4 as uuidv4 } from "uuid";
import { writeLog } from "../../../logger/logger";
import { XMLValidator } from "fast-xml-parser";

export interface PostmanImportResult {
	fcCollection: ICollections;
	fcRequests: IRequestModel[];
	fcVariables: IVariable | null;
}

const EMPTY_TABLE_ROW: ITableData = { isChecked: false, key: "", value: "" };

function deepClone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}

export class PostmanImport {
	private readonly collection: PostmanSchema_2_1;
	private readonly scripts = new PostmanScriptParser();
	private collectionId = "";

	constructor(collection: PostmanSchema_2_1) {
		this.collection = collection;
	}

	private importVariable(
		variables: Variable[],
		name: string,
	): IVariable | null {
		if (!variables?.length) {
			return null;
		}

		const varData: ITableData[] = variables
			.filter((v) => v.key !== undefined)
			.map((v) => ({
				isChecked: !v.disabled,
				key: v.key,
				value: v.value as string,
			}));

		return {
			id: uuidv4(),
			name,
			createdTime: formatDate(),
			modifiedTime: formatDate(),
			isActive: true,
			data: varData,
		};
	}

	private getUrl(url?: URLObject | string): string {
		if (!url) {
			return "";
		}

		if (typeof url === "string") {
			return url;
		}

		let raw = url.raw ?? this.buildRawUrl(url);
		raw = this.mergePathVariables(raw, url.variable);
		return raw;
	}

	private buildRawUrl(url: URLObject): string {
		const protocol = url.protocol ? `${url.protocol}://` : "";
		const host = Array.isArray(url.host)
			? url.host.join(".")
			: (url.host ?? "");
		const path = Array.isArray(url.path)
			? "/" + url.path.join("/")
			: url.path
				? "/" + url.path
				: "";
		const query = (url.query ?? [])
			.filter((q) => !q.disabled)
			.map((q) => `${q.key}=${q.value}`)
			.join("&");
		return protocol + host + path + (query ? `?${query}` : "");
	}

	private mergePathVariables(url: string, variables?: Variable[]): string {
		if (!variables?.length) {
			return url;
		}

		let updatedUrl = url;

		for (const variable of variables) {
			if (!variable.key) {
				continue;
			}
			const placeholder = `:${variable.key}`;
			const replacement =
				variable.value !== undefined ? `{{${variable.key}}}` : placeholder;
			updatedUrl = updatedUrl.replace(placeholder, replacement);
		}

		return updatedUrl;
	}

	private getParams(url?: URLObject | string): ITableData[] {
		const fcParams: ITableData[] = [];

		if (url && typeof url === "object" && url.query) {
			for (const item of url.query) {
				fcParams.push({
					key: item.key ?? "",
					value: item.value ?? "",
					isChecked: !item.disabled,
				});
			}
		}

		return [...fcParams, { ...EMPTY_TABLE_ROW }];
	}

	private getHeaders(headers: Header[] | string): ITableData[] {
		const fcHeaders: ITableData[] = [];

		if (headers && typeof headers !== "string") {
			for (const item of headers as Header[]) {
				fcHeaders.push({
					key: item.key,
					value: item.value,
					isChecked: !item.disabled,
				});
			}
		}

		return [...fcHeaders, { ...EMPTY_TABLE_ROW }];
	}

	private getAuthDetails(auth?: Auth | null): IAuth {
		const fcAuth: IAuth = deepClone(InitialAuth);

		if (!auth) {
			fcAuth.authType = "inherit";
			return fcAuth;
		}

		switch (auth.type) {
			case "awsv4": {
				if (!auth.awsv4) {
					return fcAuth;
				}
				fcAuth.aws.accessKey = this.findValueByKey(auth.awsv4, "accessKey");
				fcAuth.aws.secretAccessKey = this.findValueByKey(
					auth.awsv4,
					"secretKey",
				);
				fcAuth.aws.service = this.findValueByKey(auth.awsv4, "service");
				fcAuth.aws.sessionToken = this.findValueByKey(
					auth.awsv4,
					"sessionToken",
				);
				fcAuth.aws.region = this.findValueByKey(auth.awsv4, "region");
				fcAuth.authType = "aws";
				return fcAuth;
			}

			case "basic": {
				if (!auth.basic) {
					return fcAuth;
				}
				fcAuth.userName = this.findValueByKey(auth.basic, "username");
				fcAuth.password = this.findValueByKey(auth.basic, "password");
				fcAuth.authType = "basic";
				return fcAuth;
			}

			case "apikey": {
				if (!auth.apikey) {
					return fcAuth;
				}
				fcAuth.userName = this.findValueByKey(auth.apikey, "key");
				fcAuth.password = this.findValueByKey(auth.apikey, "value");
				const addToSection = this.findValueByKey(auth.apikey, "in");
				fcAuth.addTo = addToSection === "query" ? "queryparams" : "header";
				fcAuth.authType = "apikey";
				return fcAuth;
			}

			case "bearer": {
				if (!auth.bearer) {
					return fcAuth;
				}
				fcAuth.password = this.findValueByKey(auth.bearer, "token");
				fcAuth.tokenPrefix = "Bearer";
				fcAuth.authType = "bearertoken";
				return fcAuth;
			}

			case "oauth2": {
				if (!auth.oauth2) {
					return fcAuth;
				}
				const grantType = this.findValueByKey(auth.oauth2, "grant_type");
				if (
					grantType !== "client_credentials" &&
					grantType !== "password_credentials"
				) {
					return fcAuth;
				}
				const clientAuth = this.findValueByKey(
					auth.oauth2,
					"client_authentication",
				);
				fcAuth.oauth.clientAuth =
					clientAuth === "body" ? ClientAuth.Body : ClientAuth.Header;
				fcAuth.oauth.clientId = this.findValueByKey(auth.oauth2, "clientId");
				fcAuth.oauth.clientSecret = this.findValueByKey(
					auth.oauth2,
					"clientSecret",
				);
				fcAuth.oauth.grantType =
					grantType === "client_credentials"
						? GrantType.Client_Crd
						: GrantType.PWD_Crd;
				fcAuth.oauth.password = this.findValueByKey(auth.oauth2, "password");
				fcAuth.oauth.username = this.findValueByKey(auth.oauth2, "username");
				fcAuth.oauth.scope = this.findValueByKey(auth.oauth2, "scope");
				fcAuth.oauth.tokenUrl = this.findValueByKey(
					auth.oauth2,
					"accessTokenUrl",
				);

				const resource = this.findObjectByKey(auth.oauth2, "resource");
				const resourceKey = resource ? Object.keys(resource)[0] : "";
				fcAuth.oauth.advancedOpt.resource =
					resource && resourceKey ? String(resource[resourceKey]) : "";

				const audience = this.findObjectByKey(auth.oauth2, "audience");
				const audienceKey = audience ? Object.keys(audience)[0] : "";
				fcAuth.oauth.advancedOpt.audience =
					audience && audienceKey ? String(audience[audienceKey]) : "";

				fcAuth.authType = "oauth2";
				return fcAuth;
			}

			default:
				return fcAuth;
		}
	}

	private getSrc(src: string[] | null | string): string {
		if (!src) {
			return "";
		}
		if (typeof src === "string") {
			return src.length > 1 ? src.substring(1) : src;
		}
		if (Array.isArray(src) && src.length > 0) {
			const first = src[0];
			return first.length > 1 ? first.substring(1) : first;
		}
		return "";
	}

	private getBody(body: Body): IBodyData {
		const fcBody: IBodyData = deepClone(InitialBody);

		if (!body) {
			return fcBody;
		}

		switch (body.mode) {
			case "formdata": {
				fcBody.bodyType = "formdata";
				fcBody.formdata.shift();
				body.formdata?.forEach((item) => {
					fcBody.formdata.push({
						isChecked: !item.disabled,
						key: item.key,
						value:
							item.type === "file"
								? this.getSrc(item.src as string[] | null | string)
								: (item.value ?? ""),
						type: item.type === "file" ? "File" : "Text",
					});
				});
				fcBody.formdata.push({
					isChecked: false,
					key: "",
					value: "",
					type: "Text",
				});
				return fcBody;
			}

			case "urlencoded": {
				fcBody.bodyType = "formurlencoded";
				fcBody.urlencoded.shift();
				body.urlencoded?.forEach((item) => {
					fcBody.urlencoded.push({
						isChecked: !item.disabled,
						key: item.key,
						value: item.value ?? "",
					});
				});
				fcBody.urlencoded.push({ ...EMPTY_TABLE_ROW });
				return fcBody;
			}

			case "graphql": {
				fcBody.bodyType = "graphql";
				if (body.graphql) {
					fcBody.graphql.query =
						typeof body.graphql.query === "string"
							? body.graphql.query
							: JSON.stringify(body.graphql.query ?? "", null, 2);
					fcBody.graphql.variables =
						typeof body.graphql.variables === "string"
							? body.graphql.variables
							: JSON.stringify(body.graphql.variables ?? {}, null, 2);
				}
				return fcBody;
			}

			case "raw": {
				fcBody.bodyType = "raw";
				const rawData = body.raw ?? "";
				fcBody.raw.data = rawData;
				const postmanLang = this.getPostmanRawLanguage(body);
				if (postmanLang) {
					fcBody.raw.lang = postmanLang;
				} else {
					fcBody.raw.lang = this.getRawBodyType(
						rawData.replace(/(?:\\[rn]|[\r\n]+)+/g, ""),
					);
				}
				return fcBody;
			}

			case "file": {
				fcBody.bodyType = "binary";
				if (body.file) {
					fcBody.binary.data = body.file.content ?? "";
					fcBody.binary.fileName = body.file.src
						? body.file.src.substring(1)
						: "";
					fcBody.binary.contentTypeOption = "manual";
				}
				return fcBody;
			}

			default:
				return fcBody;
		}
	}

	private getPostmanRawLanguage(body: Body): string {
		const language = body.options?.raw?.language;
		switch ((language ?? "").toLowerCase()) {
			case "json":
				return "json";

			case "xml":
				return "xml";

			case "html":
				return "html";

			case "javascript":
			case "js":
				return "javascript";

			case "text":
				return "text";

			default:
				return "";
		}
	}

	private getRawBodyType(data: string): string {
		if (isJson(data) === "true") {
			return "json";
		}
		if (XMLValidator.validate(data) === true) {
			return "xml";
		}
		if (this.isHTML(data)) {
			return "html";
		}
		if (/^\s*(const|let|var|function|class|export|import)\b/.test(data)) {
			return "javascript";
		}

		return "text";
	}

	private isHTML(str: string): boolean {
		return !(str || "")
			.replace(/<([^>]+?)([^>]*?)>(.*?)<\/\1>/gi, "")
			.replace(/(<([^>]+)>)/gi, "")
			.trim();
	}

	private findValueByKey(array?: ApikeyElement[], key?: string): string {
		if (!array) {
			return "";
		}
		const obj = array.find((o) => o.key === key);
		if (obj && typeof obj.value === "string") {
			return obj.value;
		}
		return "";
	}

	private findObjectByKey(
		array?: ApikeyElement[],
		key?: string,
	): Record<string, unknown> | null {
		if (!array) {
			return null;
		}
		const obj = array.find((o) => o.key === key);
		if (obj && typeof obj.value === "object" && obj.value !== null) {
			return obj.value as Record<string, unknown>;
		}
		return null;
	}

	private buildHistoryItem(item: Items, requests: IRequestModel[]): IHistory {
		const reqObject = item.request as RequestObject;
		const idEntry = this.scripts.getId(item);

		const history: IHistory = {
			id: idEntry.id,
			name: item.name,
			method: reqObject?.method ?? "get",
			url: this.getUrl(reqObject?.url),
			createdTime: formatDate(),
			modifiedTime: formatDate(),
		};

		if (reqObject) {
			const testScript = this.scripts.getEventScript(item.event, "test");
			const preScript = this.scripts.getEventScript(item.event, "prerequest");
			const { runRequests, leftover } =
				this.scripts.parsePreRequestScript(preScript);

			let notes = "";
			if (leftover.length) {
				notes =
					"Imported pre-request script (not auto-convertible):\n" +
					leftover.join("\n\n");
			}

			const tests = this.scripts.parsePostmanTests(testScript);
			const setvar = this.scripts.parsePostmanSetVars(testScript);

			requests.push({
				id: history.id,
				url: history.url,
				name: history.name,
				createdTime: history.createdTime,
				modifiedTime: history.modifiedTime,
				method: history.method as MethodType,
				params: this.getParams(reqObject.url),
				auth: this.getAuthDetails(reqObject.auth),
				headers: this.getHeaders(reqObject.header),
				body: this.getBody(reqObject.body),
				tests: tests.length > 0 ? tests : deepClone(InitialTest),
				setvar: setvar.length > 0 ? setvar : deepClone(InitialSetVar),
				notes,
				preFetch:
					runRequests.length > 0
						? { requests: runRequests }
						: deepClone(InitialPreFetch),
			});
		}

		return history;
	}

	private reduceItems(
		items: Items[],
		requests: IRequestModel[],
	): (IHistory | IFolder)[] {
		return items.reduce<(IHistory | IFolder)[]>((acc, item) => {
			if (Object.prototype.hasOwnProperty.call(item, "request")) {
				return [...acc, this.buildHistoryItem(item, requests)];
			}
			return [...acc, this.buildFolderItem(item, requests)];
		}, []);
	}

	private buildFolderItem(item: Items, requests: IRequestModel[]): IFolder {
		return {
			id: this.scripts.getId(item).id, // <-- was uuidv4()
			name: item.name,
			type: "folder",
			createdTime: formatDate(),
			modifiedTime: formatDate(),
			data: this.reduceItems(item.item ?? [], requests),
			settings: this.buildSettings(item.auth),
		};
	}

	private buildSettings(auth?: Auth | null): ISettings {
		return {
			auth: this.getAuthDetails(auth),
			preFetch: { requests: [] },
			headers: [
				{ key: "User-Agent", value: "Fetch Client", isChecked: true },
				{ ...EMPTY_TABLE_ROW },
			],
		};
	}

	importCollection(): PostmanImportResult {
		this.collectionId = uuidv4();

		// pre-pass: assign ids up front so pm.sendRequest() can resolve any-order references
		this.scripts.precomputeIds(
			this.collection.item,
			"",
			this.collectionId,
			(item) => this.getUrl((item.request as RequestObject)?.url),
			(item) => (item.request as RequestObject)?.method ?? "get",
		);

		const variable = this.importVariable(
			this.collection.variable ?? [],
			this.collection.info.name,
		);
		const requests: IRequestModel[] = [];

		const collection: ICollections = {
			id: this.collectionId,
			name: this.collection.info.name,
			createdTime: formatDate(),
			modifiedTime: formatDate(),
			variableId: variable?.id ?? "",
			data: this.reduceItems(this.collection.item, requests),
			settings: this.buildSettings(this.collection.auth),
		};

		return {
			fcCollection: collection,
			fcRequests: requests,
			fcVariables: variable,
		};
	}
}

export const postmanImporter = (
	rawData: string,
): PostmanImportResult | null => {
	try {
		const collection = JSON.parse(rawData) as PostmanSchema_2_1;
		if (collection?.info?.schema === POSTMAN_SCHEMA_V2_1) {
			return new PostmanImport(collection).importCollection();
		}
	} catch (err) {
		writeLog("error::postmanImporter(): - Error Message : " + err);
	}
	return null;
};
