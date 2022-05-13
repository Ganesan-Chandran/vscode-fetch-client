import React from "react";
import "./style.css";

export const None = () => {
  return (
    <div className="none-panel">
      <div className="hr-container"><hr /></div>
      <div className="none-text">{"This request does not have a body"}</div>
    </div>
  );
};