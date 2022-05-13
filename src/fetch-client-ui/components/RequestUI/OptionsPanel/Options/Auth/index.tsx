import React from 'react';
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { ITableData } from "../../../../Common/Table/types";
import { Actions } from "../../../redux";
import { InitialAuth } from '../../../redux/reducer';
import { apiKeyAddTo, authTypes } from "./consts";
import "./style.css";

export const AuthPanel = () => {

  const dispatch = useDispatch();

  const { auth, params, headers } = useSelector((state: IRootState) => state.requestData);


  const setAuthValue = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    let localAuth = { ...auth };

    localAuth = InitialAuth;
    localAuth.authType = evt.target.value;

    let localTable = [...params];
    let basicAuthData = localTable.find(isAvailable);
    if (basicAuthData) {
      removeParams();
    } else {
      localTable = [...headers];
      basicAuthData = localTable.find(isAvailable);
      if (basicAuthData) {
        removeHeaders();
      }
    }

    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  const setBearerToken = (evt: React.ChangeEvent<HTMLTextAreaElement>) => {
    let localAuth = { ...auth };
    localAuth.userName = "";
    localAuth.password = evt.target.value;
    if (!auth.tokenPrefix) {
      localAuth.tokenPrefix = "Bearer";
    }
    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  const setTokenPrefix = (evt: React.ChangeEvent<HTMLInputElement>) => {
    let localAuth = { ...auth };
    localAuth.tokenPrefix = evt.target.value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  const setBasicAuthUserName = (evt: React.ChangeEvent<HTMLInputElement>) => {
    let localAuth = { ...auth };
    localAuth.userName = evt.target.value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
    if (auth.authType === "apikey") {
      setQueryParam(evt.target.value);
    }
  };

  const setBasicAuthPassword = (evt: React.ChangeEvent<HTMLInputElement>) => {
    let localAuth = { ...auth };
    localAuth.password = evt.target.value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
    if (auth.authType === "apikey") {
      setQueryParam(evt.target.value, true);
    }
  };

  const setQueryParam = (value: string, isPwd: boolean = false) => {
    let localTable = [...params];
    let basicAuthData = localTable.find(isAvailable);
    if (basicAuthData) {
      if (isPwd) {
        basicAuthData.value = value;
      } else {
        basicAuthData.key = value;
      }
    } else {
      localTable.unshift({
        isChecked: true,
        key: !isPwd ? value : "",
        value: isPwd ? value : "",
        isFixed: true
      });
    }

    dispatch(Actions.SetRequestParamsAction(localTable));
  };

  function isAvailable(item: ITableData) {
    return item.isFixed === true;
  }

  const setAPIKeyAddTo = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    let localAuth = { ...auth };
    localAuth.addTo = evt.target.value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
    modifyQueryParam(evt.target.value);
  };

  const modifyQueryParam = (section: string) => {
    if (section === "queryparams") {
      let localParams = [...params];

      localParams.unshift({
        isChecked: true,
        key: auth.userName,
        value: auth.password,
        isFixed: true
      });

      dispatch(Actions.SetRequestParamsAction(localParams));
      removeHeaders();

    } else {
      let localHeaders = [...headers];

      localHeaders.unshift({
        isChecked: true,
        key: auth.userName,
        value: auth.password,
        isFixed: true
      });

      dispatch(Actions.SetRequestHeadersAction(localHeaders));
      removeParams();
    }
  };

  function removeParams() {
    let localParams = [...params];
    localParams.shift();
    dispatch(Actions.SetRequestParamsAction(localParams));
  }

  function removeHeaders() {
    let localHeaders = [...headers];
    localHeaders.shift();
    dispatch(Actions.SetRequestHeadersAction(localHeaders));
  }

  const onSelectChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    let localAuth = { ...auth };
    if (evt.currentTarget.checked === true) {
      localAuth.showPwd = true;
    } else {
      localAuth.showPwd = false;
    }

    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  const bearerToken = () => {
    return (
      <div className="auth-token-text-panel">
        <label className="auth-token-label">Token</label>
        <textarea
          className="auth-token-text auth-text"
          id={"bearer_token"}
          value={auth.password}
          onChange={setBearerToken}
        >
        </textarea>
        <label className="auth-token-label">Prefix</label>
        <input
          className="auth-token-prefix-text auth-text"
          id={"bearer_token"}
          value={auth.tokenPrefix ? auth.tokenPrefix : "Bearer"}
          maxLength={50}
          onChange={setTokenPrefix}
        />
      </div>
    );
  };

  const basicAuth = () => {
    return (
      <div>
        <div className="basic-auth-text-panel">
          <label className="basic-auth-label">User Name</label>
          <input
            className="basic-auth-username auth-text"
            id={"basic_user_name"}
            value={auth.userName}
            maxLength={500}
            onChange={setBasicAuthUserName}
          />
        </div>
        <div className="basic-auth-text-panel">
          <label className="basic-auth-label">Password</label>
          <input
            className="basic-auth-password auth-text"
            id={"basic_password"}
            value={auth.password}
            type={auth.showPwd ? "text" : "password"}
            maxLength={500}
            onChange={setBasicAuthPassword}
          />
        </div>
        <div className="basic-auth-check">
          <input type="checkbox"
            className="basic-auth-check-box"
            checked={auth.showPwd}
            onChange={onSelectChange}
          />
          Show Password
        </div>
      </div>
    );
  };

  const apiKeyAuth = () => {
    return (
      <div>
        <div className="basic-auth-text-panel">
          <label className="basic-auth-label">Key</label>
          <input
            className="basic-auth-username auth-text"
            id={"basic_user_name"}
            value={auth.userName}
            maxLength={500}
            onChange={setBasicAuthUserName}
          />
        </div>
        <div className="basic-auth-text-panel">
          <label className="basic-auth-label">Value</label>
          <input
            className="basic-auth-password auth-text"
            id={"basic_password"}
            value={auth.password}
            maxLength={500}
            onChange={setBasicAuthPassword}
          />
        </div>
        <div className="basic-auth-text-panel">
          <label className="basic-auth-label">Add to</label>
          <select
            className="apikey-add-select"
            value={auth.addTo}
            onChange={setAPIKeyAddTo}
          >
            {apiKeyAddTo.map(({ value, name }) => (
              <option value={value} key={value}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  const authValuePanel = (type: string) => {
    switch (type) {
      case "bearertoken":
        return bearerToken();
      case "basic":
        return basicAuth();
      case "apikey":
        return apiKeyAuth();
      default:
        return (<div className="auth-no-label"><label>{"This request does not use any authorization."}</label></div>);
    }
  };

  return (
    <div className="auth-panel">
      <div className="auth-type-panel">
        <label className="auth-type-label">Authorization Type</label>
        <select
          className="auth-type-select"
          value={auth.authType}
          onChange={setAuthValue}
        >
          {authTypes.map(({ value, name }) => (
            <option value={value} key={value}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <hr />
      <div>
        {authValuePanel(auth.authType)}
      </div>
    </div>
  );
};