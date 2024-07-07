import parser from "yargs-parser";
import { v4 as uuidv4 } from 'uuid';
import { XMLValidator } from "fast-xml-parser";
import { IRequestModel } from "../fetch-client-ui/components/RequestUI/redux/types";
import { MIMETypes } from "./helper";
import { ITableData } from "../fetch-client-ui/components/Common/Table/types";
import { InitialAuth, InitialBody, InitialPreFetch, InitialSetVar, InitialTest } from "../fetch-client-ui/components/RequestUI/redux/reducer";
import { writeLog } from "./logger/logger";

export const ConvertCurlToRequest = (curlRequest: string): IRequestModel | null => {

  try {
    if (!curlRequest.trim()) {
      return null;
    }

    curlRequest = curlRequest.trim();

    if (!curlRequest.toLowerCase().startsWith("curl ")) {
      return null;
    }

    curlRequest = curlRequest.replace(/^\s+|\s+$/gm, "");
    curlRequest = curlRequest.replace(/(\r\n|\n|\r)/gm, " ");

    const argvs = parser(curlRequest);

    const request: IRequestModel = {
      id: uuidv4(),
      url: "",
      name: "",
      createdTime: "",
      method: "get",
      params: [],
      auth: InitialAuth,
      headers: [],
      body: JSON.parse(JSON.stringify(InitialBody)),
      tests: JSON.parse(JSON.stringify(InitialTest)),
      setvar: JSON.parse(JSON.stringify(InitialSetVar)),
      notes: "",
      preFetch: JSON.parse(JSON.stringify(InitialPreFetch))
    };

    const isJson = (str: string) => {
      try {
        JSON.parse(str);
      } catch (e) {
        return false;
      }
      return true;
    };

    const removeQuotes = (str: string) => str.trim().replace(/[""]+/g, "").replace(/['']+/g, "");

    const stringIsUrl = (url: string) => {
      return /(?:^|[ \t])((https?:\/\/)?(?:localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(\/\S*)?)/.test(url);
    };

    const parseField = (str: string): string[] => {
      return str.split(/: (.+)/);
    };

    const parseHeader = (header: any) => {
      if (Array.isArray(header)) {
        header.forEach((item) => {
          addHeader(item);
        });
      } else {
        addHeader(header);
      }
    };

    function addHeader(item: any) {
      const field = parseField(item);
      if (!checkAuthHeader(field)) {
        request.headers.push({
          isChecked: true,
          key: field[0],
          value: field[1]
        });
      }
    }

    function checkAuthHeader(field: string[]): boolean {
      if (field[0].toLowerCase() === "authorization" && field[1].toLowerCase().includes("bearer ")) {
        request.auth.authType = "bearertoken";
        request.auth.password = field[1].replace("Bearer ", "").replace("bearer ", "");
        request.auth.tokenPrefix = "Bearer";
        return true;
      }

      return false;
    }

    const parseData = (data: any) => {

      const contentTypeHeader = request.headers.find(item => item.key.toLowerCase() === "content-type")?.value;

      if (contentTypeHeader?.includes("application/x-www-form-urlencoded")) {
        request.body.urlencoded = parseDataUrlEncode(data);
        request.body.bodyType = "formurlencoded";
      } else if (contentTypeHeader?.includes("application/json")) {
        request.body.bodyType = "raw";
        if (isJson(data)) {
          request.body.raw.data = JSON.parse(data);
          request.body.raw.lang = "json";
        }
      } else if (contentTypeHeader?.includes("application/xml") || contentTypeHeader?.includes("text/xml")) {
        request.body.bodyType = "raw";
        if (XMLValidator.validate(data) === true) {
          request.body.raw.data = data;
          request.body.raw.lang = "xml";
        }
      } else if (contentTypeHeader?.includes("application/html") || contentTypeHeader?.includes("text/html")) {
        request.body.raw.data = data;
        request.body.raw.lang = "html";
        request.body.bodyType = "raw";
      } else if (contentTypeHeader?.includes("text/plain")) {
        request.body.raw.data = data;
        request.body.raw.lang = "text";
        request.body.bodyType = "raw";
      } else if (contentTypeHeader && MIMETypes[contentTypeHeader]) {
        request.body.binary = data;
        request.body.bodyType = "binary";
      } else if (isJson(data)) {
        request.headers.push({
          isChecked: true,
          key: "Content-Type",
          value: "application/json"
        });
        request.body.raw.data = JSON.parse(data);
        request.body.raw.lang = "json";
      } else if (XMLValidator.validate(data)) {
        request.headers.push({
          isChecked: true,
          key: "Content-Type",
          value: "text/xml"
        });
        request.body.raw.data = data;
        request.body.raw.lang = "xml";
      } else {
        request.body.raw.data = data;
        request.body.raw.lang = "text";
        request.body.bodyType = "raw";
      }
    };

    const parseDataUrlEncode = (data: any): ITableData[] => {
      let jsonUrlEncoded = "";

      const contentTypeHeader = request.headers.find(item => item.key.toLowerCase() === "content-type")?.value;

      if (!contentTypeHeader) {
        request.headers.push({
          isChecked: true,
          key: "Content-Type",
          value: "application/x-www-form-urlencoded"
        });
      }

      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          if (index === 0) {
            jsonUrlEncoded = encodeURI(item);
          } else {
            jsonUrlEncoded = jsonUrlEncoded + "&" + encodeURI(item);
          }
        });
        return generateFormUrlEncode(jsonUrlEncoded);
      } else {
        return generateFormUrlEncode(data);
      }
    };

    const generateFormUrlEncode = (data: string): ITableData[] => {
      const searchParams = new URLSearchParams(data);
      const params: ITableData[] = [];
      for (const p of searchParams) {
        if (p[0] && p[0].trim()) {
          const tableData: ITableData = {
            isChecked: true,
            key: p[0].trim(),
            value: p[1].trim()
          };
          params.push(tableData);
        }
      }

      params.push({ isChecked: false, key: "", value: "" });
      return params;
    };

    const setRequestMethod = (): void => {
      if (request.method === "get" || request.method === "options" || request.method === "head") {
        request.method = "post";
      }
    };

    for (const argv in argvs) {
      switch (argv) {
        case "_":
          {
            const _ = argvs[argv];
            _.forEach((item: any) => {
              item = removeQuotes(item);
              if (stringIsUrl(item)) {
                request.url = item;
              }
            });
          }
          break;

        case "X":
        case "request":
          request.method = argvs[argv].toString().toLowerCase();
          break;

        case "H":
        case "header":
          parseHeader(argvs[argv]);
          break;

        case "u":
        case "user": {
          const loginDetails = argvs[argv].split(":");
          request.auth.authType = "basic";
          request.auth.userName = loginDetails[0];
          request.auth.password = loginDetails[1];
        }
          break;

        case "A":
        case "user-agent":
          request.headers.push({
            isChecked: true,
            key: "user-agent",
            value: argvs[argv]
          });
          break;

        case "I":
        case "head":
          request.method = "head";
          break;

        case "b":
        case "cookie":
          request.headers.push({
            isChecked: true,
            key: "Set-Cookie",
            value: argvs[argv]
          });
          break;

        case "d":
        case "data":
        case "data-raw":
        case "data-ascii":
          parseData(argvs[argv]);
          setRequestMethod();
          break;

        case "data-urlencode":
          request.body.urlencoded = parseDataUrlEncode(argvs[argv]);
          request.body.bodyType = "formurlencoded";
          setRequestMethod();
          break;

        case "data-binary":
          request.body.binary = argvs[argv];
          request.body.bodyType = "binary";
          setRequestMethod();
          break;

        case "compressed": {
          const index = request.headers.findIndex(item => item.key.toLowerCase() === "accept-encoding");
          if (index === -1) {
            request.headers.push({
              isChecked: true,
              key: "Accept-Encoding",
              value: argvs[argv] ? (typeof argvs[argv] === "boolean" ? "gzip, deflate" : argvs[argv]) : "gzip, deflate"
            });
          }
        }
          break;

        default:
          break;
      }
    }

    request.params.push({ isChecked: false, key: "", value: "" });
    request.headers.push({ isChecked: false, key: "", value: "" });

    return request;
  }
  catch (err) {
    writeLog("error::ConvertCurlToRequest(): " + err);
    return null;
  }
};
