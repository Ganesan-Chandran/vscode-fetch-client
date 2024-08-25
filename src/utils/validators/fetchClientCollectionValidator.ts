// Stores the currently-being-typechecked object for error messages.
let obj: any = null;
export class FetchClientDataProxy {
	public readonly app: string;
	public readonly id: string;
	public readonly name: string;
	public readonly version: string;
	public readonly type: string;
	public readonly createdTime: string;
	public readonly exportedDate: string;
	public readonly data: DataEntityProxy[] | null;
	public readonly settings: SettingsProxy | null;
	public static Parse(d: string): FetchClientDataProxy {
		return FetchClientDataProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): FetchClientDataProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.app, false, field + ".app");
		checkStringValue(d.app, field + ".app", "Fetch Client");
		checkString(d.id, false, field + ".id");
		checkString(d.name, false, field + ".name");
		checkString(d.version, false, field + ".version");
		checkString(d.type, false, field + ".type");
		checkStringValue(d.type, field + ".type", "collections");
		checkString(d.createdTime, false, field + ".createdTime");
		checkString(d.exportedDate, false, field + ".exportedDate");
		checkArray(d.data, field + ".data");
		if (d.data) {
			for (let i = 0; i < d.data.length; i++) {
				d.data[i] = DataEntityProxy.Create(d.data[i], field + ".data" + "[" + i + "]");
			}
		}
		if (d.data === undefined) {
			d.data = null;
		}
		if (d.settings) {
			d.settings = SettingsProxy.Create(d.settings, field + ".settings");
		}
		return new FetchClientDataProxy(d);
	}
	private constructor(d: any) {
		this.app = d.app;
		this.id = d.id;
		this.name = d.name;
		this.version = d.version;
		this.type = d.type;
		this.createdTime = d.createdTime;
		this.exportedDate = d.exportedDate;
		this.data = d.data;
		this.settings = d.settings;
	}
}

export class DataEntityProxy {
	public readonly id: string;
	public readonly name: string;
	public readonly type: string | null;
	public readonly createdTime: string;
	public readonly data: DataEntity1Proxy[] | null;
	public readonly settings: Settings1Proxy | null;
	public readonly url: string | null;
	public readonly method: string | null;
	public readonly params: TableDataEntity[] | null;
	public readonly auth: AuthProxy | null;
	public readonly headers: HeadersEntityProxy[] | null;
	public readonly body: BodyProxy | null;
	public readonly tests: TestsEntityProxy[] | null;
	public readonly setvar: SetvarEntityProxy[] | null;
	public readonly notes: string | null;
	public readonly preFetch: PreFetchProxy | null;
	public static Parse(d: string): DataEntityProxy {
		return DataEntityProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): DataEntityProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.id, false, field + ".id");
		checkString(d.name, false, field + ".name");
		checkString(d.type, true, field + ".type");
		if (d.type === undefined) {
			d.type = null;
		}
		checkString(d.createdTime, false, field + ".createdTime");
		checkArray(d.data, field + ".data");
		if (d.data) {
			for (let i = 0; i < d.data.length; i++) {
				d.data[i] = DataEntity1Proxy.Create(d.data[i], field + ".data" + "[" + i + "]");
			}
		}
		if (d.data === undefined) {
			d.data = null;
		}
		d.settings = Settings1Proxy.Create(d.settings, field + ".settings");
		if (d.settings === undefined) {
			d.settings = null;
		}
		checkString(d.url, true, field + ".url");
		if (d.url === undefined) {
			d.url = null;
		}
		checkString(d.method, true, field + ".method");
		if (d.method === undefined) {
			d.method = null;
		}
		checkArray(d.params, field + ".params");
		if (d.params) {
			for (let i = 0; i < d.params.length; i++) {
				d.params[i] = TableDataEntity.Create(d.params[i], field + ".params" + "[" + i + "]");
			}
		}
		if (d.params === undefined) {
			d.params = null;
		}
		d.auth = AuthProxy.Create(d.auth, field + ".auth");
		if (d.auth === undefined) {
			d.auth = null;
		}
		checkArray(d.headers, field + ".headers");
		if (d.headers) {
			for (let i = 0; i < d.headers.length; i++) {
				d.headers[i] = HeadersEntityProxy.Create(d.headers[i], field + ".headers" + "[" + i + "]");
			}
		}
		if (d.headers === undefined) {
			d.headers = null;
		}
		d.body = BodyProxy.Create(d.body, field + ".body");
		if (d.body === undefined) {
			d.body = null;
		}
		checkArray(d.tests, field + ".tests");
		if (d.tests) {
			for (let i = 0; i < d.tests.length; i++) {
				d.tests[i] = TestsEntityProxy.Create(d.tests[i], field + ".tests" + "[" + i + "]");
			}
		}
		if (d.tests === undefined) {
			d.tests = null;
		}
		checkArray(d.setvar, field + ".setvar");
		if (d.setvar) {
			for (let i = 0; i < d.setvar.length; i++) {
				d.setvar[i] = SetvarEntityProxy.Create(d.setvar[i], field + ".setvar" + "[" + i + "]");
			}
		}
		if (d.setvar === undefined) {
			d.setvar = null;
		}
		checkString(d.notes, true, field + ".notes");
		if (d.notes === undefined) {
			d.notes = null;
		}
		d.preFetch = PreFetchProxy.Create(d.preFetch, field + ".preFetch");
		if (d.preFetch === undefined) {
			d.preFetch = null;
		}
		return new DataEntityProxy(d);
	}
	private constructor(d: any) {
		this.id = d.id;
		this.name = d.name;
		this.type = d.type;
		this.createdTime = d.createdTime;
		this.data = d.data;
		this.settings = d.settings;
		this.url = d.url;
		this.method = d.method;
		this.params = d.params;
		this.auth = d.auth;
		this.headers = d.headers;
		this.body = d.body;
		this.tests = d.tests;
		this.setvar = d.setvar;
		this.notes = d.notes;
		this.preFetch = d.preFetch;
	}
}

