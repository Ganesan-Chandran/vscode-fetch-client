import { getErrorResponse, getFileType, getRandomNumber, isFileType, replaceAuthSettingsInRequest, replaceValueWithVariable } from "./helper";
import { getProtocolConfiguration, getSSLConfiguration } from "./vscodeConfig";
import { IRequestModel } from "../fetch-client-ui/components/RequestUI/redux/types";
import { ISettings } from "../fetch-client-ui/components/SideBar/redux/types";
import { ITableData } from "../fetch-client-ui/components/Common/Table/types";
import { logDetails } from "./logger/requestLog";
import { responseTypes } from "./configuration";
import { sign, Request as awsRequest } from 'aws4';
import { writeLog } from "./logger/logger";
import * as https from "https";
import axios, { CancelTokenSource } from "axios";
import FormData from 'form-data';
import fs from "fs";

export interface FetchConfig {
  timeOut: number,
  headersCase: boolean,
  runMainRequest?: boolean,
  source?: CancelTokenSource
}

export const updateAuthSettings = (requestData: IRequestModel, settings?: ISettings): IRequestModel => {
  if (settings && requestData.auth.authType === "inherit") {
    let copyData = JSON.parse(JSON.stringify(requestData));
    return replaceAuthSettingsInRequest(copyData, settings);
  }
  return requestData;
};

export const updateVariables = (requestData: IRequestModel, variableData?: ITableData[]): IRequestModel => {
  let varData = {};
  if (variableData?.length > 0) {
    variableData.forEach(item => {
      varData[item.key] = item.value;
    });
    let copy = JSON.parse(JSON.stringify(requestData));
    return replaceValueWithVariable(copy, varData);
  }

  return requestData;
};

