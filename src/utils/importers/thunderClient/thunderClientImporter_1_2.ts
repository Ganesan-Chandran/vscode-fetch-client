import { XMLValidator } from "fast-xml-parser";
import { v4 as uuidv4 } from "uuid";
import { ITableData } from "../../../fetch-client-ui/components/Common/Table/types";
import { InitialAuth, InitialBody, InitialPreFetch, InitialRequestHeaders } from "../../../fetch-client-ui/components/RequestUI/redux/reducer";
import { ClientAuth, GrantType, IAuth, IBodyData, IRequestModel, ISetVar, ITest, MethodType } from "../../../fetch-client-ui/components/RequestUI/redux/types";
import { InitialSettings } from "../../../fetch-client-ui/components/SideBar/redux/reducer";
import { ICollections, IFolder, IHistory, ISettings } from "../../../fetch-client-ui/components/SideBar/redux/types";
import { isFolder } from "../../../fetch-client-ui/components/SideBar/util";
import { ActionsParametersMapping } from "../../../fetch-client-ui/components/TestUI/TestPanel/consts";
import { isJson } from "../../../fetch-client-ui/components/TestUI/TestPanel/helper";
import { formatDate } from "../../helper";
import { writeLog } from "../../logger/logger";
import { Auth, BodyEntity, FoldersEntity, HeadersEntityOrFormEntity, ParamsEntity, RequestsEntity, Settings, TestsEntity, ThunderClient_Schema_1_2 } from "./thunderClient_1_2_types";


export class ThunderClientImport {
	private collection: ThunderClient_Schema_1_2;

	constructor(collection: ThunderClient_Schema_1_2) {
		this.collection = collection;
	}

	getParams = (params: ParamsEntity[]): ITableData[] => {
		let fcParams: ITableData[] = [];

		if (params?.length > 0) {
			params.forEach(item => {
				fcParams.push({
					key: item.name ?? "",
					value: item.value ?? "",
					isChecked: !item.isDisabled
				});
			});
		}
		return [...fcParams, {
			isChecked: false,
			key: "",
			value: ""
		}];
	};

	getHeaders = (headers?: HeadersEntityOrFormEntity[]): ITableData[] => {
		let fcHeaders: ITableData[] = [];

		if (headers?.length > 0) {
			headers.forEach(header => {
				if (header.name) {
					fcHeaders.push({
						isChecked: !header.isDisabled,
						key: header.name,
						value: header.value
					});
				}
			});

			fcHeaders.push({
				key: "",
				value: "",
				isChecked: false,
			});
		} else {
			fcHeaders = JSON.parse(JSON.stringify(InitialRequestHeaders));
		}

		return fcHeaders;
	};

	getAuthDetails = (auth?: Auth): IAuth => {

		let fcAuth: IAuth = JSON.parse(JSON.stringify(InitialAuth));

		if (!auth) {
			fcAuth.authType = "inherit";
			return fcAuth;
		}

		switch (auth.type) {
			case "aws":
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


			case "basic":
				if (!auth.basic) {
					return fcAuth;
				}

				fcAuth.userName = auth.basic.username ?? "";
				fcAuth.password = auth.basic.password ?? "";
				fcAuth.authType = "basic";

				return fcAuth;

			case "bearer":
				if (!auth.bearer) {
					return fcAuth;
				}

				fcAuth.password = auth.bearer ?? "";
				fcAuth.tokenPrefix = auth.bearerPrefix ?? "Bearer";
				fcAuth.authType = "bearertoken";

				return fcAuth;

			case "oauth2":
				if (!auth.oauth2) {
					return fcAuth;
				}

				let grantType = auth.oauth2.grantType ?? "";

				if (grantType !== "client_credentials" && grantType !== "password") {
					return fcAuth;
				}

				let clientAuth = auth.oauth2.clientAuth;
				fcAuth.oauth.clientAuth = clientAuth === "in-header" ? ClientAuth.Header : ClientAuth.Body;
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

			default:
				return fcAuth;
		}
	};

