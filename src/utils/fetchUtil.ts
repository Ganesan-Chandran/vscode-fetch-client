import axios, { AxiosRequestConfig, CancelTokenSource } from "axios";
import * as https from "https";
import { ITableData } from "../fetch-client-ui/components/Common/Table/types";
import { IRequestModel } from "../fetch-client-ui/components/RequestUI/redux/types";
import { responseTypes } from "./configuration";
import { getProtocolConfiguration, getSSLConfiguration } from "./vscodeConfig";
import { getFileType, isFileType, replaceValueWithVariable } from "./helper";

export const apiFetch = async (requestData: IRequestModel, timeOut: number, source?: CancelTokenSource, variableData?: ITableData[]) => {

  const reqHeaders = {};
  let startTime: number, fetchDuration: number;
  let reqData: any = "";

  let varData = {};
  let request: IRequestModel;

  if (variableData?.length > 0) {
    variableData.forEach(item => {
      varData[item.key] = item.value;
    });
    let copy = JSON.parse(JSON.stringify(requestData));
    request = replaceValueWithVariable(copy, varData);
  } else {
    request = requestData;
  }

  if (request.auth.authType === "bearertoken") {
    reqHeaders["Authorization"] = `${request.auth.tokenPrefix} ${request.auth.password}`;
  }

  request.headers.forEach(({ isChecked, key, value }) => {
    if (isChecked) {
      reqHeaders[key] = value;
    }
  });

  if (request.body.bodyType === "formdata") {
    const bodyFormData = new FormData();
    request.body.formdata.forEach(({ isChecked, key, value }) => {
      if (isChecked) {
        bodyFormData.append(key, value);
      }
    });
    reqData = bodyFormData;
  } else if (request.body.bodyType === "formurlencoded") {
    const bodyUrlEncoded = new URLSearchParams();
    request.body.urlencoded.forEach(({ isChecked, key, value }) => {
      if (isChecked) {
        bodyUrlEncoded.append(key, value);
      }
    });
    reqData = bodyUrlEncoded;
  } else if (request.body.bodyType === "raw") {
    reqData = request.body.raw.data;
  } else if (request.body.bodyType === "binary") {
    reqData = request.body.binary.data;
  } else if (request.body.bodyType === "graphql") {
    reqData = JSON.stringify({
      query: request.body.graphql.query,
      variables: request.body.graphql.variables,
    });
  }

  if (!reqHeaders["Content-Type"]) {
    if (request.body.bodyType !== "none") {
      reqHeaders["Content-Type"] = getContentType(request.body.bodyType, request.body.bodyType === "raw" ? request.body.raw.lang : "");
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

  let requestconfig: AxiosRequestConfig = {
    url: validateURL(request.url) ? request.url : getProtocolConfiguration() + "://" + request.url,
    method: request.method,
    headers: reqHeaders,
    auth: request.auth.authType === "basic" ? { username: request.auth.userName, password: request.auth.password } : undefined,
    data: reqData,
    validateStatus: () => true,
    transformResponse: [function (data) { return data; }],
    timeout: timeOut,
    responseType: 'arraybuffer',
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  };

  if (source) {
    requestconfig.cancelToken = source.token;
  }

  let apiResponse: any;

  try {    
    const resp = await axios(requestconfig);    
    const respHeaders: ITableData[] = [];
    let responseData: any;
    Object.entries(resp.headers).forEach(([key, value]) => {
      respHeaders.push({
        isFixed: true,
        key: key,
        value: value.toString()
      });
    });

    let isFile = isFileType(respHeaders);

    if (!isFile) {
      responseData = String.fromCharCode.apply(null, Array.from(new Uint16Array(resp.data)));
    }

    return apiResponse = {
      type: responseTypes.apiResponse,
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
      cookies: []
    };
  }
  catch (err) {
    apiResponse = {
      type: responseTypes.apiResponse,
      response: {
        responseData: "",
        status: 0,
        statusText: "",
        size: "0",
        duration: 0,
        isError: true,
        responseType: {
          isBinaryFile: false,
          format: ""
        }
      },
      headers: [],
      cookies: []
    };

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
      return "multipart/form-data";
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

function validateURL(url: string): boolean {
  if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
    return true;
  }

  return false;
}