export class DataEntity1Proxy {
	public readonly id: string;
	public readonly name: string;
	public readonly type: string | null;
	public readonly createdTime: string;
	public readonly data: DataEntity2Proxy[] | null;
	public readonly settings: Settings2Proxy | null;
	public readonly url: string | null;
	public readonly method: string | null;
	public readonly params: TableDataEntity[] | null;
	public readonly auth: Auth1Proxy | null;
	public readonly headers: TableDataEntity[] | null;
	public readonly body: Body1Proxy | null;
	public readonly tests: TestsEntityProxy[] | null;
	public readonly setvar: SetvarEntityProxy[] | null;
	public readonly notes: string | null;
	public static Parse(d: string): DataEntity1Proxy {
		return DataEntity1Proxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): DataEntity1Proxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.id, false, field + ".id");
		checkString(d.name, false, field + ".name");
		checkString(d.type, true, field + ".type");
		if (d.type === undefined) {
			d.type = null;
		}
		checkString(d.createdTime, false, field + ".createdTime");
		checkArray(d.data, field + ".data");
		if (d.data) {
			for (let i = 0; i < d.data.length; i++) {
				d.data[i] = DataEntity2Proxy.Create(d.data[i], field + ".data" + "[" + i + "]");
			}
		}
		if (d.data === undefined) {
			d.data = null;
		}
		d.settings = Settings2Proxy.Create(d.settings, field + ".settings");
		if (d.settings === undefined) {
			d.settings = null;
		}
		checkString(d.url, true, field + ".url");
		if (d.url === undefined) {
			d.url = null;
		}
		checkString(d.method, true, field + ".method");
		if (d.method === undefined) {
			d.method = null;
		}
		checkArray(d.params, field + ".params");
		if (d.params) {
			for (let i = 0; i < d.params.length; i++) {
				d.params[i] = TableDataEntity.Create(d.params[i], field + ".params" + "[" + i + "]");
			}
		}
		if (d.params === undefined) {
			d.params = null;
		}
		d.auth = Auth1Proxy.Create(d.auth, field + ".auth");
		if (d.auth === undefined) {
			d.auth = null;
		}
		checkArray(d.headers, field + ".headers");
		if (d.headers) {
			for (let i = 0; i < d.headers.length; i++) {
				d.headers[i] = TableDataEntity.Create(d.headers[i], field + ".headers" + "[" + i + "]");
			}
		}
		if (d.headers === undefined) {
			d.headers = null;
		}
		d.body = Body1Proxy.Create(d.body, field + ".body");
		if (d.body === undefined) {
			d.body = null;
		}
		checkArray(d.tests, field + ".tests");
		if (d.tests) {
			for (let i = 0; i < d.tests.length; i++) {
				d.tests[i] = TestsEntityProxy.Create(d.tests[i], field + ".tests" + "[" + i + "]");
			}
		}
		if (d.tests === undefined) {
			d.tests = null;
		}
		checkArray(d.setvar, field + ".setvar");
		if (d.setvar) {
			for (let i = 0; i < d.setvar.length; i++) {
				d.setvar[i] = SetvarEntityProxy.Create(d.setvar[i], field + ".setvar" + "[" + i + "]");
			}
		}
		if (d.setvar === undefined) {
			d.setvar = null;
		}
		checkString(d.notes, true, field + ".notes");
		if (d.notes === undefined) {
			d.notes = null;
		}
		return new DataEntity1Proxy(d);
	}
	private constructor(d: any) {
		this.id = d.id;
		this.name = d.name;
		this.type = d.type;
		this.createdTime = d.createdTime;
		this.data = d.data;
		this.settings = d.settings;
		this.url = d.url;
		this.method = d.method;
		this.params = d.params;
		this.auth = d.auth;
		this.headers = d.headers;
		this.body = d.body;
		this.tests = d.tests;
		this.setvar = d.setvar;
		this.notes = d.notes;
	}
}

