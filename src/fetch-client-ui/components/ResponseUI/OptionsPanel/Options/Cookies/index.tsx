import React from 'react';
import { useSelector } from "react-redux";
import { requestTypes } from '../../../../../../utils/configuration';
import { IRootState } from "../../../../../reducer/combineReducer";
import { ResponseTable } from '../../../../Common/Table/ResponseTable';
import vscode from '../../../../Common/vscodeAPI';
import "./style.css";

export const ResponseCookies = () => {
	const { cookies } = useSelector((state: IRootState) => state.responseData);

	function onOpenCookies() {
		vscode.postMessage({ type: requestTypes.openManageCookiesRequest });
	}

	return (
		<>
			{cookies?.length === 0 && <hr />}
			<div className="manage-cookie-btn-panel">
				<button onClick={onOpenCookies} className="format-button open-var-button manage-cookie-button">Manage Cookies</button>
			</div>
			{
				cookies?.length > 0 ?
					<ResponseTable
						data={cookies}
						readOnly={true}
						type="resCookies"
						headers={{ key: "Name", value: "Value", value1: "Details" }}
					/>
					:
					<>
						<div className="auth-header-label"><label>{"No Cookies Available."}</label></div>
					</>
			}
		</>
	);
};
