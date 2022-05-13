import React from "react";
import HTTPSnippet = require("httpsnippet");
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { IRootState } from "../../../reducer/combineReducer";
import { MonacoEditor } from "../Editor";
import { codeSnippetLangunages } from "./consts";
import "./style.css";
import { IRequestModel } from "../../RequestUI/redux/types";
import { replaceValueWithVariable } from "../../../../utils/helper";

const CodeSnippetGenerator = () => {

  const [language, setLang] = useState("csharp");
  const [option, setOption] = useState("httpclient");
  const [codeSnippet, setCodeSnippet] = useState("");

  const requestData = useSelector((state: IRootState) => state.requestData);
  const { selectedVariable } = useSelector((state: IRootState) => state.variableData);

  function onSelectedLanguage(e: React.ChangeEvent<HTMLSelectElement>) {
    setLang(e.target.value);
    setOption(codeSnippetLangunages.filter(l => l.value === e.target.value)[0].options[0].value);
  }

  function onSelectedOption(e: React.ChangeEvent<HTMLSelectElement>) {
    setOption(e.target.value);
  }

  function getRawContentType(rawType: string): string {
    let contentTypes = {
      json: "application/json",
      html: "text/html",
      xml: "text/xml",
      text: "text/plain",
    };

    return contentTypes[rawType];
  }

  useEffect(() => {
    if (!requestData.url) {
      return;
    }

    let request: IRequestModel;
    let varData = {};

    if (selectedVariable.data.length > 0) {
      selectedVariable.data.forEach(item => {
        varData[item.key] = item.value;
      });
      let copy = JSON.parse(JSON.stringify(requestData));
      request = replaceValueWithVariable(copy, varData);
    } else {
      request = requestData;
    }

    let body: any;
    if (request.body.bodyType === "formdata") {
      body = {
        "mimeType": "multipart/form-data",
        "params": request.body.formdata.map(function (data) { return { "name": data.key, "value": data.value }; }),
      };
    } else if (request.body.bodyType === "formurlencoded") {
      body = {
        "mimeType": "application/x-www-form-urlencoded",
        "params": request.body.urlencoded.map(function (data) { return { "name": data.key, "value": data.value }; }),
      };
    } else if (request.body.bodyType === "raw") {
      body = {
        "mimeType": getRawContentType(request.body.raw.lang),
        "text": request.body.raw.data,
      };
    } else if (request.body.bodyType === "binary") {
      if (request.body.binary.data.length > 0) {
        let contentType = request.headers.find(item => item.key.toUpperCase() === "Content-Type");
        body = {
          "mimeType": contentType ? contentType.key : "application/octet-stream",
          "text": request.body.binary.data
        };
      } else {
        body = {};
      }
    } else if (request.body.bodyType === "graphql") {
      body = {
        "mimeType": "application/json",
        "text": JSON.stringify({
          query: request.body.graphql.query,
          variables: request.body.graphql.variables,
        }),
      };
    } else {
      body = {};
    }

    let headers = [];
    request.headers.forEach((header) => {
      if (header.key) {
        headers.push({ "name": header.key, "value": header.value });
      }
    });

    let value: any;

    try {
      var snippet = new HTTPSnippet({
        method: request.method,
        url: request.url,
        httpVersion: "",
        cookies: [],
        headers: headers,
        queryString: [],
        headersSize: -1,
        bodySize: -1,
        postData: body
      });
      value = snippet.convert(language, option);
    }
    catch (err) {
      value = "";
      console.log("error", err);
    }

    let str = isString(value) ? value as string : "";


    setCodeSnippet(str);

  }, [language, option, requestData]);

  function isString(val: any): boolean {
    if (typeof val === 'string' || val instanceof String) {
      return true;
    }
    else {
      return false;
    }
  }

  return (
    <div className="code-snippet-panel">
      <hr />
      {codeSnippet && <><div className="code-snippet-select-panel">
        <div className="code-snippet-lang-panel">
          <label className="code-snippet-lang-label">Language</label>
          <select
            onChange={onSelectedLanguage}
            value={language}
            className="code-snippet-lang-select"
          >
            {
              codeSnippetLangunages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.name}
                </option>
              ))
            }
          </select>
        </div>
        <div className="code-snippet-opt-panel">
          <label className="code-snippet-opt-label">Options</label>
          <select
            onChange={onSelectedOption}
            value={option}
            className="code-snippet-opt-select"
          >
            {
              language && codeSnippetLangunages.filter(l => l.value === language)[0].options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.name}
                </option>
              ))
            }
          </select>
        </div>
      </div>
        <div className="code-snippet-editor-panel">
          <MonacoEditor
            value={codeSnippet}
            language={language === "node" ? "javascript" : language}
            readOnly={true}
            copyButtonVisible={true}
            format={true}
          />
        </div>
      </>
      }
    </div>
  );
};

export default CodeSnippetGenerator;