export class DataEntity2Proxy {
	public readonly id: string;
	public readonly url: string;
	public readonly name: string;
	public readonly createdTime: string;
	public readonly method: string;
	public readonly params: TableDataEntity[] | null;
	public readonly auth: Auth2Proxy;
	public readonly headers: TableDataEntity[] | null;
	public readonly body: Body2Proxy;
	public readonly tests: TestsEntityProxy[] | null;
	public readonly setvar: SetvarEntityProxy[] | null;
	public readonly notes: string;
	public static Parse(d: string): DataEntity2Proxy {
		return DataEntity2Proxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): DataEntity2Proxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.id, false, field + ".id");
		checkString(d.url, false, field + ".url");
		checkString(d.name, false, field + ".name");
		checkString(d.createdTime, false, field + ".createdTime");
		checkString(d.method, false, field + ".method");
		checkArray(d.params, field + ".params");
		if (d.params) {
			for (let i = 0; i < d.params.length; i++) {
				d.params[i] = TableDataEntity.Create(d.params[i], field + ".params" + "[" + i + "]");
			}
		}
		if (d.params === undefined) {
			d.params = null;
		}
		d.auth = Auth2Proxy.Create(d.auth, field + ".auth");
		checkArray(d.headers, field + ".headers");
		if (d.headers) {
			for (let i = 0; i < d.headers.length; i++) {
				d.headers[i] = TableDataEntity.Create(d.headers[i], field + ".headers" + "[" + i + "]");
			}
		}
		if (d.headers === undefined) {
			d.headers = null;
		}
		d.body = Body2Proxy.Create(d.body, field + ".body");
		checkArray(d.tests, field + ".tests");
		if (d.tests) {
			for (let i = 0; i < d.tests.length; i++) {
				d.tests[i] = TestsEntityProxy.Create(d.tests[i], field + ".tests" + "[" + i + "]");
			}
		}
		if (d.tests === undefined) {
			d.tests = null;
		}
		checkArray(d.setvar, field + ".setvar");
		if (d.setvar) {
			for (let i = 0; i < d.setvar.length; i++) {
				d.setvar[i] = SetvarEntityProxy.Create(d.setvar[i], field + ".setvar" + "[" + i + "]");
			}
		}
		if (d.setvar === undefined) {
			d.setvar = null;
		}
		checkString(d.notes, false, field + ".notes");
		return new DataEntity2Proxy(d);
	}
	private constructor(d: any) {
		this.id = d.id;
		this.url = d.url;
		this.name = d.name;
		this.createdTime = d.createdTime;
		this.method = d.method;
		this.params = d.params;
		this.auth = d.auth;
		this.headers = d.headers;
		this.body = d.body;
		this.tests = d.tests;
		this.setvar = d.setvar;
		this.notes = d.notes;
	}
}

export class TableDataEntity {
	public readonly isChecked: boolean;
	public readonly key: string;
	public readonly value: string;
	public static Parse(d: string): TableDataEntity {
		return TableDataEntity.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): TableDataEntity {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkBoolean(d.isChecked, false, field + ".isChecked");
		checkString(d.key, false, field + ".key");
		checkString(d.value, false, field + ".value");
		return new TableDataEntity(d);
	}
	private constructor(d: any) {
		this.isChecked = d.isChecked;
		this.key = d.key;
		this.value = d.value;
	}
}

