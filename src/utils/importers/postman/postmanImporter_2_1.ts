import { XMLValidator } from "fast-xml-parser";
import { v4 as uuidv4 } from "uuid";
import { ITableData } from "../../../fetch-client-ui/components/Common/Table/types";
import { InitialAuth, InitialBody, InitialPreFetch, InitialSetVar, InitialTest } from "../../../fetch-client-ui/components/RequestUI/redux/reducer";
import { ClientAuth, GrantType, IAuth, IBodyData, IRequestModel, MethodType } from "../../../fetch-client-ui/components/RequestUI/redux/types";
import { InitialSettings } from "../../../fetch-client-ui/components/SideBar/redux/reducer";
import { ICollections, IFolder, IHistory, ISettings, IVariable } from "../../../fetch-client-ui/components/SideBar/redux/types";
import { isJson } from "../../../fetch-client-ui/components/TestUI/TestPanel/helper";
import { formatDate } from "../../helper";
import { writeLog } from "../../logger/logger";
import { Auth, Body, Header, Items, POSTMAN_SCHEMA_V2_1, PostmanSchema_2_1, RequestObject, URLObject, Variable } from "./postman_2_1.types";

export class PostmanImport {
  private collection: PostmanSchema_2_1;

  constructor(collection: PostmanSchema_2_1) {
    this.collection = collection;
  }

  importVariable = (variables: Variable[], name: string): IVariable => {
    if (variables?.length === 0) {
      return null;
    }

    let varData: ITableData[] = [];
    for (let i = 0; i < variables.length; i++) {
      const key = variables[i].key;
      if (key === undefined) {
        continue;
      }
      varData.push({
        isChecked: variables[i].disabled === true ? false : true,
        key: key,
        value: variables[i].value
      });
    }
    return {
      id: uuidv4(),
      name: name,
      createdTime: formatDate(),
      isActive: true,
      data: varData
    };
  };

  getUrl = (url?: URLObject | string) => {
    if (!url) {
      return "";
    }

    if (typeof url === "object" && url.raw) {
      return url.raw;
    }

    if (typeof url === "string") {
      return url;
    }
    return "";
  };

  getParams = (url?: URLObject | string): ITableData[] => {
    let fcParams: ITableData[] = [];

    if (url && typeof url === "object" && url.query) {
      url.query.forEach(item => {
        fcParams.push({
          key: item.key,
          value: item.value,
          isChecked: item.disabled === true ? false : true
        });
      });
    }
    return [...fcParams, {
      isChecked: false,
      key: "",
      value: ""
    }];
  };

  getHeders = (headers: Header[] | string): ITableData[] => {
    let fcHeaders: ITableData[] = [];
    if (headers && typeof headers !== "string") {
      (headers as Header[]).forEach(item => {
        fcHeaders.push({
          key: item.key,
          value: item.value,
          isChecked: item.disabled === true ? false : true
        });
      });
    }

    return [...fcHeaders, {
      isChecked: false,
      key: "",
      value: ""
    }];
  };

