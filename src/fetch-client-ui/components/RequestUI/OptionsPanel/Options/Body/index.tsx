import "./style.css";
import { Actions } from "../../../redux";
import { AppDispatch } from "../../../../../store/appStore";
import { Binary } from "./Binary";
import { FormDataBody } from "./FormData";
import { GraphQL } from "./GraphQL";
import { IRootState } from "../../../../../reducer/combineReducer";
import { None } from "./None";
import { Raw } from "./Raw/Raw";
import { requestBodyRaw, requestBodyTypes } from "../../../../../../fetch-client-core/consts/requestBody.consts";
import { UrlEncoded } from "./UrlEncoded";
import { useDispatch, useSelector } from "react-redux";
import React, { useState } from "react";

export const Body = () => {

	const dispatch = useDispatch<AppDispatch>();

	const { bodyType, raw } = useSelector((state: IRootState) => state.requestData.body);

	const [format, setFormat] = useState(false);

	function setBodyType(value: string) {
		dispatch(Actions.SetRequestResetBodyAction(value));
	}

	function setBodyLang(value: string) {
		dispatch(Actions.SetRequestRawLangAction(value));
	}

	const renderBody = (bodyType: string) => {
		switch (bodyType) {
			case "none":
				return <None />;
			case "formdata":
				return <FormDataBody />;
			case "formurlencoded":
				return <UrlEncoded />;
			case "raw":
				return <Raw format={format} />;
			case "binary":
				return <Binary />;
			default:
				return <GraphQL format={format} />;
		}
	};

	function onFormatClick() {
		setFormat(!format);
	}

	function renderTextmodeUI(type: string) {
		return (
			<>
				{type === "raw" &&
					<>
						<span className="reqest-body-raw-type-text">Type : </span>
						<select className="raw-lang-select" value={raw.lang} onChange={(e) => setBodyLang(e.target.value)}>
							{requestBodyRaw.map((type) => (
								<option key={type.value} value={type.value}>
									{type.name}
								</option>
							))}
						</select>
					</>}
				<button onClick={onFormatClick} className="format-button">Format</button>
			</>
		);
	}

	return (
		<>
			<div className="reqest-body-options-panel">
				{requestBodyTypes.map(({ name, value }) => (
					<div key={value} className="reqest-body-options">
						<button
							key={value}
							onClick={() => setBodyType(value)}
							className={
								bodyType === value
									? "option option-selected"
									: "option"
							}
						>
							<div className="option-names">
								{name}
							</div>
						</button>
					</div>
				))}
			</div>
			{
				(bodyType === "raw" || bodyType === "graphql") && <div className="reqest-body-raw-type">
					{renderTextmodeUI(bodyType)}
				</div>
			}
			<div className={bodyType === "raw" ? "request-body-details-panel raw-type" : "request-body-details-panel"}>
				{renderBody(bodyType)}
			</div>
		</>
	);
};

export default Body;