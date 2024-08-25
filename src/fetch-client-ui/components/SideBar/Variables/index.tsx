import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { ReactComponent as DotsLogo } from '../../../../../icons/dots.svg';
import { requestTypes } from "../../../../utils/configuration";
import { IRootState } from "../../../reducer/combineReducer";
import vscode from "../../Common/vscodeAPI";
import { IVariable } from "../redux/types";
import "./style.css";

export interface IVariableProps {
	filterCondition: string;
	isLoading: boolean;
	sort: number;
}

export const VariableSection = (props: IVariableProps) => {

	const { variable } = useSelector((state: IRootState) => state.sideBarData);

	const [ddPosition, setPosition] = useState("");
	const [selectedItem, setSelectedItem] = useState("");
	const [currentIndex, _setCurrentIndex] = useState(-1);

	const refIndex = useRef(currentIndex);
	const setCurrentIndex = (data: number) => {
		refIndex.current = data;
		_setCurrentIndex(refIndex.current);
	};

	const [variableState, _setVariableState] = useState<IVariable[]>(variable);
	const refVariable = useRef(variableState);
	const setVariableState = (data: IVariable[]) => {
		refVariable.current = data;
		_setVariableState(refVariable.current);
	};

	const moreMenuWrapperRef = useRef([]);

	const styles = {
		bottomStyle: {
			bottom: ddPosition
		} as React.CSSProperties,
	};

	function openMoreMenu(evt: any, index: number) {
		evt.preventDefault();
		evt.stopPropagation();
		openContextMenu(index);
	}

	function openContextMenu(index: number) {
		if (currentIndex === index) {
			setCurrentIndex(-1);
			return;
		}

		let element = document.getElementById("three-dots-" + index);
		if (element) {
			let rect = element.getBoundingClientRect();
			let viewportHeight = window.innerHeight;
			let total = rect.top + 100;
			if (total > viewportHeight) {
				setPosition("100%");
			} else {
				setPosition("");
			}
		}
		setCurrentIndex(index);
	}

	function onRename(evt: React.MouseEvent<HTMLElement>, id: string) {
		performOperation(evt, requestTypes.renameVariableRequest, id);
	}

	function onDelete(evt: React.MouseEvent<HTMLElement>, id: string, name: string) {
		performOperation(evt, requestTypes.deleteVariableRequest, id, name);
	}

	function onExport(evt: React.MouseEvent<HTMLElement>, vars: IVariable) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({ type: requestTypes.exportVariableRequest, vars: vars });
		setCurrentIndex(-1);
	}

	function onClickItem(evt: React.MouseEvent<HTMLElement>, id: string) {
		setSelectedItem(id);
		performOperation(evt, requestTypes.openVariableItemRequest, id);
	}

	function performOperation(evt: React.MouseEvent<HTMLElement>, types: string, id: string, name?: string) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({ type: types, data: id, name: name });
		setCurrentIndex(-1);
	}

	function onActive(evt: React.MouseEvent<HTMLElement>, id: string, status: boolean) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({ type: requestTypes.activeVariableRequest, data: { id: id, status: status } });
		setCurrentIndex(-1);
	}

	function onDuplicate(evt: React.MouseEvent<HTMLElement>, id: string) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({ type: requestTypes.duplicateVariableRequest, id: id });
		setCurrentIndex(-1);
	}

	function handleClickOutside(evt: any) {
		if (moreMenuWrapperRef.current && moreMenuWrapperRef.current[refIndex.current] && !moreMenuWrapperRef.current[refIndex.current].contains(evt.target)) {
			setCurrentIndex(-1);
		}
	}

	useEffect(() => {
		document.addEventListener("mousedown", handleClickOutside, false);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside, false);
		};
	}, []);

	useEffect(() => {
		if (props.sort === 0) {
			setVariableState(variable);
		} else if (props.sort === 1) {
			if (variableState?.length > 0) {
				setVariableState([...variable].sort((a, b) => b.name !== "Global" && a.name.localeCompare(b.name)));
			}
		} else {
			if (variableState?.length > 0) {
				setVariableState([...variable].sort((a, b) => b.name !== "Global" && b.name.localeCompare(a.name)));
			}
		}
	}, [props.sort, variable, variable.length]);

	function onItemRightClick(e: any, index: number) {
		e.preventDefault();
		e.stopPropagation();
		openContextMenu(index);
	}

	function getVariableItems(item: IVariable, index: number) {
		return (
			<div key={"variable_" + item.id} className={selectedItem === item.id ? "activity-items selected-item" : "activity-items"} onContextMenu={(e) => onItemRightClick(e, index)} onClick={(e) => onClickItem(e, item.id)}>
				<div className="activity-item-row-1 variable-row">
					<label className="var-item-name">{item.name}</label>
					{index === 0 && <label className="var-item-name">{item.isActive ? "  ✔️" : "  ❌"}</label>}
					<div className={index === currentIndex ? "more-icon display-block" : "more-icon"} ref={el => moreMenuWrapperRef.current[index] = el}>
						<DotsLogo id={"three-dots-" + item.id} onClick={(e) => openMoreMenu(e, index)} />
						<input type="checkbox" className="dd-input" checked={index === currentIndex} readOnly={true} />
						<div id={"drop-down-menu-" + item.id} className="dropdown-more" style={styles.bottomStyle}>
							{index !== 0 && <><button onClick={(e) => onRename(e, item.id)}>Rename</button>
								<button onClick={(e) => onDelete(e, item.id, item.name)}>Delete</button></>}
							<button onClick={(e) => onDuplicate(e, item.id)}>Duplicate</button>
							<div className="divider"></div>
							{index === 0 && !item.isActive && <button onClick={(e) => onActive(e, item.id, !item.isActive)}>{item.isActive ? "Set Inactive" : "Set Active"}</button>}
							<button onClick={(e) => onExport(e, item)}>Export</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	function getVariableBody() {
		if (props.filterCondition) {
			return (
				variableState
					.filter(el => el.name?.toLowerCase().includes(props.filterCondition))
					.map((item, index) => {
						return getVariableItems(item, index);
					})
			);
		} else {
			return (
				variableState.map((item, index) => {
					return getVariableItems(item, index);
				})
			);
		}
	}

	return (
		<>
			{
				props.isLoading ?
					<>
						<div id="divSpinner" className="spinner loading"></div>
						<div className="loading-history-text">{"Loading...."}</div>
					</>
					:
					history.length > 0 ?
						getVariableBody()
						:
						<div className="no-history-text">{"No Variable Available"}</div>
			}
		</>
	);
};
