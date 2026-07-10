import "./style.css";
import { Actions } from "../../../../redux";
import { AppDispatch } from "../../../../../../store/appStore";
import { IAuth } from "../../../../../../../fetch-client-core/types/auth.types";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { IVariable } from "../../../../../../../fetch-client-core/types/sidebar.types";
import { TextEditor } from "../../../../../Common/TextEditor/TextEditor";
import { useDispatch, useSelector } from "react-redux";
import React from "react";

export interface IAwsAuthProps {
	settingAuth?: IAuth;
	envVar: any;
	selectedVariable: IVariable;
}

export const AwsAuth = (props: IAwsAuthProps) => {

	const dispatch = useDispatch<AppDispatch>();

	const { auth } = useSelector((state: IRootState) => state.requestData);

	const useSettingAuth =
		props.settingAuth &&
		props.settingAuth.aws?.accessKey?.trim() &&
		props.settingAuth.aws?.secretAccessKey?.trim();

	const awsAuth = useSettingAuth ? props.settingAuth.aws : auth.aws;

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
						value={awsAuth.accessKey}
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
						value={awsAuth.secretAccessKey}
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
								value={awsAuth.region}
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
								value={awsAuth.service}
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
								value={awsAuth.sessionToken}
								focus={false}
							/>
						}
					</div>
				</div>
			</details>
		</div>
	);
};