export class Auth2Proxy {
	public readonly authType: string;
	public readonly userName: string;
	public readonly password: string;
	public readonly addTo: string;
	public readonly showPwd: boolean;
	public readonly tokenPrefix: string;
	public readonly aws: AwsProxy;
	public readonly oauth: OauthProxy;
	public static Parse(d: string): Auth2Proxy {
		return Auth2Proxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): Auth2Proxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.authType, false, field + ".authType");
		checkString(d.userName, false, field + ".userName");
		checkString(d.password, false, field + ".password");
		checkString(d.addTo, false, field + ".addTo");
		checkBoolean(d.showPwd, false, field + ".showPwd");
		checkString(d.tokenPrefix, false, field + ".tokenPrefix");
		d.aws = AwsProxy.Create(d.aws, field + ".aws");
		d.oauth = OauthProxy.Create(d.oauth, field + ".oauth");
		return new Auth2Proxy(d);
	}
	private constructor(d: any) {
		this.authType = d.authType;
		this.userName = d.userName;
		this.password = d.password;
		this.addTo = d.addTo;
		this.showPwd = d.showPwd;
		this.tokenPrefix = d.tokenPrefix;
		this.aws = d.aws;
		this.oauth = d.oauth;
	}
}

export class AwsProxy {
	public readonly service: string;
	public readonly region: string;
	public readonly accessKey: string;
	public readonly secretAccessKey: string;
	public readonly sessionToken: string;
	public static Parse(d: string): AwsProxy {
		return AwsProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): AwsProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			return null;
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.service, false, field + ".service");
		checkString(d.region, false, field + ".region");
		checkString(d.accessKey, false, field + ".accessKey");
		checkString(d.secretAccessKey, false, field + ".secretAccessKey");
		checkString(d.sessionToken, false, field + ".sessionToken");
		return new AwsProxy(d);
	}
	private constructor(d: any) {
		this.service = d.service;
		this.region = d.region;
		this.accessKey = d.accessKey;
		this.secretAccessKey = d.secretAccessKey;
		this.sessionToken = d.sessionToken;
	}
}

export class OauthProxy {
	public readonly clientAuth: string;
	public readonly clientId: string;
	public readonly clientSecret: string;
	public readonly grantType: string;
	public readonly password: string;
	public readonly scope: string;
	public readonly tokenName: string;
	public readonly tokenUrl: string;
	public readonly username: string;
	public readonly advancedOpt: AdvancedOptProxy;
	public static Parse(d: string): OauthProxy {
		return OauthProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): OauthProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			return null;
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.clientAuth, false, field + ".clientAuth");
		checkString(d.clientId, false, field + ".clientId");
		checkString(d.clientSecret, false, field + ".clientSecret");
		checkString(d.grantType, false, field + ".grantType");
		checkString(d.password, false, field + ".password");
		checkString(d.scope, false, field + ".scope");
		checkString(d.tokenName, false, field + ".tokenName");
		checkString(d.tokenUrl, false, field + ".tokenUrl");
		checkString(d.username, false, field + ".username");
		d.advancedOpt = AdvancedOptProxy.Create(d.advancedOpt, field + ".advancedOpt");
		return new OauthProxy(d);
	}
	private constructor(d: any) {
		this.clientAuth = d.clientAuth;
		this.clientId = d.clientId;
		this.clientSecret = d.clientSecret;
		this.grantType = d.grantType;
		this.password = d.password;
		this.scope = d.scope;
		this.tokenName = d.tokenName;
		this.tokenUrl = d.tokenUrl;
		this.username = d.username;
		this.advancedOpt = d.advancedOpt;
	}
}

export class AdvancedOptProxy {
	public readonly audience: string;
	public readonly resource: string;
	public static Parse(d: string): AdvancedOptProxy {
		return AdvancedOptProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): AdvancedOptProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.audience, false, field + ".audience");
		checkString(d.resource, false, field + ".resource");
		return new AdvancedOptProxy(d);
	}
	private constructor(d: any) {
		this.audience = d.audience;
		this.resource = d.resource;
	}
}

