import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { v4 as uuidv4 } from 'uuid';
import { requestTypes, responseTypes } from "../../../utils/configuration";
import { formatDate } from "../../../utils/helper";
import { HandleColSelectionValidation } from "./helper";
import vscode from "../Common/vscodeAPI";
import { ResponseActions } from "../ResponseUI/redux";
import { ReponsePanel } from "../ResponseUI/ResponsePanel";
import { InitialSettings } from "../SideBar/redux/reducer";
import { ICollections, IFolder, IHistory } from "../SideBar/redux/types";
import "./style.css";

const CurlUI = () => {

  const dispatch = useDispatch();

  const [curl, setCurl] = useState("");
  const [curlOption, setCurlOption] = useState("import");
  const [errors, setErrors] = useState({
    "colSelect": "",
    "colName": "",
    "folderName": "",
    "curlError": ""
  });

  const [selectedCollection, selSelectedCollection] = useState("");
  const [colName, setColName] = useState("");
  const [collections, setCollections] = useState([]);

  const [isDone, setDone] = useState(false);

  const [selectedFolder, setSelectedFolder] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folders, setFolders] = useState([]);
  const [currentFolders, setCurrentFolders] = useState([]);

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.runCurlResponse) {
        dispatch(ResponseActions.SetResponseCookiesAction(event.data.response.cookies));
        dispatch(ResponseActions.SetResponseAction(event.data.response.response));
        dispatch(ResponseActions.SetResponseHeadersAction(event.data.response.headers));
      } else if (event.data && event.data.type === responseTypes.getAllCollectionNameResponse) {
        let colNames = [{ name: "Select", value: "", disabled: true }];
        colNames = [...colNames, ...event.data.collectionNames];
        colNames.push({ name: "----------------------", value: "-1", disabled: true });
        colNames.push({ name: "Create New", value: "0", disabled: false });
        setCollections(colNames);
        setFolders(event.data.folderNames);
      } else if (event.data && event.data.type === responseTypes.addToCollectionsResponse) {
        setDone(true);
        vscode.postMessage({ type: requestTypes.openHistoryItemRequest, data: { colId: event.data.colId, folderId: event.data.folderId, id: event.data.historyId, name: event.data.historyName, varId: event.data.varId } });
      } else if (event.data && event.data.type === responseTypes.curlErrorResponse) {
        setErrors({
          ...errors, "colSelect": "",
          "colName": "",
          "folderName": "",
          "curlError": event.data.error
        });
      }
    });

    vscode.postMessage({ type: requestTypes.getAllCollectionNameRequest, data: "addtocol" });

  }, []);

  function onCurlOptionSelect(type: string) {
    setCurlOption(type);
  }

  function getCurlCommandSelection() {
    return (
      <div className="curl-options">
        <input type="radio" value="import" name="curl" checked={curlOption === "import"} onChange={() => onCurlOptionSelect("import")} /> Import
        <input className="curl-option" type="radio" value="run" name="curl" checked={curlOption === "run"} onChange={() => onCurlOptionSelect("run")} /> Run (Without Save)
      </div>
    );
  }

  function onRunClick() {
    dispatch(ResponseActions.SetResponseLoadingAction(true));
    vscode.postMessage({ type: requestTypes.runCurlRequest, data: curl });
  }

  function onImportClick() {
    if (HandleColSelectionValidation(selectedCollection, colName, selectedFolder, folderName, errors, setErrors)) {

      let folder: IFolder;
      let history: IHistory = {
        id: uuidv4(),
        method: "",
        name: "",
        url: "",
        createdTime: formatDate()
      };

      if (selectedFolder) {
        folder = {
          id: selectedFolder === "0" ? uuidv4() : selectedFolder,
          name: selectedFolder === "0" ? folderName : "",
          createdTime: formatDate(),
          type: "folder",
          data: [history],
          settings: InitialSettings
        };
      }

      let collection: ICollections = {
        id: selectedCollection === "0" ? uuidv4() : selectedCollection,
        createdTime: formatDate(),
        name: selectedCollection === "0" ? colName : "",
        data: folder ? [folder] : [history],
        variableId: "",
        settings: InitialSettings
      };

      vscode.postMessage({ type: requestTypes.convertCurlToJsonRequest, data: { curl: curl, col: collection, hasFolder: folder ? true : false, isNewFolder: selectedFolder === "0" ? true : false } });
    }
  }

  function getButtonSection() {
    return (
      <div className={curlOption === "run" ? "curl-run-btn-panel" : "curl-import-btn-panel"}>
        <button
          type="submit"
          className={curlOption === "run" ? "submit-button curl-run-btn" : "submit-button curl-run-col-btn"}
          onClick={curlOption === "run" ? onRunClick : onImportClick}
          disabled={isDone || !curl}
        >
          {curlOption === "run" ? "Run" : "Import"}
        </button>
      </div>
    );
  }

  function getCurlCommandUI() {
    return (
      <div className="curl-text-panel">
        {getCurlCommandSelection()}
        <label className="curl-label">Curl Command : </label>
        <br />
        <div className="curl-text-section">
          <textarea
            className="curl-text-box"
            value={curl}
            onChange={(e) => setCurl(e.target.value)}
          >
          </textarea>
          {curlOption === "run" && getButtonSection()}
        </div>
      </div>
    );
  }

  const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    selSelectedCollection(event.target.value);
    setColName("");

    let folderNames = [{ colId: "", name: "Select", value: "", disabled: true }];
    folderNames = [...folderNames, ...folders.filter(item => item.colId === event.target.value)];
    folderNames.push({ colId: "-1", name: "----------------------", value: "-1", disabled: true });
    folderNames.push({ colId: "0", name: "Create New", value: "0", disabled: false });

    setCurrentFolders(folderNames);
    setSelectedFolder("");
    setFolderName("");

    setErrors({
      ...errors, "colSelect": "",
      "colName": "",
      "folderName": "",
      "curlError": ""
    });
  };

  const onSelectFolder = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setErrors({ ...errors, "folderName": "" });
    setSelectedFolder(event.target.value);
    setFolderName("");
  };

  function onNameChange(e: any) {
    setColName(e.target.value);
    setErrors({ ...errors, "colName": (e.target.value ? (e.target.value.toUpperCase().trim() === "DEFAULT" ? "Collection name should not be 'Default'" : "") : "Cannot be empty") });
  }

  function onFolderNameChange(e: any) {
    setFolderName(e.target.value);
    setErrors({ ...errors, "folderName": (e.target.value ? "" : "Cannot be empty") });
  }

  function getCollectionSelectionUI() {
    return (
      <div className="curl-col-table-panel">
        <table className="curl-col-table" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td className="col-1-size">
                <span className="addto-label">Collection :</span>
              </td>
              <td className="col-2-size block-display">
                <select
                  className={errors["colSelect"] ? "addto-select required-value" : "addto-select"}
                  required={true}
                  value={selectedCollection}
                  onChange={(e) => onSelect(e)}
                >
                  {
                    collections.map((param: any, index: number) => {
                      return (
                        <option
                          disabled={param.disabled}
                          hidden={index === 0 ? true : false}
                          key={index + param.name}
                          value={param.value}
                        >
                          {param.name}
                        </option>
                      );
                    })
                  }
                </select>
              </td>
            </tr>
            {selectedCollection === "0" ? <tr>
              <td className="col-1-size">
                <span className="addto-label">Collection Name :</span>
              </td>
              <td className="col-2-size">
                <input className={errors["colName"] ? "addto-text required-value" : "addto-text"} type="text" title="Collection Name" onChange={onNameChange}></input>
              </td>
            </tr> : null}
            {selectedCollection ? <tr>
              <td className="col-1-size">
                <span className="addto-label">Folder :</span>
              </td>
              <td className="col-2-size block-display">
                <select
                  className="addto-select"
                  required={true}
                  value={selectedFolder}
                  onChange={(e) => onSelectFolder(e)}
                >
                  {
                    currentFolders.map((param: any, index: number) => {
                      return (
                        <option
                          disabled={param.disabled}
                          hidden={index === 0 ? true : false}
                          key={index + param.name}
                          value={param.value}
                        >
                          {param.name}
                        </option>
                      );
                    })
                  }
                </select>
              </td>
            </tr> : null}
            {selectedFolder === "0" ? <tr>
              <td className="col-1-size">
                <span className="addto-label">Folder Name :</span>
              </td>
              <td className="col-2-size">
                <input className={errors["folderName"] ? "addto-text required-value" : "addto-text"} type="text" title="Folder Name" onChange={onFolderNameChange}></input>
              </td>
            </tr> : null}
            {curlOption === "import" && <tr>
              <td className="col-1-size">
                <label />
              </td>
              <td className="col-2-size">
                {getButtonSection()}
              </td>
            </tr>}
            {errors["curlError"] && <tr>
              <td className="col-1-size">
                <label />
              </td>
              <td className="col-2-size">
                <div className="error-text curl-error">{errors["curlError"]}</div>
              </td>
            </tr>}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      {getCurlCommandUI()}
      {curlOption === "import" && getCollectionSelectionUI()}
      {curlOption === "run" && <><hr /> <div className="curl-res-panel">
        <ReponsePanel isVerticalLayout={false} isCurl={true} />
      </div></>}
    </>
  );
};

export default CurlUI;