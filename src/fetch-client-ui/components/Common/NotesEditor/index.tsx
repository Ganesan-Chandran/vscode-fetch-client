import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { DefaultEditor } from 'react-simple-wysiwyg';
import { IRootState } from '../../../reducer/combineReducer';
import { Actions } from '../../RequestUI/redux';
import { getDataFromHTML, notesMaxLimit } from '../helper';
import "./style.css";

export const NotesEditor = () => {

    const dispatch = useDispatch();
    const [count, _setCount] = useState(0);
    const refCount = useRef(count);
    const setCount = (data: number) => {
        refCount.current = data;
        _setCount(refCount.current);
    };

    const { notes } = useSelector((state: IRootState) => state.requestData);

    useEffect(() => {
        const linkElement = document.querySelector('button[title="Link"]');
        if (linkElement) {
            linkElement.remove();
        }

        const htmlFormatElement = document.querySelector('button[title="HTML mode"]');
        if (htmlFormatElement) {
            htmlFormatElement.remove();
        }

        if (notes) {
            const data = getDataFromHTML(notes);
            setCount(data.length);
        }

    }, []);

    function onChange(e: any) {
        const data = getDataFromHTML(e.target.value);
        dispatch(Actions.SetNotesAction(e.target.value));
        setCount(data.length);
    }

    return (
        <div className="notes-editor-panel">
            <DefaultEditor value={notes} onChange={onChange} />
            <div className={count > notesMaxLimit ? "error-text notes-text" : "notes-text"}>{count}/{notesMaxLimit} {count > notesMaxLimit ? " (Exceed the maximum character limit. Notes won't be saved.)" : ""}</div>
        </div>
    );
};