export class Body2Proxy {
	public readonly bodyType: string;
	public readonly formdata: TableDataEntity[] | null;
	public readonly urlencoded: TableDataEntity[] | null;
	public readonly raw: RawProxy;
	public readonly binary: BinaryProxy;
	public readonly graphql: GraphqlProxy;
	public static Parse(d: string): Body2Proxy {
		return Body2Proxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): Body2Proxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.bodyType, false, field + ".bodyType");
		checkArray(d.formdata, field + ".formdata");
		if (d.formdata) {
			for (let i = 0; i < d.formdata.length; i++) {
				d.formdata[i] = TableDataEntity.Create(d.formdata[i], field + ".formdata" + "[" + i + "]");
			}
		}
		if (d.formdata === undefined) {
			d.formdata = null;
		}
		checkArray(d.urlencoded, field + ".urlencoded");
		if (d.urlencoded) {
			for (let i = 0; i < d.urlencoded.length; i++) {
				d.urlencoded[i] = TableDataEntity.Create(d.urlencoded[i], field + ".urlencoded" + "[" + i + "]");
			}
		}
		if (d.urlencoded === undefined) {
			d.urlencoded = null;
		}
		d.raw = RawProxy.Create(d.raw, field + ".raw");
		d.binary = BinaryProxy.Create(d.binary, field + ".binary");
		d.graphql = GraphqlProxy.Create(d.graphql, field + ".graphql");
		return new Body2Proxy(d);
	}
	private constructor(d: any) {
		this.bodyType = d.bodyType;
		this.formdata = d.formdata;
		this.urlencoded = d.urlencoded;
		this.raw = d.raw;
		this.binary = d.binary;
		this.graphql = d.graphql;
	}
}

export class RawProxy {
	public readonly data: string;
	public readonly lang: string;
	public static Parse(d: string): RawProxy {
		return RawProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): RawProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.data, false, field + ".data");
		checkString(d.lang, false, field + ".lang");
		return new RawProxy(d);
	}
	private constructor(d: any) {
		this.data = d.data;
		this.lang = d.lang;
	}
}

export class BinaryProxy {
	public readonly fileName: string;
	public readonly data: DataProxy;
	public readonly contentTypeOption: string;
	public static Parse(d: string): BinaryProxy {
		return BinaryProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): BinaryProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.fileName, false, field + ".fileName");
		d.data = DataProxy.Create(d.data, field + ".data");
		checkString(d.contentTypeOption, false, field + ".contentTypeOption");
		return new BinaryProxy(d);
	}
	private constructor(d: any) {
		this.fileName = d.fileName;
		this.data = d.data;
		this.contentTypeOption = d.contentTypeOption;
	}
}

export class DataProxy {
	public static Parse(d: string): DataProxy {
		return DataProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): DataProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		return new DataProxy(d);
	}
	private constructor(_d: any) {
	}
}

export class GraphqlProxy {
	public readonly query: string;
	public readonly variables: string;
	public static Parse(d: string): GraphqlProxy {
		return GraphqlProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): GraphqlProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.query, false, field + ".query");
		checkString(d.variables, false, field + ".variables");
		return new GraphqlProxy(d);
	}
	private constructor(d: any) {
		this.query = d.query;
		this.variables = d.variables;
	}
}

export class TestsEntityProxy {
	public readonly parameter: string;
	public readonly action: string;
	public readonly expectedValue: string;
	public static Parse(d: string): TestsEntityProxy {
		return TestsEntityProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): TestsEntityProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.parameter, false, field + ".parameter");
		checkString(d.action, false, field + ".action");
		checkString(d.expectedValue, false, field + ".expectedValue");
		return new TestsEntityProxy(d);
	}
	private constructor(d: any) {
		this.parameter = d.parameter;
		this.action = d.action;
		this.expectedValue = d.expectedValue;
	}
}

export class SetvarEntityProxy {
	public readonly parameter: string;
	public readonly key: string;
	public readonly variableName: string;
	public static Parse(d: string): SetvarEntityProxy {
		return SetvarEntityProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): SetvarEntityProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.parameter, false, field + ".parameter");
		checkString(d.key, false, field + ".key");
		checkString(d.variableName, false, field + ".variableName");
		return new SetvarEntityProxy(d);
	}
	private constructor(d: any) {
		this.parameter = d.parameter;
		this.key = d.key;
		this.variableName = d.variableName;
	}
}

