import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface IDropdownPortalProps {
  id: string;
  open: boolean;
  children: React.ReactNode;
}

export const DropdownPortal = ({ id, open, children }: IDropdownPortalProps) => {
	const [style, setStyle] = useState<React.CSSProperties>({
		position: "fixed",
		top: -9999,
		left: -9999,
		visibility: "hidden",
	});
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) {
			setStyle({ position: "fixed", top: -9999, left: -9999, visibility: "hidden" });
			return;
		}

		const trigger = document.getElementById("three-dots-" + id);
		const menu = menuRef.current;
		if (!trigger || !menu) {return;}

		requestAnimationFrame(() => {
			const rect = trigger.getBoundingClientRect();
			const menuHeight = menu.offsetHeight;
			const menuWidth = menu.offsetWidth || 140;

			const spaceBelow = window.innerHeight - rect.bottom;
			const spaceAbove = rect.top;
			const flip = menuHeight > spaceBelow && menuHeight <= spaceAbove;

			setStyle({
				position: "fixed",
				top: flip ? rect.top - menuHeight : rect.bottom,
				left: rect.right - menuWidth,
				visibility: "visible",
			});
		});
	}, [open, id]);

	if (!open) {return null;}

	return createPortal(
		<div id={"drop-down-menu-" + id} className="dropdown-more" ref={menuRef} style={style}>
			{children}
		</div>,
		document.body
	);
};
