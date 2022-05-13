import React, { useEffect, useState } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { Actions, InitialBinaryData, InitialParams } from "../../../redux";
import { GraphQL } from "../GraphQL";
import { Binary } from "./Binary";
import { requestBodyRaw, requestBodyTypes } from "./consts";
import { FormDataBody } from "./FormData";
import { None } from "./None";
import { Raw } from "./Raw/Raw";
import "./style.css";
import { UrlEncoded } from "./UrlEncoded";

export const Body = () => {

  const dispatch = useDispatch();

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
        return <GraphQL />;
    }
  };

  function onFormatClick() {
    setFormat(!format);
  }

  function renderTextmodeUI() {
    return (
      <>
        <select className="raw-lang-select" value={raw.lang} onChange={(e) => setBodyLang(e.target.value)}>
          {requestBodyRaw.map((type) => (
            <option key={type.value} value={type.value}>
              {type.name}
            </option>
          ))}
        </select>
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
        bodyType === "raw" && <div className="reqest-body-raw-type">
          <span className="reqest-body-raw-type-text">Type : </span>{renderTextmodeUI()}
        </div>
      }
      <div className={bodyType === "raw" ? "request-body-details-panel raw-type" : "request-body-details-panel"}>
        {renderBody(bodyType)}
      </div>
    </>
  );
};