export const apiFetch = async (
  requestData: IRequestModel,
  variableData: ITableData[],
  settings: ISettings,
  fetchConfig: FetchConfig,
  resType: string = responseTypes.apiResponse
) => {

  const reqHeaders = {};
  let startTime: number, fetchDuration: number;
  let reqData: any = "";
  let apiResponse: any;

  let request = updateAuthSettings(requestData, settings);
  request = updateVariables(request, variableData);

  try {
    if (request.auth.authType === "bearertoken") {
      reqHeaders[fetchConfig.headersCase ? "Authorization" : "authorization"] = `${request.auth.tokenPrefix} ${request.auth.password}`;
    }

    if (request.auth.authType === "oauth2") {
      reqHeaders[fetchConfig.headersCase ? "Authorization" : "authorization"] = `${request.auth.tokenPrefix} ${request.auth.password}`;
    }

    request.headers.forEach(({ isChecked, key, value }) => {
      if (isChecked && key) {
        reqHeaders[fetchConfig.headersCase ? key : key.toLocaleLowerCase()] = value;
      }
    });

    if (request.body.bodyType === "formdata") {
      const bodyFormData = new FormData();
      request.body.formdata.forEach(({ isChecked, key, value, type }) => {
        if (isChecked && key) {
          if (type === "File") {
            if (!fs.existsSync(value)) {
              throw new Error("Error : ENOENT: No such file or directory - " + value);
            }
            bodyFormData.append(key, fs.createReadStream(value));
          } else {
            bodyFormData.append(key, value);
          }
        }
      });
      reqData = bodyFormData;
    } else if (request.body.bodyType === "formurlencoded") {
      const bodyUrlEncoded = new URLSearchParams();
      request.body.urlencoded.forEach(({ isChecked, key, value }) => {
        if (isChecked && key) {
          bodyUrlEncoded.append(key, value);
        }
      });
      reqData = bodyUrlEncoded;
    } else if (request.body.bodyType === "raw") {
      reqData = request.body.raw.data;
    } else if (request.body.bodyType === "binary") {
      if (!request.body.binary.data) {
        throw new Error("Error : ENOENT: No such file or directory - " + request.body.binary.fileName);
      }
      reqData = request.body.binary.data;
    } else if (request.body.bodyType === "graphql") {
      reqData = JSON.stringify({
        query: request.body.graphql.query,
        variables: request.body.graphql.variables,
      });
    }

    if (request.body.bodyType === "formdata") {
      let header = reqData.getHeaders();
      reqHeaders[fetchConfig.headersCase ? "Content-Type" : "content-type"] = header["content-type"] ? header["content-type"] : getContentType(request.body.bodyType, "");
    } else {
      if (request.body.bodyType !== "none" && !reqHeaders["Content-Type"] && !reqHeaders["content-type"]) {
        reqHeaders[fetchConfig.headersCase ? "Content-Type" : "content-type"] = getContentType(request.body.bodyType, request.body.bodyType === "raw" ? request.body.raw.lang : "");
      }
    }    

    https.globalAgent.options.rejectUnauthorized = getSSLConfiguration();

    axios.interceptors.request.use((config) => {
      startTime = new Date().getTime();
      return config;
    });

    axios.interceptors.response.use((config) => {
      fetchDuration = new Date().getTime() - startTime;
      return config;
    });

    axios.defaults.withCredentials = true;

    let requestconfig: any;
    let url = validateURL(request.url) ? request.url : getProtocolConfiguration() + "://" + request.url;
    request.url = url;

    if (request.auth.authType === "aws") {
      const baseRequest: awsRequest = {
        host: getHost(url),
        method: request.method.toUpperCase(),
        path: getPath(url),
        headers: reqHeaders
      };

      if (request.auth.aws.service) {
        baseRequest.service = request.auth.aws.service;
      }

      if (request.auth.aws.region) {
        baseRequest.region = request.auth.aws.region;
      }

      if (reqData) {
        if (request.body.bodyType === "formdata") {
          baseRequest.body = reqData.getBuffer();
        } else if (request.body.bodyType === "formurlencoded") {
          baseRequest.body = JSON.stringify(reqData.toString());
        } else {
          baseRequest.body = JSON.stringify(reqData);
        }
      }

      const signedRequest = sign(baseRequest,
        {
          secretAccessKey: request.auth.aws.secretAccessKey,
          accessKeyId: request.auth.aws.accessKey,
          sessionToken: request.auth.aws.sessionToken
        });

      if (signedRequest.headers) {
        delete signedRequest.headers.Host;
        delete signedRequest.headers['Content-Length'];
      }

      requestconfig = {
        ...signedRequest,
        url: url,
        data: reqData,
        validateStatus: () => true,
        transformResponse: [function (data) { return data; }],
        timeout: fetchConfig.timeOut,
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      };

    } else {
      requestconfig = {
        url: url,
        method: request.method,
        headers: reqHeaders,
        auth: request.auth.authType === "basic" ? { username: request.auth.userName, password: request.auth.password } : undefined,
        data: reqData,
        validateStatus: () => true,
        transformResponse: [function (data) { return data; }],
        timeout: fetchConfig.timeOut,
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      };
    }

    if (fetchConfig.source) {
      requestconfig.cancelToken = fetchConfig.source.token;
    }

    const resp = await axios(requestconfig);
    const respHeaders: ITableData[] = [];
    const resCookies: ITableData[] = [];
    let responseData: any;
    let cookieData: any;
    Object.entries(resp.headers).forEach(([key, value]) => {
      if (key.trim().toLowerCase() === "set-cookie") {
        cookieData = value;
      }
      respHeaders.push({
        isFixed: true,
        key: key,
        value: value.toString()
      });
    });

    let isFile = isFileType(respHeaders);

    if (!isFile) {
      responseData = new Uint8Array(resp.data).reduce(function (data, byte) {
        return data + String.fromCharCode(byte);
      }, '');
    }

    if (cookieData) {
      if (typeof cookieData === 'string') {
        if (cookieData.includes(";")) {
          Object.entries(cookieData.split(";")).forEach(([_key, value]) => {
            let data = value.toString().trim();
            resCookies.push({
              isFixed: true,
              isChecked: true,
              key: data.substring(0, data.indexOf("=")),
              value: data.substring(data.indexOf("=") + 1, data.length)
            });
          });
        }
      } else {
        Object.entries(cookieData).forEach(([_key, value]) => {
          let data = value.toString().trim();
          resCookies.push({
            isFixed: true,
            isChecked: true,
            key: data.substring(0, data.indexOf("=")),
            value: data.substring(data.indexOf("=") + 1, data.length)
          });
        });
      }
    }

    setTimeout(() => {
      logDetails(request, reqHeaders, reqData, resp.status, respHeaders, isFile ? "View Response is not supported for 'file' type in the log window." : responseData);
    }, 1000);

    return apiResponse = {
      type: resType,
      response: {
        responseData: isFile ? resp.data : responseData,
        status: resp.status,
        statusText: resp.statusText,
        size: resp.data.byteLength,
        duration: fetchDuration,
        isError: false,
        responseType: {
          isBinaryFile: isFile,
          format: getFileType(respHeaders)
        }
      },
      headers: respHeaders,
      cookies: resCookies && resCookies.length > 0 ? resCookies : [],
    };
  }
  catch (err) {
    writeLog("error::apiFetch(): " + err);

    apiResponse = getErrorResponse();

    setTimeout(() => {
      logDetails(request, reqHeaders, reqData, apiResponse.response.status, apiResponse.headers, err.message);
    }, 1000);

    if (axios.isCancel(err)) {
      apiResponse.response.responseData = err.message;
    } else {
      apiResponse.response.responseData = err.message;
    }

    return apiResponse;
  }
};

function getRawContentType(rawType: string): string {
  let contentTypes = {
    json: "application/json",
    html: "text/html",
    xml: "text/xml",
    text: "text/plain"
  };
  return contentTypes[rawType];
}

function getContentType(type: string, rawLang: string) {
  switch (type) {
    case "formdata":
      return "multipart/form-data; boundary=" + generateBoundryValue();
    case "formurlencoded":
      return "application/x-www-form-urlencoded";
    case "raw":
      return getRawContentType(rawLang);
    case "graphql":
      return "application/json";
    default: //binary
      return "application/octet-stream";
  }
}

function generateBoundryValue() {
  return "--------------------------" + getRandomNumber(25);
}

function validateURL(url: string): boolean {
  if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
    return true;
  }

  return false;
}

function getHost(urlString: string) {
  const url = new URL(urlString);
  return url.host;
}

function getPath(urlString: string) {
  const url = new URL(urlString);
  return url.pathname;
}
