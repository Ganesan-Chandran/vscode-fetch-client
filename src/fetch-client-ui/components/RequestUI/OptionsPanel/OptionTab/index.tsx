import React from 'react';
import { useSelector } from "react-redux";
import { IRootState } from "../../../../reducer/combineReducer";
import { requestOptions } from "../consts";
import { ReactComponent as MenuLogo } from '../../../../../../icons/settings.svg';

export const OptionsTab = (props: any) => {

  const { selectedTab, setSelectedTab } = props;

  const { headers } = useSelector((state: IRootState) => state.requestData);

  const settingsCss = () => {
    return selectedTab === "settings" ? "settings-menu settings-menu-clicked" : "settings-menu";
  };

  return (
    <div className="tab-options">
      {
        requestOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedTab(option.value)}
            className={
              selectedTab === option.value
                ? "option option-selected"
                : "option"
            }
          >
            <div className="option-names">
              {option.name}
              {option.value === "headers" ? (
                <div className="header-count">
                  (
                  {
                    headers.length
                  }
                  )
                </div>
              ) : null}
            </div>
          </button>
        ))}
        <div className="settings-menu-panel"><MenuLogo className={settingsCss()} title="Menu" onClick={() => {setSelectedTab("settings");}} /></div>
    </div>
  );
};