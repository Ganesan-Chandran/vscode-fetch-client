import React from "react";
import { useSelector } from "react-redux";
import { IRootState } from "../../../reducer/combineReducer";
import { ITestResult } from "../../ResponseUI/redux/types";
import "./style.css";

export const TestResult = () => {

  const { response, testResults } = useSelector((state: IRootState) => state.responseData);

  const tableRow = (row: ITestResult, index: number) => {
    if (row.test === "") {
      return;
    }
    return (
      <tr key={index}>
        <td className="test-result-test-case-col">
          <div id={"test_res_" + index.toString()} className="res-table-input">
            {row.test}
          </div>
        </td>
        <td className="test-result-actual-val-col">
          <div id={"test_res_" + index.toString()} className="res-table-input">
            {row.actualValue}
          </div>
        </td>
        <td align="center" className="top-align">
          <label className={row.result ? "test-result-label pass" : "test-result-label fail"}>{row.result ? "Pass" : "Fail"}</label>
        </td>
      </tr>
    );
  };

  const makeTable = (data: ITestResult[]) => {
    return (
      data.map((item: ITestResult, index: number) => {
        return tableRow(item, index);
      })
    );
  };

  return (
    <>
      {
        testResults.length > 0 && response.status !== 0
          ?
          <table className="test-result-table">
            <thead>
              <tr>
                <th className="test-result-col">Test</th>
                <th className="test-result-col">Actual Value</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {makeTable(testResults)}
            </tbody>
          </table>
          :
          <>
            <hr />
            <div className="auth-header-label"><label>{"No Test Results Available."}</label></div>
          </>
      }
    </>
  );
};