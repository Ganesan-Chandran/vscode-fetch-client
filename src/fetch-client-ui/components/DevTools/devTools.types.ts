import React from "react";

export type DevToolCategory =
    | "encoding"
    | "json"
    | "generators"
    | "api"
    | "security"
    | "testing";

export interface IDevTool {
    id: string;
    title: string;
    category: DevToolCategory;
    description: string;
    icon?: string;
    component: React.ComponentType;
}

export interface IRandomDataColumn {
    column: string;
    type: string;
    format?: string;
    min?: number;
    max?: number;
    pattern?: string;
}

export interface IGeneratedData {
    rows: Record<string, string>[];
    columns: string[];
}

export interface IHttpHeader {
    name: string;
    value: string;
}
