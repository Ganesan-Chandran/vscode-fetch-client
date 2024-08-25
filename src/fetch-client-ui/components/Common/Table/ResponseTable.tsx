import React from 'react';
import { TableProps } from './Table';
import "./style.css";
import { ITableData } from "./types";

export const ResponseTable = (props: TableProps) => {
	const { data } = props;

	const tableRow = (row: ITableData, index: number) => {
		return (
			<tr key={index}>
				<td>
					<div id={props.type + "_key_" + index.toString()} className="res-table-input">
						{row.key}
					</div>
				</td>
				<td>
					<div id={props.type + "_val_" + index.toString()} className="res-table-input">
						{row.value.split(";")[0]}
					</div>
				</td>
				{props.type === "resCookies" && <td>
					<div id={props.type + "_val_1_" + index.toString()} className="res-table-input">
						{row.value.substring(row.value.indexOf(";") + 1)}
					</div>
				</td>}
			</tr>
		);
	};

	const makeTable = (data: ITableData[]) => {
		return (
			data.map((item: ITableData, index: number) => {
				return tableRow(item, index);
			})
		);
	};

	return (
		<table className="option-table">
			<thead>
				<tr>
					<th>{props.headers ? props.headers.key : "Key"}</th>
					<th>{props.headers ? props.headers.value : "Value"}</th>
					{props.type === "resCookies" && <th>{props.headers ? props.headers.value1 : "Details"}</th>}
				</tr>
			</thead>
			<tbody>
				{
					makeTable(data)
				}
			</tbody>
		</table>
	);
};
