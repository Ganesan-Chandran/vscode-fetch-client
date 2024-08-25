import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { requestTypes, responseTypes } from '../../../../../../../utils/configuration';
import { IRootState } from "../../../../../../reducer/combineReducer";
import vscode from '../../../../../Common/vscodeAPI';
import { Actions } from "../../../../redux";
import { FileTypes } from './consts';
import "./style.css";

export const Binary = () => {

	const dispatch = useDispatch();

	const { body, headers } = useSelector((state: IRootState) => state.requestData);


	const [contentType, setContentType] = useState(body.binary.fileName ? getFileType(body.binary.fileName) : "");

	const overrideEventDefaults =
		(event: Event | React.DragEvent<HTMLElement> | React.ChangeEvent<HTMLInputElement>): void => {
			event.preventDefault();
			event.stopPropagation();
		};

	useEffect(() => {
		window.addEventListener("message", (event) => {
			if (event.data && event.data.type === responseTypes.selectFileResponse) {
				const fileName = event.data.path;
				const fileType = getFileType(fileName);
				if (fileType) {
					setContentType(fileType);
				}
				dispatch(Actions.SetRequestBodyAction({
					...body, binary: {
						fileName: fileName,
						data: event.data.fileData,
						contentTypeOption: "manual"
					}
				}));
			}
		});
	}, []);

	function getFileType(fileName: string): string {
		const lastDot = fileName.lastIndexOf('.');
		const ext = fileName.substring(lastDot + 1);
		if (FileTypes[ext]) {
			return FileTypes[ext];
		}

		return "";
	}

	const onSelectFile = (evt: any) => {
		overrideEventDefaults(evt);
		vscode.postMessage({ type: requestTypes.selectFileRequest });
	};

	const onResetFile = (evt: any) => {
		overrideEventDefaults(evt);
		dispatch(Actions.SetRequestBodyAction({
			...body, binary: {
				fileName: "",
				data: "",
				contentTypeOption: "manual"
			}
		}));
	};

	function onChanged(evt: React.ChangeEvent<HTMLInputElement>) {
		if(evt.target.id !== "manual"){
			if (evt.target.value === "application/octet-stream") {
				updateContentType("application/octet-stream");
			} else if (evt.target.value === contentType) {
				updateContentType(contentType);
			}
		}

		dispatch(Actions.SetRequestBodyAction({
			...body, binary: {
				fileName: body.binary.fileName,
				data: body.binary.data,
				contentTypeOption: evt.target.value
			}
		}));
	}

	function updateContentType(contentTypeValue: string) {
		let localHeaders = [...headers];
		let index = headers.findIndex(item => item.isChecked && item.key.trim().toLocaleLowerCase() === "content-type");
		if (index === -1) {
			index = headers.findIndex(item => item.key.trim().toLocaleLowerCase() === "content-type");
			if (index === -1) {
				localHeaders.splice(localHeaders.length - 1, 0, {
					isChecked: true,
					key: "Content-Type",
					value: contentTypeValue,
					isFixed: false
				});
			} else {
				localHeaders[index].isChecked = true;
				localHeaders[index].value = contentTypeValue;
			}
		} else {
			localHeaders[index].value = contentTypeValue;
		}

		dispatch(Actions.SetRequestHeadersAction(localHeaders));
	}

	return (
		<div className="binary-panel">
			<div className="hr-container"><hr /></div>
			<div className="file-upload-panel">
				<button className="file-upload-text" onClick={onSelectFile}>Select file</button>
				<div className="filename-text">{body.binary.fileName}</div>
				{body.binary.data && body.binary.data.length > 0 && <div className="file-reset-panel"><button className="file-reset-text" onClick={onResetFile}>Reset File</button></div>}
			</div>
			{body.binary.fileName && body.binary.data.length === 0 && <span className="file-not-available">{"The file is not available in the specified location. Please select the file again."}</span>}
			{
				body.binary.data && body.binary.data.length > 0 && (<div className="content-type-panel">
					<span className="content-type-radio-button-text">Content Type : </span>
					<div className="content-type-radio-button-panel">
						<span className="content-type-radio-button-wrapper"><input className="content-type-radio-button" type="radio" id="manual" name="content-type" value="manual" onChange={onChanged} checked={body.binary.contentTypeOption === "manual"} />{"Added by Manual"}</span>
						<span className="content-type-radio-button-wrapper"><input className="content-type-radio-button" type="radio" id="app-oct-stream" name="content-type" value="application/octet-stream" onChange={onChanged} checked={body.binary.contentTypeOption === "application/octet-stream"} />{"application/octet-stream"}</span>
						{contentType && <span className="content-type-radio-button-wrapper"><input className="content-type-radio-button" type="radio" id="by-selected" name="content-type" value={contentType} onChange={onChanged} checked={body.binary.contentTypeOption === contentType} />{contentType}</span>}
						<span className="note-text"><b>{"Note: "}</b>
							<div className="note-text-part">{"For option 1, No Change in the headers section."}</div>
							<div className="note-text-part">{"For Options 2 and 3, manually added content type header will be unchecked and new content type header will be added with the selected value. If you want to return to the old content-type, then you need to do it manually."}</div>
						</span>
					</div>
				</div>)
			}
		</div>
	);
};
