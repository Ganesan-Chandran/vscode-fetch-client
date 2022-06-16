import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { ITableData } from "../../../../Common/Table/types";
import { TextEditor } from '../../../../Common/TextEditor/TextEditor';
import { Actions } from "../../../redux";
import { InitialAuth } from '../../../redux/reducer';
import { AwsAuth } from './aws';
import { apiKeyAddTo, authTypes } from "./consts";
import "./style.css";

export interface IAuthProps {
  settingsMode?: boolean;
  authTypes?: { name: string, value: string }[];
}

export const AuthPanel = (props: IAuthProps) => {

  const dispatch = useDispatch();

  const { auth, params, headers } = useSelector((state: IRootState) => state.requestData);
  const { selectedVariable } = useSelector((state: IRootState) => state.variableData);

  const [varColor, setColor] = useState("");
  const [envVar, setEnvVar] = useState(null);

  useEffect(() => {
    if (selectedVariable.id) {
      setEnvVar(selectedVariable.data.map(item => item.key));
    } else {
      setEnvVar([]);
    }
  }, [selectedVariable.data]);

  useEffect(() => {
    if (selectedVariable.id) {
      setEnvVar(selectedVariable.data.map(item => item.key));
    } else {
      setEnvVar([]);
    }

    if (auth.authType === "bearertoken") {
      if (auth.password.length > 4 && auth.password.includes("{{") && auth.password.includes("}}")) {
        var word = auth.password.substring(auth.password.indexOf("{{") + 2, auth.password.lastIndexOf("}}"));
        if (selectedVariable.id) {
          selectedVariable.data.map(item => item.key).includes(word) ? setColor("var-available") : setColor("var-notavailable");
        } else {
          setColor("var-notavailable");
        }
      } else {
        setColor("");
      }
    }
  }, []);

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
    let str = evt.target.value;
    let localAuth = { ...auth };
    localAuth.userName = "";
    localAuth.password = str;
    if (!auth.tokenPrefix) {
      localAuth.tokenPrefix = "Bearer";
    }

    if (str.length > 4 && str.includes("{{") && str.includes("}}")) {
      var word = str.substring(str.indexOf("{{") + 2, str.lastIndexOf("}}"));
      envVar.includes(word) ? setColor("var-available") : setColor("var-notavailable");
    } else {
      setColor("");
    }
    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  const setTokenPrefix = (value: string) => {
    let localAuth = { ...auth };
    localAuth.tokenPrefix = value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  const setBasicAuthUserName = (value: string) => {
    let localAuth = { ...auth };
    localAuth.userName = value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
    if (auth.authType === "apikey") {
      if (localAuth.addTo === "queryparams") {
        setQueryParam(value);
      }
      else {
        setHeaderParam(value);
      }
    }
  };

  const setBasicAuthPassword = (value: string) => {
    let localAuth = { ...auth };
    localAuth.password = value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
    if (auth.authType === "apikey") {
      if (localAuth.addTo === "queryparams") {
        setQueryParam(value, true);
      } else {
        setHeaderParam(value, true);
      }
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
      if (!basicAuthData.value && !basicAuthData.key) {
        localTable.shift();
      }
    } else {
      if (value) {
        localTable.unshift({
          isChecked: true,
          key: !isPwd ? value : "",
          value: isPwd ? value : "",
          isFixed: true
        });
      }
    }

    dispatch(Actions.SetRequestParamsAction(localTable));
  };

  const setHeaderParam = (value: string, isPwd: boolean = false) => {
    let localTable = [...headers];
    let basicAuthData = localTable.find(isAvailable);

    if (basicAuthData) {
      if (isPwd) {
        basicAuthData.value = value;
      } else {
        basicAuthData.key = value;
      }
      if (!basicAuthData.value && !basicAuthData.key) {
        localTable.shift();
      }
    } else {
      if (value) {
        localTable.unshift({
          isChecked: true,
          key: !isPwd ? value : "",
          value: isPwd ? value : "",
          isFixed: true
        });
      }
    }

    dispatch(Actions.SetRequestHeadersAction(localTable));
  };

  function isAvailable(item: ITableData) {
    return item.isFixed === true && item.key !== "Cookie";
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
      let localHeaders = [...headers];
      let basicAuthData = localHeaders.find(isAvailable);

      if (auth.userName && auth.password) {
        localParams.unshift({
          isChecked: true,
          key: auth.userName,
          value: auth.password,
          isFixed: true
        });
      }

      dispatch(Actions.SetRequestParamsAction(localParams));
      if (basicAuthData) {
        removeHeaders();
      }

    } else {
      let localHeaders = [...headers];
      let localParams = [...params];
      let basicAuthData = localParams.find(isAvailable);

      if (auth.userName && auth.password) {
        localHeaders.unshift({
          isChecked: true,
          key: auth.userName,
          value: auth.password,
          isFixed: true
        });
      }

      dispatch(Actions.SetRequestHeadersAction(localHeaders));
      if (basicAuthData) {
        removeParams();
      }
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
          className={props.settingsMode ? "auth-token-text auth-text auth-token-setting-mode" : `auth-token-text auth-text ${varColor}`}
          id={"bearer_token"}
          value={auth.password}
          onChange={setBearerToken}
        >
        </textarea>
        <label className="auth-token-label">Prefix</label>
        {
          props.settingsMode ?
            <input
              className="auth-token-prefix-text auth-text setting-mode"
              id={"bearer_token"}
              value={auth.tokenPrefix ? auth.tokenPrefix : "Bearer"}
              maxLength={50}
              onChange={(e) => setTokenPrefix(e.target.value)}
            />
            :
            envVar && selectedVariable.id && <TextEditor
              varWords={envVar}
              onChange={setTokenPrefix}
              value={auth.tokenPrefix ? auth.tokenPrefix : "Bearer"}
              focus={false}
              maxLength={50}
            />
        }
      </div>
    );
  };

  const basicAuth = () => {
    return (
      <div>
        <div className="basic-auth-text-panel">
          <label className="basic-auth-label">User Name</label>
          {
            props.settingsMode ?
              <input
                className="basic-auth-username auth-text setting-mode"
                id={"basic_user_name"}
                value={auth.userName}
                maxLength={500}
                onChange={(e) => setBasicAuthUserName(e.target.value)}
              />
              :
              envVar && selectedVariable.id && <TextEditor
                varWords={envVar}
                onChange={setBasicAuthUserName}
                value={auth.userName}
                focus={false}
                maxLength={500}
              />
          }
        </div>
        <div className="basic-auth-text-panel">
          <label className="basic-auth-label">Password</label>
          {
            props.settingsMode ?
              <input
                className="basic-auth-password auth-text"
                id={"basic_password"}
                value={auth.password}
                type={auth.showPwd ? "text" : "password"}
                maxLength={500}
                onChange={(e) => setBasicAuthPassword(e.target.value)}
              />
              :
              auth.showPwd ?
                envVar && selectedVariable.id && <TextEditor
                  varWords={envVar}
                  onChange={setBasicAuthPassword}
                  value={auth.password}
                  focus={false}
                  maxLength={500}
                />
                :
                <input
                  className="basic-auth-password auth-text"
                  id={"basic_password"}
                  value={auth.password}
                  type="password"
                  maxLength={500}
                  onChange={(e) => setBasicAuthPassword(e.target.value)}
                />
          }
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
          {
            props.settingsMode ?
              <input
                className="basic-auth-username auth-text setting-mode"
                id={"basic_user_name"}
                value={auth.userName}
                maxLength={500}
                onChange={(e) => setBasicAuthUserName(e.target.value)}
              />
              :
              envVar && selectedVariable.id && <TextEditor
                varWords={envVar}
                onChange={setBasicAuthUserName}
                value={auth.userName}
                focus={false}
                maxLength={500}
              />
          }
        </div>
        <div className="basic-auth-text-panel">
          <label className="basic-auth-label">Value</label>
          {
            props.settingsMode ?
              <input
                className="basic-auth-password auth-text setting-mode"
                id={"basic_password"}
                value={auth.password}
                maxLength={500}
                onChange={(e) => setBasicAuthPassword(e.target.value)}
              />
              :
              envVar && selectedVariable.id && <TextEditor
                varWords={envVar}
                onChange={setBasicAuthPassword}
                value={auth.password}
                focus={false}
                maxLength={500}
              />
          }
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
      case "aws":
        return <AwsAuth envVar={envVar} selectedVariable={selectedVariable}/>;
      default:
        return (<div className={props.settingsMode ? "auth-no-label" : ""}><label>{"This request does not use any authorization."}</label></div>);
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
          {
            props.authTypes ?
              props.authTypes.map(({ value, name }) => (
                <option value={value} key={value}>
                  {name}
                </option>
              ))
              :
              authTypes.map(({ value, name }) => (
                <option value={value} key={value}>
                  {name}
                </option>
              ))
          }
        </select>
      </div>
      {!props.settingsMode && <hr />}
      <div>
        {authValuePanel(auth.authType)}
      </div>
    </div>
  );
};