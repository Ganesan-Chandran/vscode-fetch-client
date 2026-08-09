import React from "react";
import PanelLayout from "../Common/Layout/panelLayout";

export function withPanelLayout<P extends object>(
    Component: React.ComponentType<P>,
    title: React.ReactNode,
) {
    const Wrapped: React.FC<P> = (props) => (
        <PanelLayout title={title}>
            <Component {...props} />
        </PanelLayout>
    );

    Wrapped.displayName = `withPanelLayout(${Component.displayName || Component.name || "Component"})`;

    return Wrapped;
}
