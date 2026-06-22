import { HeadersPanel } from '.';
import { IVariable } from '../../../../../../fetch-client-core/types/sidebar.types';
import React from 'react';

export interface IParentHeaderProps {
	selectedVariable: IVariable;
}

export const ParentHeadersPanel = (props: IParentHeaderProps) => {
	return (
		<HeadersPanel selectedVariable={props.selectedVariable} />
	);
};
