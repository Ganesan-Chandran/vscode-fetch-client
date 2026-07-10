import "./style.css";
import { IRootState } from "../../../reducer/combineReducer";
import { useSelector } from "react-redux";
import { ViewerProps } from "./types";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import React, { useEffect, useState } from "react";
import {
	githubDarkTheme,
	githubLightTheme,
	JsonEditor,
	monoDarkTheme,
} from "json-edit-react";

export const XMLViewer = (props: ViewerProps) => {
	const { theme } = useSelector((state: IRootState) => state.uiData);

	const [jsonData, setJsonData] = useState({});
	const [isValid, setValid] = useState(false);
	const [searchText, setSearchText] = useState("");

	useEffect(() => {
		if (XMLValidator.validate(props.data) === true) {
			const options = {
				ignoreAttributes: false,
				attributeNamePrefix: "@",
				allowBooleanAttributes: true,
				removeNSPrefix: true,
			};
			const parser = new XMLParser(options);
			const jsonObj = parser.parse(props.data);
			setJsonData(jsonObj);
			setValid(true);
		} else {
			setValid(false);
		}
	}, []);

	const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setSearchText(value);
	};

	return (
		<div className="json-viewer-panel">
			{isValid ? (
				<>
					<input
						value={searchText}
						className="json-searchbox"
						onChange={(event) => onChange(event)}
						disabled={!isValid}
						placeholder={"Search Text"}
						type="text"
					/>
					<JsonEditor
						minWidth={"90%"}
						data={jsonData}
						viewOnly={true}
						theme={
							theme === 1
								? githubLightTheme
								: theme === 2
									? githubDarkTheme
									: monoDarkTheme
						}
						searchText={searchText}
						searchFilter={"all"}
					/>
				</>
			) : (
				<span className="file-not-available json-viewer-error">
					{"Invalid XML."}
				</span>
			)}
		</div>
	);
};
