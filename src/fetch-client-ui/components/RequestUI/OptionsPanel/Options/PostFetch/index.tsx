import { OptionsTab } from "../../OptionTab";
import { postFetchOptions } from "../../consts";
import { TestPanel } from "../../../../TestUI/TestPanel";
import React, { useState } from "react";
import ResToVariables from "../../../../Variables/resToVar";

export const PostFetch = () => {

  const [selectedTab, setSelectedTab] = useState("tests");

  const renderOptionsUI = (tab: string) => {
    switch (tab) {
      case 'setvar':
        return <ResToVariables />;
      default:
        return <TestPanel />;
    }
  };

  return (
    <div>
      <OptionsTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} options={postFetchOptions} settings={false} />
      <div className="options-tab-panel">
        {renderOptionsUI(selectedTab)}
      </div>
    </div>
  );
};