  getAuthDetails = (auth?: Auth | null): IAuth => {

    let fcAuth: IAuth = JSON.parse(JSON.stringify(InitialAuth));

    if (!auth) {
      fcAuth.authType = "inherit";
      return fcAuth;
    }

    switch (auth.type) {
      case "awsv4":
        if (!auth.awsv4) {
          return fcAuth;
        }

        fcAuth.aws.accessKey = this.findValueByKey(auth.awsv4, "accessKey");
        fcAuth.aws.secretAccessKey = this.findValueByKey(auth.awsv4, "secretKey");
        fcAuth.aws.service = this.findValueByKey(auth.awsv4, "service");
        fcAuth.aws.sessionToken = this.findValueByKey(auth.awsv4, "sessionToken");
        fcAuth.aws.region = this.findValueByKey(auth.awsv4, "region");
        fcAuth.authType = "aws";

        return fcAuth;


      case "basic":
        if (!auth.basic) {
          return fcAuth;
        }

        fcAuth.userName = this.findValueByKey(auth.basic, "username");
        fcAuth.password = this.findValueByKey(auth.basic, "password");
        fcAuth.authType = "basic";

        return fcAuth;

      case "apikey":
        if (!auth.apikey) {
          return fcAuth;
        }

        fcAuth.userName = this.findValueByKey(auth.apikey, "key");
        fcAuth.password = this.findValueByKey(auth.apikey, "value");
        let addToSection = this.findValueByKey(auth.apikey, "in");
        fcAuth.addTo = addToSection === "query" ? "queryparams" : "header";
        fcAuth.authType = "apikey";

        return fcAuth;

      case "bearer":
        if (!auth.bearer) {
          return fcAuth;
        }

        fcAuth.password = this.findValueByKey(auth.bearer, "token");
        fcAuth.tokenPrefix = "Bearer";
        fcAuth.authType = "bearertoken";

        return fcAuth;

      case "oauth2":
        if (!auth.oauth2) {
          return fcAuth;
        }

        let grantType = this.findValueByKey(auth.oauth2, "grant_type");

        if (grantType !== "client_credentials" && grantType !== "password_credentials") {
          return fcAuth;
        }

        let clientAuth = this.findValueByKey(auth.oauth2, "client_authentication");
        fcAuth.oauth.clientAuth = clientAuth === "body" ? ClientAuth.Body : ClientAuth.Header;
        fcAuth.oauth.clientId = this.findValueByKey(auth.oauth2, "clientId");
        fcAuth.oauth.clientSecret = this.findValueByKey(auth.oauth2, "clientSecret");
        fcAuth.oauth.grantType = grantType === "client_credentials" ? GrantType.Client_Crd : GrantType.PWD_Crd;
        fcAuth.oauth.password = this.findValueByKey(auth.oauth2, "password");
        fcAuth.oauth.username = this.findValueByKey(auth.oauth2, "username");
        fcAuth.oauth.scope = this.findValueByKey(auth.oauth2, "scope");
        fcAuth.oauth.tokenUrl = this.findValueByKey(auth.oauth2, "accessTokenUrl");

        let resource = this.findObjectByKey(auth.oauth2, "resource");
        let key = resource ? Object.keys(resource)[0] : "";
        fcAuth.oauth.advancedOpt.resource = resource && key ? resource[key] : "";
        let audience = this.findObjectByKey(auth.oauth2, "audience");
        key = audience ? Object.keys(audience)[0] : "";
        fcAuth.oauth.advancedOpt.audience = audience && key ? audience[key] : "";

        fcAuth.authType = "oauth2";

        return fcAuth;

      default:
        return fcAuth;
    }
  };

  getSrc = (src: any[] | null | string): string => {
    if (!src) {
      return "";
    }

    if (typeof src === "string") {
      return src.length > 1 ? src.substring(1) : src;
    }

    if (typeof src === "object") {
      return src.length > 0 ? src[0].length > 1 ? src[0].substring(1) : src[0] : "";
    }
  };

