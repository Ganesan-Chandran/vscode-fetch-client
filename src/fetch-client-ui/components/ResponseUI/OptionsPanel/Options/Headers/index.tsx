import React from 'react';
import { useSelector } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { ResponseTable } from '../../../../Common/Table/ResponseTable';
import "./style.css";

export const ResponseHeaders = () => {

  const { headers } = useSelector((state: IRootState) => state.responseData);

  return (
    <>
      {
        headers.length > 0 ?
          <ResponseTable
            data={headers}
            readOnly={true}
            type="resHeaders"
            headers={{ key: "Header", value: "Value" }}
          />
          :
          <>
            <hr />
            <div className="auth-header-label"><label>{"No Headers Available."}</label></div>
          </>
      }
    </>
  );
};