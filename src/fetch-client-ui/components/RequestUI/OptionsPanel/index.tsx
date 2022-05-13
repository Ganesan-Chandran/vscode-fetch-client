import React from "react";
import { useState } from "react";
import { TestPanel } from "../../TestUI/TestPanel";
import { AuthPanel } from "./Options/Auth";
import { Body } from "./Options/Body";
import { HeadersPanel } from "./Options/Headers";
import { QueryParams } from "./Options/QueryParams";
import { Settings } from "./Options/Settings";
import { OptionsTab } from "./OptionTab";
import "./style.css";

export const OptionsPanel = () => {

  const [selectedTab, setSelectedTab] = useState("params");

  const renderOptionsUI = (tab: string) => {
    switch (tab) {
      case 'params':
        return <QueryParams />;
      case 'authorization':
        return <AuthPanel />;
      case 'headers':
        return <HeadersPanel />;
      case 'body':
        return <Body />;
      case 'settings':
        return <Settings />;
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
