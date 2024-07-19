import { Actions } from "../../../../redux";
import { ClientAuth, GrantType, IAuth, IRequestModel } from "../../../../redux/types";
import { clientAuthOpt, grantTypeOpt } from "../consts";
import { formatDate } from "../../../../../../../utils/helper";
import { InitialBody, InitialPreFetch, InitialRequestHeaders, InitialSetVar, InitialTest } from "../../../../redux/reducer";
import { IResponse } from "../../../../../ResponseUI/redux/types";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { ITableData } from "../../../../../Common/Table/types";
import { IVariable } from "../../../../../SideBar/redux/types";
import { requestTypes, responseTypes } from "../../../../../../../utils/configuration";
import { TextEditor } from "../../../../../Common/TextEditor/TextEditor";
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from 'uuid';
import React, { useEffect } from "react";
import vscode from "../../../../../Common/vscodeAPI";
import "./style.css";

export interface IOAuthProps {
  inherit: boolean;
  settingAuth?: IAuth;
  envVar: any;
  selectedVariable: IVariable;
}

export const OAuth = (props: IOAuthProps) => {

  const dispatch = useDispatch();

  const auth = props.settingAuth ? props.settingAuth : useSelector((state: IRootState) => state.requestData.auth);
  const { selectedVariable } = useSelector((state: IRootState) => state.variableData);
  const { parentSettings } = useSelector((state: IRootState) => state.reqColData);

  const onSetGrantype = (value: GrantType) => {
    let localAuth = { ...auth };
    localAuth.oauth.grantType = value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  const onSetClientAuth = (value: ClientAuth) => {
    let localAuth = { ...auth };
    localAuth.oauth.clientAuth = value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  const onSetValue = (type: string, value: string) => {
    let localAuth = { ...auth };
    if (type === "tokenUrl") {
      localAuth.oauth.tokenUrl = value;
    } else if (type === "clientId") {
      localAuth.oauth.clientId = value;
    } else if (type === "clientSecret") {
      localAuth.oauth.clientSecret = value;
    } else if (type === "username") {
      localAuth.oauth.username = value;
    } else if (type === "password") {
      localAuth.oauth.password = value;
    } else if (type === "scope") {
      localAuth.oauth.scope = value;
    } else if (type === "tokenPrefix") {
      localAuth.tokenPrefix = value;
    } else if (type === "tokenName") {
      localAuth.oauth.tokenName = value;
    } else if (type === "audience") {
      localAuth.oauth.advancedOpt.audience = value;
    } else if (type === "resource") {
      localAuth.oauth.advancedOpt.resource = value;
    }

    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  function onNewtokenClick() {
    let reqData: IRequestModel = {
      id: uuidv4(),
      url: auth.oauth.tokenUrl,
      name: "tokenGen",
      createdTime: formatDate(),
      method: "post",
      params: [{ isChecked: false, key: "", value: "" }],
      auth: {
        authType: "noauth",
        userName: "",
        password: "",
        addTo: "queryparams",
        showPwd: false,
        tokenPrefix: "Bearer",
      },
      headers: JSON.parse(JSON.stringify(InitialRequestHeaders)),
      body: JSON.parse(JSON.stringify(InitialBody)),
      tests: JSON.parse(JSON.stringify(InitialTest)),
      setvar: JSON.parse(JSON.stringify(InitialSetVar)),
      notes: "",
      preFetch: JSON.parse(JSON.stringify(InitialPreFetch)),
    };
    let localAuth = { ...auth };
    let urlencoded: ITableData[] = [];

    urlencoded.push({ isChecked: true, key: "grant_type", value: auth.oauth.grantType === GrantType.Client_Crd ? "client_credentials" : "password" });
    urlencoded.push({ isChecked: true, key: "scope", value: auth.oauth.scope });

    if (auth.oauth.clientAuth === ClientAuth.Body) {
      urlencoded.push({ isChecked: true, key: "client_id", value: auth.oauth.clientId });
      urlencoded.push({ isChecked: true, key: "client_secret", value: auth.oauth.clientSecret });
    } else {
      let encodedString = Buffer.from(auth.oauth.clientId + ":" + auth.oauth.clientSecret).toString('base64');
      reqData.headers.push({ isChecked: true, key: "Authorization", value: "Basic " + encodedString });
    }

    if (auth.oauth.grantType === GrantType.PWD_Crd) {
      urlencoded.push({ isChecked: true, key: "username", value: auth.oauth.username });
      urlencoded.push({ isChecked: true, key: "password", value: auth.oauth.password });
    }

    if (auth.oauth.grantType === GrantType.Client_Crd && auth.oauth.advancedOpt?.resource) {
      urlencoded.push({ isChecked: true, key: "resource", value: auth.oauth.advancedOpt.resource });
    }

    if (auth.oauth.advancedOpt?.audience) {
      urlencoded.push({ isChecked: true, key: "audience", value: auth.oauth.advancedOpt?.audience });
    }

    reqData.body.bodyType = "formurlencoded";
    reqData.body.urlencoded = urlencoded;

    localAuth.password = "";
    dispatch(Actions.SetRequestAuthAction(localAuth));
    vscode.postMessage({ type: requestTypes.tokenRequest, data: { reqData: reqData, variableData: selectedVariable?.data, settings: parentSettings } });
  }

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.tokenResponse) {
        let tokenResponse: IResponse = event.data.response as IResponse;
        if (!tokenResponse.isError && tokenResponse.status === 200) {
          const responseData = JSON.parse(tokenResponse.responseData);
          let tokenName = auth.oauth.tokenName ? auth.oauth.tokenName : "access_token";
          dispatch(Actions.SetOAuthTokenAction(responseData[tokenName] ? responseData[tokenName] : ""));
        }
      }
    });
  }, []);

  return (
    <div className="collction-item">
      <div className="oauth-text-panel">
        <span className="oauth-label" title="The generated token will be automatically added to Autorization header">Access Token<label className="runall-settings-info-label" title="The generated token will be automatically added to Autorization header">ⓘ</label></span>
        {
          props.envVar && props.selectedVariable.id && <TextEditor
            varWords={props.envVar}
            value={auth.password}
            focus={false}
          />
        }

      </div>
      <div className="oauth-text-panel">
        <label className="oauth-label">Header Prefix</label>
        {
          props.envVar && props.selectedVariable.id && <TextEditor
            varWords={props.envVar}
            onChange={(value: string) => onSetValue("tokenPrefix", value)}
            value={auth.tokenPrefix}
            focus={false}
          />
        }
      </div>
      <label className="oauth-section-header">{"Configure New Token"}</label>
      <div className="oauth-text-panel">
        <label className="oauth-label">Grant Type</label>
        <select
          className="oauth-select apikey-add-select"
          value={auth.oauth.grantType}
          onChange={(e) => onSetGrantype(e.target.value as GrantType)}
        >
          {grantTypeOpt.map(({ value, name }) => (
            <option value={value} key={value}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="oauth-text-panel">
        <label className="oauth-label">Access Token URL</label>
        {
          props.envVar && props.selectedVariable.id && <TextEditor
            varWords={props.envVar}
            onChange={(value: string) => onSetValue("tokenUrl", value)}
            value={auth.oauth.tokenUrl}
            focus={false}
          />
        }
      </div>
      <div className="oauth-text-panel">
        <label className="oauth-label">Client ID</label>
        {
          props.envVar && props.selectedVariable.id && <TextEditor
            varWords={props.envVar}
            onChange={(value: string) => onSetValue("clientId", value)}
            value={auth.oauth.clientId}
            focus={false}
          />
        }
      </div>
      <div className="oauth-text-panel">
        <label className="oauth-label">Client Secret</label>
        {
          props.envVar && props.selectedVariable.id && <TextEditor
            varWords={props.envVar}
            onChange={(value: string) => onSetValue("clientSecret", value)}
            value={auth.oauth.clientSecret}
            focus={false}
          />
        }
      </div>
      {auth.oauth.grantType === GrantType.PWD_Crd && <>
        <div className="oauth-text-panel">
          <label className="oauth-label">Username</label>
          {
            props.envVar && props.selectedVariable.id && <TextEditor
              varWords={props.envVar}
              onChange={(value: string) => onSetValue("username", value)}
              value={auth.oauth.username}
              focus={false}
            />
          }
        </div>
        <div className="oauth-text-panel">
          <label className="oauth-label">Password</label>
          {
            props.envVar && props.selectedVariable.id && <TextEditor
              varWords={props.envVar}
              onChange={(value: string) => onSetValue("password", value)}
              value={auth.oauth.password}
              focus={false}
            />
          }
        </div>
      </>
      }
      <div className="oauth-text-panel">
        <label className="oauth-label">Scope</label>
        {
          props.envVar && props.selectedVariable.id && <TextEditor
            varWords={props.envVar}
            onChange={(value: string) => onSetValue("scope", value)}
            value={auth.oauth.scope}
            focus={false}
          />
        }
      </div>
      <div className="oauth-text-panel">
        <label className="oauth-label">Client Authentication</label>
        <select
          className="oauth-select apikey-add-select"
          value={auth.oauth.clientAuth}
          onChange={(e) => onSetClientAuth(e.target.value as ClientAuth)}
        >
          {clientAuthOpt.map(({ value, name }) => (
            <option value={value} key={value}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <label className="oauth-section-header">{"Advanced Options"}</label>
      {auth.oauth.grantType === GrantType.Client_Crd && <div className="oauth-text-panel">
        <label className="oauth-label">Resource</label>
        {
          props.envVar && props.selectedVariable.id && <TextEditor
            varWords={props.envVar}
            onChange={(value: string) => onSetValue("resource", value)}
            value={auth.oauth.advancedOpt?.resource}
            placeholder="Resource (Optional)"
            focus={false}
          />
        }
      </div>}
      <div className="oauth-text-panel">
        <label className="oauth-label">Audience</label>
        {
          props.envVar && props.selectedVariable.id && <TextEditor
            varWords={props.envVar}
            onChange={(value: string) => onSetValue("audience", value)}
            value={auth.oauth.advancedOpt?.audience}
            placeholder="Audience (Optional)"
            focus={false}
          />
        }
      </div>
      <div className="oauth-text-panel">
        <label className="oauth-label">Token Name</label>
        {
          props.envVar && props.selectedVariable.id && <TextEditor
            varWords={props.envVar}
            onChange={(value: string) => onSetValue("tokenName", value)}
            value={auth.oauth.tokenName}
            placeholder="Token Name (Optional)"
            focus={false}
          />
        }
      </div>
      <div className="oauth-btn-panel">
        <button
          type="submit"
          className="submit-button oauth-token-btn"
          disabled={props.inherit === true}
          onClick={onNewtokenClick}
        >
          Get New Token
        </button>
      </div>
    </div>
  );
};