  getBody = (body: Body): IBodyData => {

    let fcBody = JSON.parse(JSON.stringify(InitialBody));

    if (!body) {
      return fcBody;
    }

    switch (body.mode) {
      case 'formdata':
        fcBody.bodyType = "formdata";
        fcBody.formdata.shift();
        body.formdata?.forEach(item => {
          fcBody.formdata.push({
            isChecked: item.disabled === true ? false : true,
            key: item.key,
            value: item.type === "file" ? this.getSrc(item.src) : item.value,
            type: item.type === "file" ? "File" : "Text"
          });
        });

        fcBody.formdata.push({
          isChecked: false,
          key: "",
          value: "",
          type: "Text"
        });

        return fcBody;

      case 'urlencoded':
        fcBody.bodyType = "formurlencoded";
        fcBody.urlencoded.shift();
        body.urlencoded?.forEach(item => {
          fcBody.urlencoded.push({
            isChecked: item.disabled === true ? false : true,
            key: item.key,
            value: item.value
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

      case 'raw':
        fcBody.bodyType = "raw";
        fcBody.raw.data = body.raw;
        fcBody.raw.lang = this.getRawBodyType(body.raw.replace(/(?:\\[rn]|[\r\n]+)+/g, ""));
        return fcBody;

      case 'file':
        fcBody.bodyType = "binary";
        fcBody.binary.data = body.file.content;
        fcBody.binary.fileName = body.file.src.substring(1);
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

  getHistoryItem = (i: Items, req: IRequestModel[]): IHistory => {
    let history: IHistory = {
      id: uuidv4(),
      name: i.name,
      method: (i.request as RequestObject).method,
      url: this.getUrl((i.request as RequestObject).url),
      createdTime: formatDate()
    };

    let reqObject = i.request as RequestObject;

    if (reqObject) {
      let request: IRequestModel = {
        id: history.id,
        url: history.url,
        name: history.name,
        createdTime: history.createdTime,
        method: history.method as MethodType,
        params: this.getParams(reqObject.url),
        auth: this.getAuthDetails(reqObject.auth),
        headers: this.getHeders(reqObject.header),
        body: this.getBody(reqObject.body),
        tests: JSON.parse(JSON.stringify(InitialTest)),
        setvar: JSON.parse(JSON.stringify(InitialSetVar)),
        notes: "",
        preFetch: JSON.parse(JSON.stringify(InitialPreFetch))
      };

      req.push(request);
    }

    return history;
  };

  getFolderItem = (items: Items[], requests: IRequestModel[]) => {
    return items.map((i: Items) => {
      if (Object.prototype.hasOwnProperty.call(i, "request")) {
        return this.getHistoryItem(i, requests);

      } else {
        let folder: IFolder = {
          id: uuidv4(),
          name: i.name,
          type: "folder",
          createdTime: formatDate(),
          data: i.item.reduce((accumulator: (IHistory | IFolder)[], item: Items) => {
            if (Object.prototype.hasOwnProperty.call(item, "request")) {
              return [...accumulator, this.getHistoryItem(item, requests)];
            }

            const requestGroup = this.importFolderItem(item, requests);
            return [...accumulator, requestGroup];
          }, []),
          settings: JSON.parse(JSON.stringify(InitialSettings))
        };
        return folder;
      }
    });
  };

  importFolderItem = (item: Items, requests: IRequestModel[]): IFolder => {
    return {
      id: uuidv4(),
      name: item.name,
      type: "folder",
      createdTime: formatDate(),
      data: this.getFolderItem(item.item, requests),
      settings: this.importSettings(item.auth)
    };
  };

  importSettings = (auth: Auth | undefined | null): ISettings => {
    let settings: ISettings = {
      auth: this.getAuthDetails(auth),
      preFetch: {
        requests: []
      },
      headers: [{
        key: "User-Agent",
        value: "Fetch Client",
        isChecked: true,
      }, {
        key: "",
        value: "",
        isChecked: false,
      }]
    };

    return settings;
  };

  importCollection = (): { fcCollection: ICollections, fcRequests: IRequestModel[], fcVariable: IVariable } => {
    const variable = this.importVariable(this.collection.variable || [], this.collection.info.name);

    let requests: IRequestModel[] = [];

    let collection: ICollections = {
      id: uuidv4(),
      name: this.collection.info.name,
      createdTime: formatDate(),
      variableId: variable ? variable.id : "",
      data: [],
      settings: this.importSettings(this.collection.auth)
    };

    let data = this.collection.item.reduce((accumulator: (IHistory | IFolder)[], item: Items) => {
      if (Object.prototype.hasOwnProperty.call(item, "request")) {
        return [...accumulator, this.getHistoryItem(item, requests)];
      }

      const requestGroup = this.importFolderItem(item, requests);
      return [...accumulator, requestGroup];
    }, []);

    collection.data = data;

    return {
      fcCollection: collection,
      fcRequests: requests,
      fcVariable: variable
    };
  };
};


export const postmanImporter = (rawData: string): { fcCollection: ICollections, fcRequests: IRequestModel[], fcVariable: IVariable } | null => {
  try {
    const collection = JSON.parse(rawData) as PostmanSchema_2_1;
    if (collection.info.schema === POSTMAN_SCHEMA_V2_1) {
      return new PostmanImport(collection).importCollection();
    }
  } catch (err) {
    writeLog("error::postmanImporter(): - Error Message : " + err);
    return null;
  }

  return null;
};