export class Settings2Proxy {
	public readonly auth: Auth2Proxy;
	public static Parse(d: string): Settings2Proxy | null {
		return Settings2Proxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): Settings2Proxy | null {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			return null;
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, true);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, true);
		}
		d.auth = Auth2Proxy.Create(d.auth, field + ".auth");
		return new Settings2Proxy(d);
	}
	private constructor(d: any) {
		this.auth = d.auth;
	}
}

export class Auth1Proxy {
	public readonly authType: string;
	public readonly userName: string;
	public readonly password: string;
	public readonly addTo: string;
	public readonly showPwd: boolean;
	public readonly tokenPrefix: string;
	public readonly aws: AwsProxy;
	public readonly oauth: OauthProxy;
	public static Parse(d: string): Auth1Proxy | null {
		return Auth1Proxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): Auth1Proxy | null {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			return null;
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, true);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, true);
		}
		checkString(d.authType, false, field + ".authType");
		checkString(d.userName, false, field + ".userName");
		checkString(d.password, false, field + ".password");
		checkString(d.addTo, false, field + ".addTo");
		checkBoolean(d.showPwd, false, field + ".showPwd");
		checkString(d.tokenPrefix, false, field + ".tokenPrefix");
		d.aws = AwsProxy.Create(d.aws, field + ".aws");
		d.oauth = OauthProxy.Create(d.oauth, field + ".oauth");
		return new Auth1Proxy(d);
	}
	private constructor(d: any) {
		this.authType = d.authType;
		this.userName = d.userName;
		this.password = d.password;
		this.addTo = d.addTo;
		this.showPwd = d.showPwd;
		this.tokenPrefix = d.tokenPrefix;
		this.aws = d.aws;
		this.oauth = d.oauth;
	}
}

export class Body1Proxy {
	public readonly bodyType: string;
	public readonly formdata: TableDataEntity[] | null;
	public readonly urlencoded: TableDataEntity[] | null;
	public readonly raw: RawProxy;
	public readonly binary: BinaryProxy;
	public readonly graphql: GraphqlProxy;
	public static Parse(d: string): Body1Proxy | null {
		return Body1Proxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): Body1Proxy | null {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			return null;
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, true);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, true);
		}
		checkString(d.bodyType, false, field + ".bodyType");
		checkArray(d.formdata, field + ".formdata");
		if (d.formdata) {
			for (let i = 0; i < d.formdata.length; i++) {
				d.formdata[i] = TableDataEntity.Create(d.formdata[i], field + ".formdata" + "[" + i + "]");
			}
		}
		if (d.formdata === undefined) {
			d.formdata = null;
		}
		checkArray(d.urlencoded, field + ".urlencoded");
		if (d.urlencoded) {
			for (let i = 0; i < d.urlencoded.length; i++) {
				d.urlencoded[i] = TableDataEntity.Create(d.urlencoded[i], field + ".urlencoded" + "[" + i + "]");
			}
		}
		if (d.urlencoded === undefined) {
			d.urlencoded = null;
		}
		d.raw = RawProxy.Create(d.raw, field + ".raw");
		d.binary = BinaryProxy.Create(d.binary, field + ".binary");
		d.graphql = GraphqlProxy.Create(d.graphql, field + ".graphql");
		return new Body1Proxy(d);
	}
	private constructor(d: any) {
		this.bodyType = d.bodyType;
		this.formdata = d.formdata;
		this.urlencoded = d.urlencoded;
		this.raw = d.raw;
		this.binary = d.binary;
		this.graphql = d.graphql;
	}
}

export class Settings1Proxy {
	public readonly auth: Auth2Proxy;
	public static Parse(d: string): Settings1Proxy | null {
		return Settings1Proxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): Settings1Proxy | null {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			return null;
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, true);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, true);
		}
		d.auth = Auth2Proxy.Create(d.auth, field + ".auth");
		return new Settings1Proxy(d);
	}
	private constructor(d: any) {
		this.auth = d.auth;
	}
}

