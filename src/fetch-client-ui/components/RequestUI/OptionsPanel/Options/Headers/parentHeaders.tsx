import React from 'react';
import { HeadersPanel } from '.';
import { IVariable } from '../../../../SideBar/redux/types';

export interface IParentHeaderProps {
  selectedVariable: IVariable;
}

export const ParentHeadersPanel = (props: IParentHeaderProps) => {
  return (
    <HeadersPanel selectedVariable={props.selectedVariable} />
  );
};