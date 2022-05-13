/* eslint-disable eqeqeq */
import { replaceDataWithVariable, replaceValueWithVariable } from "../../../../utils/helper";
import { ITableData } from "../../Common/Table/types";
import { ITest } from "../../RequestUI/redux/types";
import { IReponseModel, ITestResult } from "../../ResponseUI/redux/types";
import { ParametersModelMapping } from "./consts";

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
      actualValue = findValueInResponse(JSON.parse(responseValue.response.responseData), mapping.replace("responseData.", ""));
    } else {
      actualValue = findHeader(responseValue.headers, mapping.replace("headers.", ""));
    }

    let testResult: ITestResult = {
      test: tests[i].parameter + (tests[i].customParameter ? " (" + tests[i].customParameter + ")" : "") + " " + tests[i].action + " to " + tests[i].expectedValue,
      actualValue: actualValue,
      result: executeTestCase(tests[i].action, actualValue, tests[i].expectedValue)
    };

    testResults.push(testResult);
  }

  return testResults;
}

function executeTestCase(action: string, actualValue: string | number, expectedValue: string | number): boolean {

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
  }

  return false;
}


function findHeader(headers: ITableData[], headerValue: string): string {
  try {
    let selectedHeader = headers.find(header => (header.key === headerValue || header.key === headerValue.toLowerCase() || header.key === headerValue.toUpperCase()));
    return selectedHeader ? selectedHeader.value : "";
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