export class AuthProxy {
	public readonly authType: string;
	public readonly userName: string;
	public readonly password: string;
	public readonly addTo: string;
	public readonly showPwd: boolean;
	public readonly tokenPrefix: string;
	public readonly aws: AwsProxy | null;
	public readonly oauth: OauthProxy | null;
	public static Parse(d: string): AuthProxy | null {
		return AuthProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): AuthProxy | null {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			return null;
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, true);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, true);
		}
		checkString(d.authType, false, field + ".authType");
		checkString(d.userName, false, field + ".userName");
		checkString(d.password, false, field + ".password");
		checkString(d.addTo, false, field + ".addTo");
		checkBoolean(d.showPwd, false, field + ".showPwd");
		checkString(d.tokenPrefix, false, field + ".tokenPrefix");
		d.aws = AwsProxy.Create(d.aws, field + ".aws");
		d.oauth = OauthProxy.Create(d.oauth, field + ".oauth");
		return new AuthProxy(d);
	}
	private constructor(d: any) {
		this.authType = d.authType;
		this.userName = d.userName;
		this.password = d.password;
		this.addTo = d.addTo;
		this.showPwd = d.showPwd;
		this.tokenPrefix = d.tokenPrefix;
		this.aws = d.aws;
		this.oauth = d.oauth;
	}
}

export class HeadersEntityProxy {
	public readonly isChecked: boolean;
	public readonly isFixed: boolean | null;
	public readonly key: string;
	public readonly value: string;
	public static Parse(d: string): HeadersEntityProxy {
		return HeadersEntityProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): HeadersEntityProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkBoolean(d.isChecked, false, field + ".isChecked");
		checkBoolean(d.isFixed, true, field + ".isFixed");
		if (d.isFixed === undefined) {
			d.isFixed = null;
		}
		checkString(d.key, false, field + ".key");
		checkString(d.value, false, field + ".value");
		return new HeadersEntityProxy(d);
	}
	private constructor(d: any) {
		this.isChecked = d.isChecked;
		this.isFixed = d.isFixed;
		this.key = d.key;
		this.value = d.value;
	}
}

export class BodyProxy {
	public readonly bodyType: string;
	public readonly formdata: TableDataEntity[] | null;
	public readonly urlencoded: TableDataEntity[] | null;
	public readonly raw: RawProxy;
	public readonly binary: BinaryProxy;
	public readonly graphql: GraphqlProxy;
	public static Parse(d: string): BodyProxy | null {
		return BodyProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): BodyProxy | null {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			return null;
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, true);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, true);
		}
		checkString(d.bodyType, false, field + ".bodyType");
		checkArray(d.formdata, field + ".formdata");
		if (d.formdata) {
			for (let i = 0; i < d.formdata.length; i++) {
				d.formdata[i] = TableDataEntity.Create(d.formdata[i], field + ".formdata" + "[" + i + "]");
			}
		}
		if (d.formdata === undefined) {
			d.formdata = null;
		}
		checkArray(d.urlencoded, field + ".urlencoded");
		if (d.urlencoded) {
			for (let i = 0; i < d.urlencoded.length; i++) {
				d.urlencoded[i] = TableDataEntity.Create(d.urlencoded[i], field + ".urlencoded" + "[" + i + "]");
			}
		}
		if (d.urlencoded === undefined) {
			d.urlencoded = null;
		}
		d.raw = RawProxy.Create(d.raw, field + ".raw");
		d.binary = BinaryProxy.Create(d.binary, field + ".binary");
		d.graphql = GraphqlProxy.Create(d.graphql, field + ".graphql");
		return new BodyProxy(d);
	}
	private constructor(d: any) {
		this.bodyType = d.bodyType;
		this.formdata = d.formdata;
		this.urlencoded = d.urlencoded;
		this.raw = d.raw;
		this.binary = d.binary;
		this.graphql = d.graphql;
	}
}

export class PreFetchProxy {
	public readonly requests: RequestsEntityProxy[] | null;
	public static Parse(d: string): PreFetchProxy | null {
		return PreFetchProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): PreFetchProxy | null {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			return null;
		} else if (typeof(d) !== 'object') {
			throwNotObject(field, d, true);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, true);
		}
		checkArray(d.requests, field + ".requests");
		if (d.requests) {
			for (let i = 0; i < d.requests.length; i++) {
				d.requests[i] = RequestsEntityProxy.Create(d.requests[i], field + ".requests" + "[" + i + "]");
			}
		}
		if (d.requests === undefined) {
			d.requests = null;
		}
		return new PreFetchProxy(d);
	}
	private constructor(d: any) {
		this.requests = d.requests;
	}
}

