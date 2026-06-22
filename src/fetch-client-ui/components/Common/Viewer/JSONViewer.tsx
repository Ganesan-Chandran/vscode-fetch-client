import "./style.css";
import { githubDarkTheme, githubLightTheme, JsonEditor, monoDarkTheme } from 'json-edit-react';
import { IRootState } from '../../../reducer/combineReducer';
import { useSelector } from 'react-redux';
import { ViewerProps } from './types';
import React, { useEffect, useState } from 'react';

export const JSONViewer = (props: ViewerProps) => {

	const { theme } = useSelector((state: IRootState) => state.uiData);
	const [jsonData, setJsonData] = useState({});
	const [isValid, setValid] = useState(false);
	const [searchText, setSearchText] = useState("");

	useEffect(() => {
		try {
			setJsonData(JSON.parse(props.data));
			setValid(true);
		} catch {
			setValid(false);
		}
	}, []);

	const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setSearchText(value);
	};

	return (
		<div className="json-viewer-panel">
			{
				isValid ?
					<>
						<input
							value={searchText}
							className="json-searchbox"
							onChange={(event) => onChange(event)}
							disabled={jsonData ? false : true}
							placeholder={"Search Text"}
							type="text"
						/>
						<JsonEditor
							minWidth={"90%"}
							data={jsonData}
							viewOnly={true}
							theme = {theme === 1 ? githubLightTheme : theme === 2 ? githubDarkTheme : monoDarkTheme}
							searchText={searchText}
							searchFilter={"all"}
						/>
					</>
					:
					<span className="file-not-available json-viewer-error">{"Invalid JSON."}</span>
			}
		</div>
	);
};
