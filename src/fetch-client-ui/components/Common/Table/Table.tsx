import React from 'react';
import { HeadersKeys, HerdersValues, ITableData, TableType } from "./types";
import { ReactComponent as BinLogo } from '../../../../../icons/bin.svg';
import { Autocomplete } from '../Autocomplete/Autocomplete';
import { IVariable } from '../../SideBar/redux/types';
import { TextEditor } from '../TextEditor/TextEditor';
import "./style.css";

export interface TableProps {
  data: ITableData[];
  onSelectChange?: any;
  onRowAdd?: any;
  onRowUpdate?: any;
  deleteData?: any;
  readOnly: boolean;
  type?: TableType;
  placeholder?: { key: string, value: string }
  selectedVariable?: IVariable;
  highlightNeeded?: boolean;
  headers?: { key: string, value: string, value1?: string }
}

export const Table = (props: TableProps) => {
  const { data, onSelectChange, onRowAdd, onRowUpdate, deleteData, readOnly, selectedVariable } = props;

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
                  id={props.type + "_key_" + index.toString()}
                  value={row.key}
                  className={isEnabled(row, index) ? "table-input disabled" : "table-input"}
                  onSelect={(val: string) => index === data.length - 1 ? onRowAdd(val, index, true) : onRowUpdate(val, index, true)}
                  suggestions={HeadersKeys}
                  maxLength={100}
                  disabled={isEnabled(row, index) ? true : false}
                  placeholder="header"
                  selectedVariable={selectedVariable}
                />
              </td>
              <td>
                <Autocomplete
                  id={props.type + "_val_" + index.toString()}
                  value={row.value}
                  className={isEnabled(row, index) ? "table-input disabled" : "table-input"}
                  onSelect={(val: string) => index === data.length - 1 ? onRowAdd(val, index, false) : onRowUpdate(val, index, false)}
                  suggestions={HerdersValues}
                  maxLength={100}
                  disabled={isEnabled(row, index) ? true : false}
                  placeholder="value"
                  selectedVariable={selectedVariable}
                />
              </td>
            </>
            :
            <>
              <td>
                {
                  !props.highlightNeeded ?
                    <input
                      id={props.type + "_key_" + index.toString()}
                      className={props.type !== "resHeaders" && props.type !== "resCookies" ? (isEnabled(row, index) ? "table-input disabled" : "table-input") : "table-input"}
                      value={row.key}
                      onChange={(event) => index === data.length - 1 ? onRowAdd(event, index, true) : onRowUpdate(event, index, true)}
                      maxLength={100}
                      disabled={isEnabled(row, index) ? true : false}
                      placeholder={props.placeholder ? props.placeholder.key : "parameter"}
                    />
                    :
                    selectedVariable.id && <TextEditor
                      varWords={selectedVariable.data.map(item => item.key)}
                      placeholder={props.placeholder ? props.placeholder.key : "parameter"}
                      onChange={(event) => index === data.length - 1 ? onRowAdd(event, index, true) : onRowUpdate(event, index, true)}
                      value={row.key}
                      maxLength={100}
                      disabled={isEnabled(row, index) ? true : false}
                      focus={false}
                    />
                }
              </td>
              <td>
                {!props.highlightNeeded ?
                  <input
                    id={props.type + "_val_" + index.toString()}
                    className={props.type !== "resHeaders" && props.type !== "resCookies" ? (isEnabled(row, index) ? "table-input disabled" : "table-input") : "table-input"}
                    value={row.value}
                    onChange={(event) => index === data.length - 1 ? onRowAdd(event, index, false) : onRowUpdate(event, index, false)}
                    maxLength={100}
                    disabled={isEnabled(row, index) ? true : false}
                    placeholder={props.placeholder ? props.placeholder.value : "value"}
                  />
                  :
                  selectedVariable.id && <TextEditor
                    varWords={selectedVariable.data.map(item => item.key)}
                    placeholder={props.placeholder ? props.placeholder.value : "value"}
                    onChange={(event) => index === data.length - 1 ? onRowAdd(event, index, false) : onRowUpdate(event, index, false)}
                    value={row.value}
                    maxLength={100}
                    disabled={isEnabled(row, index) ? true : false}
                    focus={false}
                  />
                }
              </td>
            </>
        }
        {
          readOnly ?
            <></>
            :
            <td className="action-cell">
              {(row.key || row.value) && row.isFixed !== true ?
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
              <th className="action-cell"></th>
          }
          <th>{props.headers ? props.headers.key : "Key"}</th>
          <th>{props.headers ? props.headers.value : "Value"}</th>
          {
            readOnly ?
              <></>
              :
              <th className="action-cell"></th>
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