export class RequestsEntityProxy {
	public readonly reqId: string;
	public readonly parentId: string;
	public readonly colId: string;
	public readonly order: number;
	public readonly condition: ConditionEntityProxy[] | null;
	public static Parse(d: string): RequestsEntityProxy {
		return RequestsEntityProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): RequestsEntityProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof(d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.reqId, false, field + ".reqId");
		checkString(d.parentId, false, field + ".parentId");
		checkString(d.colId, false, field + ".colId");
		checkNumber(d.order, false, field + ".order");
		checkArray(d.condition, field + ".condition");
		if (d.condition) {
			for (let i = 0; i < d.condition.length; i++) {
				d.condition[i] = ConditionEntityProxy.Create(d.condition[i], field + ".condition" + "[" + i + "]");
			}
		}
		if (d.condition === undefined) {
			d.condition = null;
		}
		return new RequestsEntityProxy(d);
	}
	private constructor(d: any) {
		this.reqId = d.reqId;
		this.parentId = d.parentId;
		this.colId = d.colId;
		this.order = d.order;
		this.condition = d.condition;
	}
}

export class ConditionEntityProxy {
	public readonly parameter: string;
	public readonly action: string;
	public readonly expectedValue: string;
	public readonly customParameter: string | null;
	public static Parse(d: string): ConditionEntityProxy {
		return ConditionEntityProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): ConditionEntityProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof(d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		checkString(d.parameter, false, field + ".parameter");
		checkString(d.action, false, field + ".action");
		checkString(d.expectedValue, false, field + ".expectedValue");
		checkString(d.customParameter, true, field + ".customParameter");
		if (d.customParameter === undefined) {
			d.customParameter = null;
		}
		return new ConditionEntityProxy(d);
	}
	private constructor(d: any) {
		this.parameter = d.parameter;
		this.action = d.action;
		this.expectedValue = d.expectedValue;
		this.customParameter = d.customParameter;
	}
}

export class SettingsProxy {
	public readonly auth: Auth2Proxy;
	public static Parse(d: string): SettingsProxy {
		return SettingsProxy.Create(JSON.parse(d));
	}
	public static Create(d: any, field: string = 'root'): SettingsProxy {
		if (!field) {
			obj = d;
			field = "root";
		}
		if (d === null || d === undefined) {
			throwNull2NonNull(field, d);
		} else if (typeof (d) !== 'object') {
			throwNotObject(field, d, false);
		} else if (Array.isArray(d)) {
			throwIsArray(field, d, false);
		}
		d.auth = Auth2Proxy.Create(d.auth, field + ".auth");
		return new SettingsProxy(d);
	}
	private constructor(d: any) {
		this.auth = d.auth;
	}
}

function throwNull2NonNull(field: string, d: any): never {
	return errorHelper(field, d, "non-nullable object", false);
}
function throwNotObject(field: string, d: any, nullable: boolean): never {
	return errorHelper(field, d, "object", nullable);
}
function throwIsArray(field: string, d: any, nullable: boolean): never {
	return errorHelper(field, d, "object", nullable);
}
function checkArray(d: any, field: string): void {
	if (!Array.isArray(d) && d !== null && d !== undefined) {
		errorHelper(field, d, "array", true);
	}
}
function checkNumber(d: any, nullable: boolean, field: string): void {
	if (typeof(d) !== 'number' && (!nullable || (nullable && d !== null && d !== undefined))) {
		errorHelper(field, d, "number", nullable);
	}
}
function checkBoolean(d: any, nullable: boolean, field: string): void {
	if (typeof (d) !== 'boolean' && (!nullable || (nullable && d !== null && d !== undefined))) {
		errorHelper(field, d, "boolean", nullable);
	}
}
function checkString(d: any, nullable: boolean, field: string): void {
	if (typeof (d) !== 'string' && (!nullable || (nullable && d !== null && d !== undefined))) {
		errorHelper(field, d, "string", nullable);
	}
}
function errorHelper(field: string, d: any, type: string, nullable: boolean): never {
	if (nullable) {
		type += ", null, or undefined";
	}
	throw new TypeError("Expected '" + type + "' at '" + field + "' but found: " + JSON.stringify(d) + "\nFull object:\n" + JSON.stringify(obj));
}
function checkStringValue(d: any, field: string, value: string): void {
	if (d !== value) {
		errorHelper(field, d, value, false);
	}
}
