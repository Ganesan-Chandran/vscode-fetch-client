import React from 'react';
import { useSelector } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { ResponseTable } from '../../../../Common/Table/ResponseTable';

export const ResponseCookies = () => {
  const { cookies } = useSelector((state: IRootState) => state.responseData);

  return (
    <>
      {
        cookies.length > 0 ?
          <ResponseTable
            data={cookies}
            readOnly={true}
            type="resCookies"
            headers={{ key: "Name", value: "Value", value1: "Details" }}
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