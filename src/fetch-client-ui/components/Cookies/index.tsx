import "./style.css";
import { ICookie } from "../../../fetch-client-core/types/cookie.types";
import { InitialCookie } from "../../../fetch-client-core/consts/initialValues.consts";
import {
	requestTypes,
	responseTypes,
} from "../../../fetch-client-core/consts/requestTypes.consts";
import { ResponseTable } from "../Common/Table/ResponseTable";
import PanelLayout from "../Common/Layout/panelLayout";
import React, { useEffect, useRef, useState } from "react";
import vscode from "../Common/vscodeAPI";

const ManageCookies = () => {
	const [cookies, _setCookies] = useState<ICookie[]>(null);
	const cookiesRef = useRef(cookies);
	const setCookies = (data: ICookie[]) => {
		cookiesRef.current = data;
		_setCookies(data);
	};

	const [currentCookie, setCurrentCookie] = useState<ICookie>(InitialCookie);
	const [cookieId, setSelecetdCookieId] = useState("");

	useEffect(() => {
		window.addEventListener("message", (event) => {
			if (
				event.data &&
				event.data.type === responseTypes.getAllCookiesResponse
			) {
				let cookies = event.data.cookies as ICookie[];
				setCookies(cookies);
			} else if (
				event.data &&
				event.data.type === responseTypes.deleteCookieByIdResponse
			) {
				let localData = [...cookiesRef.current];
				let index = localData.findIndex((item) => item.id === event.data.id);
				if (index !== -1) {
					localData.splice(index, 1);
				}
				setCookies(localData);
			} else if (
				event.data &&
				event.data.type === responseTypes.deleteAllCookieResponse
			) {
				let localData = [...cookiesRef.current];
				localData.length = 0;
				setCookies(localData);
			}
		});

		vscode.postMessage({ type: requestTypes.getAllCookiesRequest });
	}, []);

	useEffect(() => {
		if (cookies && cookies.length > 0) {
			let id = document.title.split("@:@")[1];
			if (id !== "undefined" && id !== "[object Object]") {
				setSelecetdCookieId(id);
				setCurrentCookie(cookies.find((item) => item.id === id));
			} else {
				setSelecetdCookieId(cookies[0].id);
				setCurrentCookie(cookies[0]);
			}
		} else {
			setCurrentCookie(InitialCookie);
			setSelecetdCookieId("");
		}
	}, [cookies]);

	function onSubmitClick() {
		vscode.postMessage({
			type: requestTypes.deleteCookieByIdRequest,
			data: currentCookie.id,
		});
	}

	function onDeleteAllClick() {
		vscode.postMessage({ type: requestTypes.deleteAllCookieRequest });
	}

	function isDisabled(): boolean {
		if (currentCookie && !currentCookie.id) {
			return true;
		}

		return false;
	}

	const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setSelecetdCookieId(event.target.value);
		setCurrentCookie(cookies.find((item) => item.id === event.target.value));
	};

	function renderHeader() {
		if (!cookies || cookies.length === 0) {
			return null;
		}

		return (
			<div className="variable-panel-name cookie-align-parent">
				<span className="addto-label cookie-align-child">Cookie :</span>

				<select
					className="addto-select cookie-select"
					value={cookieId}
					onChange={onSelect}
				>
					{cookies.map((cookie: ICookie, index: number) => (
						<option key={index + cookie.name} value={cookie.id}>
							{cookie.name}
						</option>
					))}
				</select>
			</div>
		);
	}

	function renderCookieTable() {
		if (!cookies || cookies.length === 0) {
			return <div className="no-cookie-text">No Cookies Available</div>;
		}

		return (
			<div className="var-tbl-panel cookie-tbl">
				{currentCookie?.data?.length > 0 && (
					<ResponseTable
						data={currentCookie.data}
						readOnly
						type="resCookies"
						headers={{
							key: "Name",
							value: "Value",
							value1: "Details",
						}}
					/>
				)}
			</div>
		);
	}

	function renderFooter() {
		if (!cookies || cookies.length === 0) {
			return null;
		}

		return (
			<div className="reorder-btn-panel">
				<button
					type="button"
					className="submit-button reorder-btn cookie-btn"
					onClick={onSubmitClick}
					disabled={isDisabled()}
				>
					Delete Cookie
				</button>

				<button
					type="button"
					className="submit-button reorder-btn cookie-btn"
					onClick={onDeleteAllClick}
					disabled={isDisabled()}
				>
					Delete All Cookies
				</button>
			</div>
		);
	}
	return (
		<PanelLayout
			title="🌐 Manage Cookies"
			header={renderHeader()}
			footer={renderFooter()}
		>
			{renderCookieTable()}
		</PanelLayout>
	);
};

export default ManageCookies;
