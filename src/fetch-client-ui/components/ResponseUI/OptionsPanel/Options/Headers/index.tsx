import React from 'react';
import { useSelector } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { Table } from "../../../../Common/Table/Table";
import "./style.css";

export const ResponseHeaders = () => {

  const { headers } = useSelector((state: IRootState) => state.responseData);

  return (
    <>
      {
        headers.length > 0 ?
          <Table
            data={headers}
            readOnly={true}
            type="resHeaders"
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