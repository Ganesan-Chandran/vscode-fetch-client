import React from "react";

export function getPlusIconSVG(toolTip: string, className: string, onContextMenu: React.MouseEventHandler<SVGSVGElement>, onClick: React.MouseEventHandler<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className={className} onContextMenu={onContextMenu} onClick={onClick}>
      <title>{toolTip}</title>
      <path d="M14.672 6.598H9.539v-5.13a1.467 1.467 0 10-2.934 0v5.134H1.473A1.47 1.47 0 00.43 9.113c.265.27.632.438 1.039.438h5.136v5.12c0 .407.165.778.43 1.04.266.27.633.434 1.035.434a1.47 1.47 0 001.47-1.473V9.55h5.132c.812 0 1.469-.664 1.469-1.477 0-.812-.657-1.476-1.47-1.476zm0 0">
        <title>{toolTip}</title>
      </path>
    </svg>
  );
}

export function getColFolDotMenu(id: string, toolTip: string, className: string, onContextMenu: React.MouseEventHandler<SVGSVGElement>, onClick: React.MouseEventHandler<SVGSVGElement>) {
  return (<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" className={className} id={id} onContextMenu={onContextMenu} onClick={onClick}>
    <title>{toolTip}</title>
    <circle cx="8" cy="2.5" r="0.75"></circle>
    <circle cx="8" cy="8" r="0.75"></circle>
    <circle cx="8" cy="13.5" r="0.75"></circle>
  </svg>);
}