	getBody = (body: BodyEntity): IBodyData => {

		let fcBody: IBodyData = JSON.parse(JSON.stringify(InitialBody));

		if (!body) {
			return fcBody;
		}

		switch (body.type) {
			case 'formdata':
				fcBody.bodyType = "formdata";
				fcBody.formdata.shift();
				body.form?.forEach(item => {
					fcBody.formdata.push({
						isChecked: item.isDisabled === true ? false : true,
						key: item.name ?? "",
						value: item.value ?? "",
						type: "Text"
					});
				});

				body.files?.forEach(item => {
					fcBody.formdata.push({
						isChecked: item.isDisabled === true ? false : true,
						key: item.name ?? "",
						value: item.value ?? "",
						type: "File"
					});
				});

				fcBody.formdata.push({
					isChecked: false,
					key: "",
					value: "",
					type: "Text"
				});

				return fcBody;

			case 'formencoded':
				fcBody.bodyType = "formurlencoded";
				fcBody.urlencoded.shift();
				body.form?.forEach(item => {
					fcBody.urlencoded.push({
						isChecked: item.isDisabled === true ? false : true,
						key: item.name ?? "",
						value: item.value ?? ""
					});
				});

				fcBody.urlencoded.push({
					isChecked: false,
					key: "",
					value: ""
				});

				return fcBody;

			case 'graphql':
				fcBody.bodyType = "graphql";
				fcBody.graphql.query = JSON.stringify(body.graphql.query);
				fcBody.graphql.variables = JSON.stringify(body.graphql.variables);
				return fcBody;

			case 'json':
			case 'xml':
			case 'text':
				fcBody.bodyType = "raw";
				fcBody.raw.data = body.raw;
				fcBody.raw.lang = this.getRawBodyType(body.raw.replace(/(?:\\[rn]|[\r\n]+)+/g, ""));
				return fcBody;

			case 'binary':
				fcBody.bodyType = "binary";
				fcBody.binary.fileName = body.binary;
				fcBody.binary.contentTypeOption = "manual";
				return fcBody;

			default:
				return fcBody;
		}
	};

	getRawBodyType = (data: string): string => {
		if (isJson(data) === "true") {
			return "json";
		}
		if (XMLValidator.validate(data) === true) {
			return "xml";
		}
		if (this.isHTML(data)) {
			return "html";
		}
		return "text";
	};

	isHTML = (str: string) => !(str || '')
		// replace html tag with content
		.replace(/<([^>]+?)([^>]*?)>(.*?)<\/\1>/ig, '')
		// remove remaining self closing tags
		.replace(/(<([^>]+)>)/ig, '')
		// remove extra space at start and end
		.trim();

	findValueByKey = <T extends { key: string; value?: string }>(array?: T[], key?: string,) => {
		if (!array) {
			return "";
		}

		const obj = array.find(o => o.key === key);

		if (obj && typeof obj.value === "string") {
			return obj.value || "";
		}

		return "";
	};

	findObjectByKey = <T extends { key: string; value?: string }>(array?: T[], key?: string,) => {
		if (!array) {
			return "";
		}

		const obj = array.find(o => o.key === key);

		if (obj && typeof obj.value === "object") {
			return obj.value || undefined;
		}

		return {};
	};

	getTests = (tests: TestsEntity[]): ITest[] => {
		let fcTest: ITest[] = [];

		if (tests?.length > 0) {
			tests.forEach(item => {
				let parameter = this.getTestType(item.type);
				let action = this.getAction(parameter, item.action);
				if (parameter && action) {
					fcTest.push({
						parameter: parameter,
						action: action,
						expectedValue: item.value ?? "",
						customParameter: item.custom ? (item.type === "json-query" ?  item.custom.replace("json.", "") : item.custom)  : ""
					});
				}
			});
		}

		return [...fcTest, {
			parameter: "",
			action: "",
			expectedValue: ""
		}];
	};

	getSetVariables = (tests: TestsEntity[]): ISetVar[] => {
		let fcVar: ISetVar[] = [];

		if (tests?.length > 0) {
			tests.filter(i => i.type === "set-env-var" && i.custom.startsWith("json."))?.forEach(item => {
					fcVar.push({
						parameter: "JSON",
						key: item.custom.replace("json.", ""),
						variableName: item.value?.replace("{{","")?.replace("}}","") ?? ""
					});
			});
		}

		return [...fcVar, {
			parameter: "",
			key: "",
			variableName: ""
		}];
	};

