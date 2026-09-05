import React, { useMemo, useState } from "react";
import "./style.css";
import { categoryLabels, devTools } from "./registry";
import type { DevToolCategory } from "./devTools.types";

const categoryOrder: DevToolCategory[] = [
    "encoding",
    "json",
    "generators",
    "api",
    "security",
    "testing",
];

const DevTools: React.FC = () => {
    const [selectedId, setSelectedId] = useState(devTools[0].id);

    const selected = useMemo(
        () => devTools.find((tool) => tool.id === selectedId) ?? devTools[0],
        [selectedId],
    );

    const Tool = selected.component;

    return (
        <div className="dev-tools">
            <aside className="dev-tools-sidebar">
                {categoryOrder.map((category) => {
                    const tools = devTools.filter((tool) => tool.category === category);
                    return (
                        <div key={category}>
                            <div className="dev-tools-category">
                                {categoryLabels[category]}
                            </div>

                            {tools.map((tool) => (
                                <button
                                    type="button"
                                    key={tool.id}
                                    className={`dev-tools-item ${tool.id === selected.id ? "active" : ""
                                        }`}
                                    title={tool.description}
                                    onClick={() => setSelectedId(tool.id)}
                                >
                                    <span>{"  "}</span>
                                    <span>{tool.title}</span>
                                </button>
                            ))}
                        </div>
                    );
                })}
            </aside>

            <main className="dev-tools-content">
                <Tool />
            </main>
        </div>
    );
};

export default DevTools;
