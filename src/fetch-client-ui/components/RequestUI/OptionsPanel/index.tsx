import React from "react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { IRootState } from "../../../reducer/combineReducer";
import { TestPanel } from "../../TestUI/TestPanel";
import ResToVariables from "../../Variables/resToVar";
import { AuthPanel } from "./Options/Auth";
import { allAuthTypes, basicAuthTypes } from "./Options/Auth/consts";
import { Body } from "./Options/Body";
import { HeadersPanel } from "./Options/Headers";
import { QueryParams } from "./Options/QueryParams";
import { Settings } from "./Options/Settings";
import { OptionsTab } from "./OptionTab";
import "./style.css";

export const OptionsPanel = () => {

  const { selectedVariable } = useSelector((state: IRootState) => state.variableData);
  const { colId } = useSelector((state: IRootState) => state.reqColData);
  const { runItem } = useSelector((state: IRootState) => state.uiData);

  const [selectedTab, setSelectedTab] = useState(runItem ? "tests" : "params");

  const renderOptionsUI = (tab: string) => {
    switch (tab) {
      case 'params':
        return <QueryParams />;
      case 'authorization':
        return <AuthPanel authTypes={colId ? allAuthTypes : basicAuthTypes} selectedVariable={selectedVariable} />;
      case 'headers':
        return <HeadersPanel />;
      case 'body':
        return <Body />;
      case 'settings':
        return <Settings />;
      case 'setvar':
        return <ResToVariables />;
      default:
        return <TestPanel />;
    }
  };

  return (
    <div className="options-panel">
      <div className="options-container">
        <OptionsTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        <div className="options-tab-panel">
          {renderOptionsUI(selectedTab)}
        </div>
      </div>
    </div>
  );
};
