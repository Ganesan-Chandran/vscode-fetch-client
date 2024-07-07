import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { requestTypes } from '../../../../../../utils/configuration';
import { IRootState } from "../../../../../reducer/combineReducer";
import { TextEditor } from '../../../../Common/TextEditor/TextEditor';
import vscode from '../../../../Common/vscodeAPI';
import { IVariable } from '../../../../SideBar/redux/types';
import { Actions } from "../../../redux";
import { InitialAuth } from '../../../redux/reducer';
import { isAvailable } from '../helper';
import { AwsAuth } from './aws';
import { apiKeyAddTo, authCollection } from "./consts";
import { OAuth } from './OAuth';
import "./style.css";

export interface IAuthProps {
  settingsMode?: boolean;
  authTypes: { name: string, value: string }[];
  selectedVariable: IVariable;
}

export const AuthPanel = (props: IAuthProps) => {

  const dispatch = useDispatch();

  const { auth, params, headers } = useSelector((state: IRootState) => state.requestData);
  const { colId, folderId, parentSettings } = useSelector((state: IRootState) => state.reqColData);

  const [varColor, setColor] = useState("");
  const [envVar, setEnvVar] = useState(null);

  useEffect(() => {
    if (props.selectedVariable.id) {
      setEnvVar(props.selectedVariable.data.map(item => item.key));
    } else {
      setEnvVar([]);
    }
  }, [props.selectedVariable.data]);

  useEffect(() => {
    if (props.selectedVariable.id) {
      setEnvVar(props.selectedVariable.data.map(item => item.key));
    } else {
      setEnvVar([]);
    }

    if (auth.authType === "bearertoken") {
      if (auth.password.length > 4 && auth.password.includes("{{") && auth.password.includes("}}")) {
        var word = auth.password.substring(auth.password.indexOf("{{") + 2, auth.password.lastIndexOf("}}"));
        if (props.selectedVariable.id) {
          props.selectedVariable.data.map(item => item.key).includes(word) ? setColor("var-available") : setColor("var-notavailable");
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

    if (evt.target.value !== "inherit" && auth.authType === "inherit") {
      if (auth.addTo = "queryparams") {
        removeParams();
      } else {
        removeHeaders();
      }
    }

    if (evt.target.value === "inherit" && !parentSettings) {
      vscode.postMessage({ type: requestTypes.getParentSettingsRequest, data: { colId: colId, folderId: folderId } });
      return;
    }

    if (evt.target.value === "inherit" && parentSettings && parentSettings.auth.authType === "apikey") {
      modifyQueryParam(parentSettings.auth.addTo, parentSettings.auth.userName, parentSettings.auth.password);
    }
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

  const setAPIKeyAddTo = (evt: React.ChangeEvent<HTMLSelectElement>) => {
    let localAuth = { ...auth };
    localAuth.addTo = evt.target.value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
    modifyQueryParam(evt.target.value, auth.userName, auth.password);
  };

  const modifyQueryParam = (section: string, userName: string, password: string) => {
    if (section === "queryparams") {
      let localParams = [...params];
      let localHeaders = [...headers];
      let basicAuthData = localHeaders.find(isAvailable);

      if (userName) {
        localParams.unshift({
          isChecked: true,
          key: userName,
          value: password,
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

      if (userName) {
        localHeaders.unshift({
          isChecked: true,
          key: userName,
          value: password,
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
          className={`auth-token-text auth-text ${varColor}`}
          id={"bearer_token"}
          value={auth.authType === "inherit" ? parentSettings.auth.password : auth.password}
          onChange={setBearerToken}
        >
        </textarea>
        <label className="auth-token-label">Prefix</label>
        {
          envVar && props.selectedVariable.id && <TextEditor
            varWords={envVar}
            onChange={setTokenPrefix}
            value={auth.authType === "inherit" ? parentSettings.auth.tokenPrefix : (auth.tokenPrefix ? auth.tokenPrefix : "Bearer")}
            focus={false}
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
            envVar && props.selectedVariable.id && <TextEditor
              varWords={envVar}
              onChange={setBasicAuthUserName}
              value={auth.authType === "inherit" ? parentSettings.auth.userName : auth.userName}
              focus={false}
            />
          }
        </div>
        <div className="basic-auth-text-panel">
          <label className="basic-auth-label">Password</label>
          {
            auth.showPwd ?
              envVar && props.selectedVariable.id && <TextEditor
                varWords={envVar}
                onChange={setBasicAuthPassword}
                value={auth.authType === "inherit" ? parentSettings.auth.password : auth.password}
                focus={false}
              />
              :
              <input
                className="basic-auth-password auth-text"
                id={"basic_password"}
                value={auth.authType === "inherit" ? parentSettings.auth.password : auth.password}
                type="password"
                onChange={(e) => setBasicAuthPassword(e.target.value)}
              />
          }
        </div>
        {auth.authType !== "inherit" && <div className="basic-auth-check">
          <input type="checkbox"
            className="basic-auth-check-box"
            checked={auth.showPwd}
            onChange={onSelectChange}
          />
          Show Password
        </div>}
      </div>
    );
  };

  const apiKeyAuth = () => {
    return (
      <div>
        <div className="basic-auth-text-panel">
          <label className="basic-auth-label">Key</label>
          {
            envVar && props.selectedVariable.id && <TextEditor
              varWords={envVar}
              onChange={setBasicAuthUserName}
              value={auth.authType === "inherit" ? parentSettings.auth.userName : auth.userName}
              focus={false}
            />
          }
        </div>
        <div className="basic-auth-text-panel">
          <label className="basic-auth-label">Value</label>
          {
            envVar && props.selectedVariable.id && <TextEditor
              varWords={envVar}
              onChange={setBasicAuthPassword}
              value={auth.authType === "inherit" ? parentSettings.auth.password : auth.password}
              focus={false}
            />
          }
        </div>
        <div className="basic-auth-text-panel">
          <label className="basic-auth-label">Add to</label>
          <select
            className="apikey-add-select"
            value={auth.authType === "inherit" ? parentSettings.auth.addTo : auth.addTo}
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

  const inheritAuth = () => {
    if (!parentSettings) {
      return (<></>);
    }

    return (
      <>
        <label className="auth-label">{`This request is inherit `}<b>{authCollection[parentSettings.auth.authType]}</b>{` values from Parent.`}</label>
        <details className="inherit-auth-details" open={false} key={"inherit-auth-details"}>
          <summary className="inherit-auth-summary">
            {authCollection[parentSettings.auth.authType]}
          </summary>
          <div className="inherit-auth-summary-panel">
            {authValuePanel(parentSettings.auth.authType, true)}
          </div>
        </details>
      </>
    );
  };

  const authValuePanel = (type: string, isInherit: boolean = false) => {
    switch (type) {
      case "bearertoken":
        return bearerToken();
      case "basic":
        return basicAuth();
      case "apikey":
        return apiKeyAuth();
      case "aws":
        return <AwsAuth envVar={envVar} selectedVariable={props.selectedVariable} settingAuth={parentSettings?.auth} />;
      case "oauth2":
          return <OAuth envVar={envVar} selectedVariable={props.selectedVariable} settingAuth={parentSettings?.auth} inherit={isInherit} />;
      case "inherit":
        return props.settingsMode ? <></> : inheritAuth();
      default:
        return (<div className={props.settingsMode ? "auth-no-label" : ""}><label className="auth-label">{"This request does not use any authorization."}</label></div>);
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
            props.authTypes.map(({ value, name }) => (
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