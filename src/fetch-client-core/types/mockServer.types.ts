export type MockMethod =
	| "GET"
	| "POST"
	| "PUT"
	| "PATCH"
	| "DELETE"
	| "OPTIONS"
	| "HEAD"
	| "*";

export type MockBodyType = "json" | "text" | "xml" | "html" | "none";

export type MockServerStatus = "running" | "stopped" | "error";

export type MockBodyMatchType = "none" | "exact" | "contains" | "json";

export interface IMockHeader {
	key: string;
	value: string;
}

export interface IMockBodyMatcher {
	enabled: boolean;
	matchType: MockBodyMatchType;
	value: string;
}

export interface IMockRoute {
	id: string;
	name: string;
	method: MockMethod;
	path: string;
	statusCode: number;
	bodyType: MockBodyType;
	body: string;
	headers: IMockHeader[];
	delayMs: number;
	isEnabled: boolean;
	bodyMatcher?: IMockBodyMatcher;
}

export interface IMockServer {
	id: string;
	name: string;
	port: number;
	description: string;
	createdTime: string;
	modifiedTime: string;
	routes: IMockRoute[];
}

export interface IMockRequestLog {
	id: string;
	timestamp: string;
	method: string;
	path: string;
	matchedRouteId: string | null;
	statusCode: number;
	durationMs: number;
}
