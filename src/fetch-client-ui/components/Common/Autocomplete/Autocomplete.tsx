import React, { useState } from "react";
import "./style.css";

export interface IAutocompleteProps {
  id: string;
  value: string;
  suggestions: string[];
  className?: string;
  maxLength?: number;
  disabled: boolean;
  onSelect: any;
  placeholder: string;
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

  const onChange = (e: any) => {
    const { suggestions } = props;
    const userInput = e.currentTarget.value;

    const filteredSuggestions = suggestions.filter(
      suggestion =>
        suggestion.toLowerCase().indexOf(userInput.toLowerCase()) > -1
    );

    setactiveSuggestion(0);
    setFilteredSuggestions(filteredSuggestions);
    setShowSuggestions(true);
    props.onSelect(e.target.value);
  };

  const onMouseDown = (e: any) => {
    e.preventDefault();
    setactiveSuggestion(0);
    setFilteredSuggestions([]);
    setShowSuggestions(false);
    props.onSelect(e.currentTarget.innerText);
  };

  const onKeyDown = (e: any) => {

    if (e.keyCode === 13) {
      setactiveSuggestion(0);
      setShowSuggestions(false);
      props.onSelect(filteredSuggestions[activeSuggestion]);
    } else if (e.keyCode === 38) {
      if (activeSuggestion === 0) {
        return;
      }
      setactiveSuggestion(activeSuggestion - 1);
    }
    else if (e.keyCode === 40) {
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
      <input
        id={props.id}
        type="text"
        className={props.className}
        onChange={onChange}
        onKeyDown={onKeyDown}
        value={props.value}
        onBlur={onBlurEvent}
        disabled={props.disabled}
        onFocus={onFocus}
        placeholder={props.placeholder}
      />
      {suggestionsListComponentRender()}
    </>
  );
};