	getAction = (type: string, action: string): string => {
		if (!type || !action) {
			return "";
		}

		let parameter = ActionsParametersMapping[type];
		let fcAction = "";

		if (parameter) {
			action = action === "istype" ? "type" : (action === "isjson" ? "json" : action);
			fcAction = parameter["action"]?.find((o: { name: string; }) => o.name.toLocaleLowerCase() === action.toLocaleLowerCase())?.["value"] ?? "";
		}

		return fcAction;
	};

	getTestType = (type: string): string => {
		switch (type) {
			case "res-code":
				return "Response Code";
			case "res-body":
				return "Response Body";
			case "res-time":
				return "Response Time";
			case "Content-Type":
				return "Content-Type";
			case "Content-Length":
				return "Content-Length";
			case "Content-Encoding":
				return "Content-Encoding";
			case "custom-header":
				return "Header";
			case "json-query":
				return "JSON";
			default:
				return "";
		}
	};

	getRequestItem = (req: RequestsEntity): IRequestModel => {
		let request: IRequestModel = {
			id: uuidv4(),
			url: req.url,
			name: req.name,
			createdTime: formatDate(),
			method: req.method.toLocaleLowerCase() as MethodType,
			params: this.getParams(req.params),
			auth: this.getAuthDetails(req.auth),
			headers: this.getHeaders(req.headers),
			body: this.getBody(req.body),
			tests: this.getTests(req.tests),
			setvar: this.getSetVariables(req.tests),
			notes: "",
			preFetch: JSON.parse(JSON.stringify(InitialPreFetch))
		};
		return request;
	};

	importFolderItem = (item: FoldersEntity): IFolder => {
		return {
			id: uuidv4(),
			name: item.name,
			type: "folder",
			createdTime: formatDate(),
			data: [],
			settings: item.settings ? this.importSettings(item.settings) : JSON.parse(JSON.stringify(InitialSettings))
		};
	};

	importSettings = (parentsettings: Settings): ISettings => {
		let settings: ISettings = {
			auth: this.getAuthDetails(parentsettings.auth),
			preFetch: { requests: [] },
			headers: this.getHeaders(parentsettings.headers)
		};

		return settings;
	};

	getParentItem = (source: ICollections | IFolder, searchId: string): IFolder => {
		let pos = source.data.findIndex((el: any) => el.id === searchId);

		if (pos !== -1) {
			return (source.data[pos] as IFolder);
		}

		for (let i = 0; i < source.data.length; i++) {
			if (isFolder(source.data[i])) {
				return this.getParentItem(source.data[i] as IFolder, searchId);
			}
		}

		return null;
	};

	importCollection = (): { fcCollection: ICollections, fcRequests: IRequestModel[] } => {
		let requests: IRequestModel[] = [];
		let ids: { [id: string]: string } = {};

		let collection: ICollections = {
			id: uuidv4(),
			name: this.collection.collectionName,
			createdTime: formatDate(),
			variableId: "",
			data: [],
			settings: this.collection.settings ? this.importSettings(this.collection.settings) : JSON.parse(JSON.stringify(InitialSettings))
		};

		this.collection.folders?.forEach((folderItem: FoldersEntity) => {
			let fcFolder = this.importFolderItem(folderItem);
			ids[folderItem._id] = fcFolder.id;
			if (folderItem.containerId) {
				let parentFolder = this.getParentItem(collection, ids[folderItem.containerId]);
				parentFolder.data.push(fcFolder);
			}
			else {
				collection.data.push(fcFolder);
			}
		});

		this.collection.requests?.forEach((request: RequestsEntity) => {
			let req = this.getRequestItem(request);

			let history: IHistory = {
				id: req.id,
				name: req.name,
				method: req.method,
				url: req.url,
				createdTime: formatDate()
			};

			requests.push(req);

			if (request.containerId) {
				let folder = this.getParentItem(collection, ids[request.containerId]);
				folder.data.push(history);
			}
			else {
				collection.data.push(history);
			}
		});

		return {
			fcCollection: collection,
			fcRequests: requests
		};
	};
};


export const thunderClientImporter = (rawData: string): { fcCollection: ICollections, fcRequests: IRequestModel[] } | null => {
	try {
		const collection = JSON.parse(rawData) as ThunderClient_Schema_1_2;
		if (collection.clientName === "Thunder Client") {
			return new ThunderClientImport(collection).importCollection();
		}
	} catch (err) {
		writeLog("error::thunderClientImporter(): - Error Message : " + err);
		return null;
	}

	return null;
};
