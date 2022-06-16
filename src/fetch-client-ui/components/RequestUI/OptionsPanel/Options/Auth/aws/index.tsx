import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { TextEditor } from "../../../../../Common/TextEditor/TextEditor";
import { IVariable } from "../../../../../SideBar/redux/types";
import { Actions } from "../../../../redux";
import "./style.css";

export interface IAwsAuthProps {
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
            value={auth.aws.accessKey}
            focus={false}
            maxLength={500}
          />
        }
      </div>
      <div className="aws-auth-text-panel">
        <label className="aws-label">SecretKey</label>
        {
          props.envVar && props.selectedVariable.id && <TextEditor
            varWords={props.envVar}
            onChange={onSetSecretKey}
            value={auth.aws.secretAccessKey}
            focus={false}
            maxLength={500}
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
                value={auth.aws.region}
                focus={false}
                maxLength={500}
              />
            }
          </div>
          <div className="aws-auth-text-panel">
            <label className="aws-label">Service Name</label>
            {
              props.envVar && props.selectedVariable.id && <TextEditor
                varWords={props.envVar}
                onChange={onSetServiceName}
                value={auth.aws.service}
                focus={false}
                maxLength={500}
              />
            }
          </div>
          <div className="aws-auth-text-panel">
            <label className="aws-label">Session Token</label>
            {
              props.envVar && props.selectedVariable.id && <TextEditor
                varWords={props.envVar}
                onChange={onSetSessionToken}
                value={auth.aws.sessionToken}
                focus={false}
                maxLength={500}
              />
            }
          </div>
        </div>
      </details>
    </div>
  );
};