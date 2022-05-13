let obj: any = null;
export class FetchClientDataProxy {
  public readonly app: string;
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly createdTime: string;
  public readonly exportedDate: string;
  public readonly data: DataEntityProxy[] | null;
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
    return new FetchClientDataProxy(d);
  }
  private constructor(d: any) {
    this.app = d.app;
    this.id = d.id;
    this.name = d.name;
    this.version = d.version;
    this.createdTime = d.createdTime;
    this.exportedDate = d.exportedDate;
    this.data = d.data;
  }
}

export class DataEntityProxy {
  public readonly id: string;
  public readonly url: string;
  public readonly name: string;
  public readonly createdTime: string;
  public readonly method: string;
  public readonly params: ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy[] | null;
  public readonly auth: AuthProxy;
  public readonly headers: ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy[] | null;
  public readonly body: BodyProxy;
  public readonly tests: TestsEntityProxy[] | null;
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
    checkString(d.url, false, field + ".url");
    checkString(d.name, false, field + ".name");
    checkString(d.createdTime, false, field + ".createdTime");
    checkString(d.method, false, field + ".method");
    checkArray(d.params, field + ".params");
    if (d.params) {
      for (let i = 0; i < d.params.length; i++) {
        d.params[i] = ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy.Create(d.params[i], field + ".params" + "[" + i + "]");
      }
    }
    if (d.params === undefined) {
      d.params = null;
    }
    d.auth = AuthProxy.Create(d.auth, field + ".auth");
    checkArray(d.headers, field + ".headers");
    if (d.headers) {
      for (let i = 0; i < d.headers.length; i++) {
        d.headers[i] = ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy.Create(d.headers[i], field + ".headers" + "[" + i + "]");
      }
    }
    if (d.headers === undefined) {
      d.headers = null;
    }
    d.body = BodyProxy.Create(d.body, field + ".body");
    checkArray(d.tests, field + ".tests");
    if (d.tests) {
      for (let i = 0; i < d.tests.length; i++) {
        d.tests[i] = TestsEntityProxy.Create(d.tests[i], field + ".tests" + "[" + i + "]");
      }
    }
    if (d.tests === undefined) {
      d.tests = null;
    }
    return new DataEntityProxy(d);
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
  }
}

export class ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy {
  public readonly isChecked: boolean;
  public readonly key: string;
  public readonly value: string;
  public static Parse(d: string): ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy {
    return ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy.Create(JSON.parse(d));
  }
  public static Create(d: any, field: string = 'root'): ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy {
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
    return new ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy(d);
  }
  private constructor(d: any) {
    this.isChecked = d.isChecked;
    this.key = d.key;
    this.value = d.value;
  }
}

export class AuthProxy {
  public readonly authType: string;
  public readonly userName: string;
  public readonly password: string;
  public readonly addTo: string;
  public readonly showPwd: boolean;
  public static Parse(d: string): AuthProxy {
    return AuthProxy.Create(JSON.parse(d));
  }
  public static Create(d: any, field: string = 'root'): AuthProxy {
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
    return new AuthProxy(d);
  }
  private constructor(d: any) {
    this.authType = d.authType;
    this.userName = d.userName;
    this.password = d.password;
    this.addTo = d.addTo;
    this.showPwd = d.showPwd;
  }
}

export class BodyProxy {
  public readonly bodyType: string;
  public readonly formdata: ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy[] | null;
  public readonly urlencoded: ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy[] | null;
  public readonly raw: RawProxy;
  public readonly binary: BinaryProxy;
  public readonly graphql: GraphqlProxy;
  public static Parse(d: string): BodyProxy {
    return BodyProxy.Create(JSON.parse(d));
  }
  public static Create(d: any, field: string = 'root'): BodyProxy {
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
        d.formdata[i] = ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy.Create(d.formdata[i], field + ".formdata" + "[" + i + "]");
      }
    }
    if (d.formdata === undefined) {
      d.formdata = null;
    }
    checkArray(d.urlencoded, field + ".urlencoded");
    if (d.urlencoded) {
      for (let i = 0; i < d.urlencoded.length; i++) {
        d.urlencoded[i] = ParamsEntityOrHeadersEntityOrFormdataEntityOrUrlencodedEntityProxy.Create(d.urlencoded[i], field + ".urlencoded" + "[" + i + "]");
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
  private constructor(d: any) {
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
