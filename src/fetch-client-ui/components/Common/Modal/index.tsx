import React from 'react';
import './style.css';

export const Modal = ({ show, children }) => {
	const showHideClassName = show ? "modal display-block" : "modal display-none";

	return (
		<div className={showHideClassName}>
			<section className="modal-main">
				<div id="divSpinner" className="popup loading"></div>
				<div className="popup-loading-text">{children}</div>
			</section>
		</div>
	);
};
