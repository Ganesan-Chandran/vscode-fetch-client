import React, { useState } from "react";
import { IVariable } from "../../SideBar/redux/types";
import { TextEditor } from "../TextEditor/TextEditor";
import "./style.css";

export interface IAutocompleteProps {
	id: string;
	value: string;
	suggestions: string[];
	className?: string;
	disabled: boolean;
	onSelect: any;
	placeholder: string;
	selectedVariable: IVariable;
}

export const Autocomplete = (props: IAutocompleteProps) => {
	const [activeSuggestion, setactiveSuggestion] = useState(0);
	const [filteredSuggestions, setFilteredSuggestions] = useState([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [topPosition, setTopPosition] = useState("");
	const [width, setWidth] = useState("");

	const styles = {
		topStyle: {
			top: topPosition + "px",
			width: width + "px",
			zIndex: 1
		} as React.CSSProperties,
	};

	function onFocus() {
		let element = document.getElementById(props.id);
		if (element) {
			let rect = element.getBoundingClientRect();
			setTopPosition(rect.bottom.toString());
			setWidth(element.offsetWidth.toString());
		}
	}

	const onChange = (value: string, existingValue: string) => {
		if (value === existingValue) {
			return;
		}

		const { suggestions } = props;

		const filteredSuggestions = suggestions.filter(
			suggestion =>
				suggestion.toLowerCase().indexOf(value.toLowerCase()) > -1
		);

		setactiveSuggestion(0);
		setFilteredSuggestions(filteredSuggestions);
		setShowSuggestions(true);
		props.onSelect(value);
	};

	const onMouseDown = (e: any) => {
		e.preventDefault();
		setactiveSuggestion(0);
		setFilteredSuggestions([]);
		setShowSuggestions(false);
		props.onSelect(e.currentTarget.innerText);
	};

	const onKeyDown = (keyCode: number) => {

		if (keyCode === 13) {
			setactiveSuggestion(0);
			setShowSuggestions(false);
			props.onSelect(filteredSuggestions[activeSuggestion]);
		} else if (keyCode === 38) {
			if (activeSuggestion === 0) {
				return;
			}
			setactiveSuggestion(activeSuggestion - 1);
		}
		else if (keyCode === 40) {
			if (activeSuggestion - 1 === filteredSuggestions.length) {
				return;
			}
			setactiveSuggestion(activeSuggestion + 1);
		}
	};

	function suggestionsListComponentRender() {
		let suggestionsListComponent: any;

		if (showSuggestions && props.value) {
			if (filteredSuggestions.length) {
				suggestionsListComponent = (
					<ul className="suggestions" style={styles.topStyle}>
						{filteredSuggestions.map((suggestion, index) => {
							return (
								<li className={index === activeSuggestion ? "suggestion-active" : ""} key={suggestion} onMouseDown={onMouseDown}>
									{suggestion}
								</li>
							);
						})}
					</ul>
				);
			} else {
				suggestionsListComponent = (
					<></>
				);
			}
		}

		return suggestionsListComponent;
	}

	function onBlurEvent() {
		setactiveSuggestion(0);
		setShowSuggestions(false);
	}

	return (
		<>
			<div id={props.id}>
				{
					props.selectedVariable.id && <TextEditor
						varWords={props.selectedVariable.data.map(item => item.key)}
						placeholder={props.placeholder}
						onChange={(val) => onChange(val, props.value)}
						value={props.value}
						onKeyPress={onKeyDown}
						onBlur={onBlurEvent}
						disabled={props.disabled}
						onFocus={onFocus}
						focus={false}
					/>
				}
			</div>
			{suggestionsListComponentRender()}
		</>
	);
};
