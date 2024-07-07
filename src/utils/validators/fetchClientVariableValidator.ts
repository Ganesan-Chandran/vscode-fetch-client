let obj: any = null;
export class FetchClientVariableProxy {
  public readonly app: string;
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly type: string;
  public readonly createdTime: string;
  public readonly exportedDate: string;
  public readonly isActive: boolean;
  public readonly data: DataEntityProxy[] | null;
  public static Parse(d: string): FetchClientVariableProxy {
    return FetchClientVariableProxy.Create(JSON.parse(d));
  }
  public static Create(d: any, field: string = 'root'): FetchClientVariableProxy {
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
    checkString(d.app, false, field + ".app");
    checkStringValue(d.app, field + ".app", "Fetch Client");
    checkString(d.id, false, field + ".id");
    checkString(d.name, false, field + ".name");
    checkString(d.version, false, field + ".version");
    checkString(d.type, false, field + ".type");
    checkStringValue(d.type, field + ".type", "variables");
    checkString(d.createdTime, false, field + ".createdTime");
    checkString(d.exportedDate, false, field + ".exportedDate");
    checkBoolean(d.isActive, false, field + ".isActive");
    checkArray(d.data, field + ".data");
    if (d.data) {
      for (let i = 0; i < d.data.length; i++) {
        d.data[i] = DataEntityProxy.Create(d.data[i], field + ".data" + "[" + i + "]");
      }
    }
    if (d.data === undefined) {
      d.data = null;
    }
    return new FetchClientVariableProxy(d);
  }
  private constructor(d: any) {
    this.app = d.app;
    this.id = d.id;
    this.name = d.name;
    this.version = d.version;
    this.type = d.type;
    this.createdTime = d.createdTime;
    this.exportedDate = d.exportedDate;
    this.isActive = d.isActive;
    this.data = d.data;
  }
}

export class DataEntityProxy {
  public readonly isChecked: boolean;
  public readonly key: string;
  public readonly value: string;
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
    } else if (typeof(d) !== 'object') {
      throwNotObject(field, d, false);
    } else if (Array.isArray(d)) {
      throwIsArray(field, d, false);
    }
    checkBoolean(d.isChecked, false, field + ".isChecked");
    checkString(d.key, false, field + ".key");
    checkString(d.value, false, field + ".value");
    return new DataEntityProxy(d);
  }
  private constructor(d: any) {
    this.isChecked = d.isChecked;
    this.key = d.key;
    this.value = d.value;
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
  if (typeof(d) !== 'boolean' && (!nullable || (nullable && d !== null && d !== undefined))) {
    errorHelper(field, d, "boolean", nullable);
  }
}
function checkString(d: any, nullable: boolean, field: string): void {
  if (typeof(d) !== 'string' && (!nullable || (nullable && d !== null && d !== undefined))) {
    errorHelper(field, d, "string", nullable);
  }
}
function errorHelper(field: string, d: any, type: string, nullable: boolean): never {
  if (nullable) {
    type += ", null, or undefined";
  }
  throw new TypeError("Expected '" + type + "' at '" + field + "' but found:\n" + JSON.stringify(d) + "\n\nFull object:\n" + JSON.stringify(obj));
}
function checkStringValue(d: any, field: string, value: string): void {
  if (d !== value) {
    errorHelper(field, d, value, false);
  }
}