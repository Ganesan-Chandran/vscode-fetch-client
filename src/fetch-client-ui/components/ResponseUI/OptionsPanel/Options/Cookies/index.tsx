import React from 'react';
import { useSelector } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { Table } from "../../../../Common/Table/Table";

export const ResponseCookies = () => {
  const { cookies } = useSelector((state: IRootState) => state.responseData);

  return (
    <>
      {
        cookies.length > 0 ?
          <Table
            data={cookies}
            readOnly={true}
          />
          :
          <>
            <hr />
            <div className="auth-header-label"><label>{"No Cookies Available."}</label></div>
          </>
      }
    </>
  );
};