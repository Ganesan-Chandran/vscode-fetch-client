/* eslint-disable eqeqeq */
import { replaceDataWithVariable, replaceValueWithVariable } from "../../../../utils/helper";
import { ITableData } from "../../Common/Table/types";
import { ISetVar, ITest } from "../../RequestUI/redux/types";
import { IReponseModel, ITestResult } from "../../ResponseUI/redux/types";
import { IVariable } from "../../SideBar/redux/types";
import { ParametersModelMapping } from "./consts";

export function setVariable(variable: IVariable, setVar: ISetVar[], responseValue: IReponseModel): IVariable {
  let actualValue: any;
  let index = -1;

  if (setVar.length > 0) {
    setVar.forEach(item => {
      index = -1;
      actualValue = null;
      if (item.parameter === "Header") {
        actualValue = findHeader(responseValue.headers, item.key);
        if (actualValue) {
          index = variable.data.findIndex(d => d.key === item.variableName);
          if (index === -1) {
            variable.data.push({
              isChecked: true,
              key: item.variableName,
              value: actualValue
            });
          } else {
            variable.data[index] = {
              isChecked: true,
              key: item.variableName,
              value: actualValue
            };
          }
        }
      } else if (item.parameter === "Cookie") {
        actualValue = findCookie(responseValue.cookies, item.key);
        if (actualValue) {
          index = variable.data.findIndex(d => d.key === item.variableName);
          if (index === -1) {
            variable.data.push({
              isChecked: true,
              key: item.variableName,
              value: actualValue
            });
          } else {
            variable.data[index] = {
              isChecked: true,
              key: item.variableName,
              value: actualValue
            };
          }
        }
      } else {
        let mapping = ParametersModelMapping[item.parameter];
        if (mapping) {
          mapping = mapping.replace("[specific]", item.key);
          let responseData;
          try {
            responseData = JSON.parse(responseValue.response.responseData);
          } catch {
            responseData = "";
          }
          actualValue = findValueInResponse(responseData, mapping.replace("responseData.", ""));
        }
        if (actualValue) {
          index = variable.data.findIndex(d => d.key === item.variableName);
          if (index === -1) {
            variable.data.push({
              isChecked: true,
              key: item.variableName,
              value: actualValue
            });
          } else {
            variable.data[index] = {
              isChecked: true,
              key: item.variableName,
              value: actualValue
            };
          }
        }
      }
    });
  }

  return variable;
}

export function executeTests(testData: ITest[], responseValue: IReponseModel, variableData: ITableData[]): ITestResult[] {
  let actualValue: any;
  let testResults: ITestResult[] = [];
  let varData = {};
  let tests: ITest[];

  if (variableData.length > 0) {
    variableData.forEach(item => {
      varData[item.key] = item.value;
    });
    let copy = JSON.parse(JSON.stringify(testData));
    tests = replaceTestWithVariable(copy, varData);
  } else {
    tests = testData;
  }

  for (let i = 0; i < tests.length; i++) {

    if (tests[i].parameter === "") {
      continue;
    }

    let mapping = ParametersModelMapping[tests[i].parameter];
    if (mapping === "") {
      continue;
    }

    if (mapping.includes("[specific]")) {
      mapping = mapping.replace("[specific]", tests[i].customParameter);
    }

    if (mapping.includes("response.")) {
      actualValue = findValueInResponse(responseValue, mapping);
    } else if (mapping.includes("responseData.")) {
      let responseData;
      try {
        responseData = JSON.parse(responseValue.response.responseData);
      } catch {
        responseData = "";
      }
      actualValue = findValueInResponse(responseData, mapping.replace("responseData.", ""));
    } else {
      actualValue = findHeader(responseValue.headers, mapping.replace("headers.", ""));
    }

    if (tests[i].action === "length") {
      actualValue = actualValue ? actualValue.length : 0;
    }

    if (tests[i].action === "type") {
      if (Array.isArray(actualValue) || Object.prototype.toString.call(actualValue) === '[object Array]') {
        actualValue = "array";
      } else {
        actualValue = actualValue ? typeof (actualValue) : undefined;
      }
    }

    let testResult: ITestResult = {
      test: tests[i].parameter + (tests[i].customParameter ? " (" + tests[i].customParameter + ")" : "") + " " + getLinkedWord(tests[i].action) + tests[i].expectedValue,
      actualValue: actualValue === undefined ? "undefined" : (actualValue === null ? "null" : actualValue),
      result: executeTestCase(tests[i].action, actualValue, tests[i].expectedValue === "null" ? null : tests[i].expectedValue)
    };

    testResults.push(testResult);
  }

  return testResults;
}

function getLinkedWord(action: string) {
  if (action === "type" || action === "length") {
    return action + " is ";
  }
  if (action === "contains") {
    return "contains ";
  }

  return action + " to ";
}

function executeTestCase(action: string, actualValue: string | number | undefined | null, expectedValue: string | number | undefined | null): boolean {
  switch (action) {
    case "equal":
      return actualValue == expectedValue;
    case "notEqual":
      return actualValue != expectedValue;
    case "contains":
      return (actualValue.toString()).includes(expectedValue.toString());
    case "<":
      return actualValue < expectedValue;
    case "<=":
      return actualValue <= expectedValue;
    case ">":
      return actualValue > expectedValue;
    case ">=":
      return actualValue >= expectedValue;
    case "length":
      return actualValue == expectedValue;
    case "type":
      return actualValue == (expectedValue.toString().trim().toLocaleLowerCase() === "undefined" ? undefined : expectedValue);
  }

  return false;
}


function findHeader(headers: ITableData[], headerValue: string): string {
  try {
    let selectedHeader = headers.find(header => header.key.trim().toUpperCase() === headerValue.trim().toUpperCase());
    return selectedHeader ? selectedHeader.value : "";
  }
  catch {
    return "";
  }
}

function findCookie(cookies: ITableData[], cookieValue: string): string {
  try {
    let selectedCookie = cookies.find(header => header.key.trim().toUpperCase() === cookieValue.trim().toUpperCase());
    return selectedCookie ? selectedCookie.value : "";
  }
  catch {
    return "";
  }
}

function findValueInResponse(responseValue: any, path: string) {
  try {
    path = path.replace(/\[(\w+)\]/g, '.$1');
    path = path.replace(/^\./, '');
    var a = path.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
      var k = a[i];
      responseValue = responseValue[k] ? responseValue[k] : (responseValue[k.toLowerCase()] ? responseValue[k.toLowerCase()] : (responseValue[k.toUpperCase()] ? responseValue[k.toUpperCase()] : ""));
      if (!responseValue) {
        return "";
      }
    }
    return responseValue;
  } catch {
    return "";
  }
}

export function replaceTestWithVariable(tests: ITest[], varData: any): ITest[] {
  tests.forEach(test => {
    test.customParameter = replaceDataWithVariable(test.customParameter, varData);
    test.expectedValue = replaceDataWithVariable(test.expectedValue, varData);
  });

  return tests;
}