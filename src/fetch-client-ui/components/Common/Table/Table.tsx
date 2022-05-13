import React from 'react';
import { HeadersKeys, HerdersValues, ITableData, TableType } from "./types";
import { ReactComponent as BinLogo } from '../../../../../icons/bin.svg';
import "./style.css";
import { Autocomplete } from '../Autocomplete/Autocomplete';

export interface TableProps {
  data: ITableData[];
  onSelectChange?: any;
  onRowAdd?: any;
  onRowUpdate?: any;
  deleteData?: any;
  readOnly: boolean;
  type?: TableType;
  placeholder?: { key: string, value: string }
}

export const Table = (props: TableProps) => {
  const { data, onSelectChange, onRowAdd, onRowUpdate, deleteData, readOnly } = props;

  function isEnabled(row: ITableData, index: number): boolean {

    if (readOnly) {
      return true;
    }

    if (row.isFixed === true) {
      return true;
    }

    if (index === data.length - 1) {
      return false;
    }

    if (row.isChecked && index !== data.length - 1) {
      return false;
    }

    return true;
  }

  const tableRow = (row: ITableData, index: number) => {
    return (
      <tr key={index}>
        {
          readOnly ?
            <></>
            :
            <td className="action-cell">
              {index !== data.length - 1 ?
                <input type="checkbox"
                  checked={row.isChecked}
                  onChange={() => onSelectChange ? onSelectChange(index) : {}}
                  disabled={row.isFixed === true ? true : false}
                />
                :
                <></>
              }
            </td>
        }
        {
          props.type === "reqHeaders"
            ?
            <>
              <td>
                <Autocomplete
                  id={"key_" + index.toString()}
                  value={row.key}
                  className={isEnabled(row, index) ? "table-input disabled" : "table-input"}
                  onSelect={(val: string) => index === data.length - 1 ? onRowAdd(val, index, true) : onRowUpdate(val, index, true)}
                  suggestions={HeadersKeys}
                  maxLength={100}
                  disabled={isEnabled(row, index) ? true : false}
                  placeholder="header"
                />
              </td>
              <td>
                <Autocomplete
                  id={"val_" + index.toString()}
                  value={row.value}
                  className={isEnabled(row, index) ? "table-input disabled" : "table-input"}
                  onSelect={(val: string) => index === data.length - 1 ? onRowAdd(val, index, false) : onRowUpdate(val, index, false)}
                  suggestions={HerdersValues}
                  maxLength={100}
                  disabled={isEnabled(row, index) ? true : false}
                  placeholder="value"
                />
              </td>
            </>
            :
            <>
              <td>
                <input
                  id={"key_" + index.toString()}
                  className={props.type !== "resHeaders" ? (isEnabled(row, index) ? "table-input disabled" : "table-input") : "table-input"}
                  value={row.key}
                  onChange={(event) => index === data.length - 1 ? onRowAdd(event, index, true) : onRowUpdate(event, index, true)}
                  maxLength={100}
                  disabled={isEnabled(row, index) ? true : false}
                  placeholder={props.placeholder ? props.placeholder.key : "parameter"}
                />
              </td>
              <td>
                <input
                  id={"val_" + index.toString()}
                  className={props.type !== "resHeaders" ? (isEnabled(row, index) ? "table-input disabled" : "table-input") : "table-input"}
                  value={row.value}
                  onChange={(event) => index === data.length - 1 ? onRowAdd(event, index, false) : onRowUpdate(event, index, false)}
                  maxLength={100}
                  disabled={isEnabled(row, index) ? true : false}
                  placeholder={props.placeholder ? props.placeholder.value : "value"}
                />
              </td>
            </>
        }
        {
          readOnly ?
            <></>
            :
            <td className="action-cell">
              {index !== data.length - 1 && row.isFixed !== true ?
                <BinLogo className="delete-button" onClick={() => deleteData(index)} />
                :
                <></>
              }
            </td>
        }
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
          {
            readOnly ?
              <></>
              :
              <th></th>
          }
          <th>{props.placeholder ? props.placeholder.key.toUpperCase() : "KEY"}</th>
          <th>{props.placeholder ? props.placeholder.value.toUpperCase() : "VALUE"}</th>
          {
            readOnly ?
              <></>
              :
              <th></th>
          }
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