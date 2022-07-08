import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { TextEditor } from "../../../../../Common/TextEditor/TextEditor";
import { IVariable } from "../../../../../SideBar/redux/types";
import { Actions } from "../../../../redux";
import { IAuth } from "../../../../redux/types";
import "./style.css";

export interface IAwsAuthProps {
  settingAuth?: IAuth;
  envVar: any;
  selectedVariable: IVariable;
}

export const AwsAuth = (props: IAwsAuthProps) => {

  const dispatch = useDispatch();

  const { auth } = useSelector((state: IRootState) => state.requestData);

  const onSetAccessKey = (value: string) => {
    let localAuth = { ...auth };
    localAuth.aws.accessKey = value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  const onSetSecretKey = (value: string) => {
    let localAuth = { ...auth };
    localAuth.aws.secretAccessKey = value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  const onSetRegion = (value: string) => {
    let localAuth = { ...auth };
    localAuth.aws.region = value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  const onSetServiceName = (value: string) => {
    let localAuth = { ...auth };
    localAuth.aws.service = value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  const onSetSessionToken = (value: string) => {
    let localAuth = { ...auth };
    localAuth.aws.sessionToken = value;
    dispatch(Actions.SetRequestAuthAction(localAuth));
  };

  return (
    <div>
      <div className="aws-auth-text-panel">
        <label className="aws-label">AccessKey</label>
        {
          props.envVar && props.selectedVariable.id && <TextEditor
            varWords={props.envVar}
            onChange={onSetAccessKey}
            value={props.settingAuth ? props.settingAuth.aws.accessKey : auth.aws.accessKey}
            focus={false}
          />
        }
      </div>
      <div className="aws-auth-text-panel">
        <label className="aws-label">SecretKey</label>
        {
          props.envVar && props.selectedVariable.id && <TextEditor
            varWords={props.envVar}
            onChange={onSetSecretKey}
            value={props.settingAuth ? props.settingAuth.aws.secretAccessKey : auth.aws.secretAccessKey}
            focus={false}
          />
        }
      </div>
      <details open={true} key={"aws-auth"}>
        <summary className="collection-items">
          {"Advanced"}
          <div>

          </div>
        </summary>
        <div className="collction-item">
          <div className="aws-auth-text-panel">
            <label className="aws-label">AWS Region</label>
            {
              props.envVar && props.selectedVariable.id && <TextEditor
                varWords={props.envVar}
                onChange={onSetRegion}
                value={props.settingAuth ? props.settingAuth.aws.region : auth.aws.region}
                focus={false}
              />
            }
          </div>
          <div className="aws-auth-text-panel">
            <label className="aws-label">Service Name</label>
            {
              props.envVar && props.selectedVariable.id && <TextEditor
                varWords={props.envVar}
                onChange={onSetServiceName}
                value={props.settingAuth ? props.settingAuth.aws.service : auth.aws.service}
                focus={false}
              />
            }
          </div>
          <div className="aws-auth-text-panel">
            <label className="aws-label">Session Token</label>
            {
              props.envVar && props.selectedVariable.id && <TextEditor
                varWords={props.envVar}
                onChange={onSetSessionToken}
                value={props.settingAuth ? props.settingAuth.aws.sessionToken : auth.aws.sessionToken}
                focus={false}
              />
            }
          </div>
        </div>
      </details>
    </div>
  );
};