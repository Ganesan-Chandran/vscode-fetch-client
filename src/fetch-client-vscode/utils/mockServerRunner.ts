import {
	IMockRequestLog,
	IMockRoute,
	IMockServer,
	MockServerStatus,
} from "../../fetch-client-core/types/mockServer.types";
import { randomBytes } from "crypto";
import { writeLog } from "../../fetch-client-core/helpers/logger/logger";
import * as http from "http";
import Router from "find-my-way";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const MIN_PORT = 1024;
export const MAX_PORT = 9999;
export const MAX_CONCURRENT_SERVERS = 5;
const MAX_LOG_ENTRIES = 200;
const MAX_REQUEST_BODY_SIZE = 1_048_576; // 1 MB

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------
const activeServers = new Map<string, http.Server>();
const serverStatus = new Map<string, MockServerStatus>();
const requestLogs = new Map<string, IMockRequestLog[]>();

export type LogCallback = (serverId: string, log: IMockRequestLog) => void;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface StartResult {
	success: boolean;
	error?: string;
}

export function startMockServer(
	server: IMockServer,
	onLog: LogCallback,
): Promise<StartResult> {
	if (activeServers.has(server.id)) {
		return Promise.resolve({ success: true });
	}

	if (activeServers.size >= MAX_CONCURRENT_SERVERS) {
		return Promise.resolve({
			success: false,
			error: `Maximum of ${MAX_CONCURRENT_SERVERS} concurrent mock servers reached.`,
		});
	}

	if (server.port < MIN_PORT || server.port > MAX_PORT) {
		return Promise.resolve({
			success: false,
			error: `Port must be between ${MIN_PORT} and ${MAX_PORT}.`,
		});
	}

	const router = buildRouter(server, onLog);

	const httpServer = http.createServer((req, res) => {
		// Read body (needed for POST/PUT/PATCH matching) but ignore content
		let body = "";

		req.on("data", chunk => {
			body += chunk.toString();

			if (body.length > MAX_REQUEST_BODY_SIZE) {
				req.destroy();
			}
		});

		req.on("end", () => {
			(req as any).rawBody = body;
			router.lookup(req, res);
		});

		req.on("error", () => {
			try {
				res.writeHead(400);
				res.end();
			} catch {
				// ignore
			}
		});
	});

	httpServer.on("close", () => {
		activeServers.delete(server.id);
		serverStatus.set(server.id, "stopped");
		writeLog(`info::Mock server ${server.name} stopped`);
	});

	httpServer.on("error", (err) => {
		serverStatus.set(server.id, "error");
		writeLog(`error::Mock server ${server.name}: ${err.message}`);
	});

	return new Promise((resolve) => {
		httpServer.once("error", (err: NodeJS.ErrnoException) => {
			writeLog(`error::startMockServer(${server.id}): ${err.message}`);
			if (err.code === "EADDRINUSE") {
				resolve({
					success: false,
					error: `Port ${server.port} is already in use.`,
				});
			} else {
				resolve({ success: false, error: err.message });
			}
		});

		httpServer.listen(server.port, "127.0.0.1", () => {
			activeServers.set(server.id, httpServer);
			serverStatus.set(server.id, "running");
			requestLogs.set(server.id, []);
			resolve({ success: true });
		});
	});
}

export function stopMockServer(serverId: string): void {
	const srv = activeServers.get(serverId);
	if (srv) {
		srv.close(() => {
			writeLog(`info::stopMockServer(${serverId}): server stopped`);
		});
		activeServers.delete(serverId);
		serverStatus.set(serverId, "stopped");
	}
}

export function stopAllMockServers(): void {
	for (const id of activeServers.keys()) {
		stopMockServer(id);
	}
}

export function getServerStatus(serverId: string): MockServerStatus {
	return serverStatus.get(serverId) ?? "stopped";
}

export function getRequestLogs(serverId: string): IMockRequestLog[] {
	return requestLogs.get(serverId) ?? [];
}

export function clearRequestLogs(serverId: string): void {
	requestLogs.set(serverId, []);
}

export function getActiveServerCount(): number {
	return activeServers.size;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface IRouteGroup {
	method: Router.HTTPMethod;
	path: string;
	routes: IMockRoute[];
}

function buildRouteGroups(routes: IMockRoute[]): IRouteGroup[] {
	const groups = new Map<string, IRouteGroup>();

	for (const route of routes) {
		const methods =
			route.method === "*"
				? ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
				: [route.method];

		for (const method of methods) {
			const key = `${method}:${route.path}`;

			let group = groups.get(key);

			if (!group) {
				group = {
					method: method as Router.HTTPMethod,
					path: route.path,
					routes: [],
				};

				groups.set(key, group);
			}

			group.routes.push(route);
		}
	}

	return [...groups.values()];
}

function buildRouter(server: IMockServer, onLog: LogCallback) {
	const router = Router({ defaultRoute: defaultHandler(server.id, onLog) });

	const enabledRoutes = server.routes.filter(r => r.isEnabled);

	const routeGroups = buildRouteGroups(enabledRoutes);

	for (const group of routeGroups) {
		try {
			router.on(
				group.method,
				group.path,
				makeHandler(group, server.id, onLog),
			);
		} catch (err) {
			writeLog(
				`warn::buildRouter: skipping invalid route "${group.method} ${group.path}": ${err}`,
			);
		}
	}

	return router;
}

function findMatchedRoute(
	req: http.IncomingMessage,
	routes: IMockRoute[],
): IMockRoute | undefined {

	// First try routes with body matcher enabled
	for (const route of routes) {
		if (
			route.bodyMatcher?.enabled &&
			isBodyMatched(req, route)
		) {
			return route;
		}
	}

	// Fallback to routes without body matcher
	for (const route of routes) {
		if (!route.bodyMatcher?.enabled) {
			return route;
		}
	}

	return undefined;
}

function makeHandler(
	group: IRouteGroup,
	serverId: string,
	onLog: LogCallback,
): http.RequestListener {

	return (req, res) => {

		const route = findMatchedRoute(req, group.routes);

		if (!route) {
			return defaultHandler(serverId, onLog)(req, res);
		}

		const start = Date.now();

		const respond = () => {
			const contentType = bodyContentType(route.bodyType);

			res.writeHead(route.statusCode, {
				"Content-Type": contentType,
				"Access-Control-Allow-Origin": "*",
				"X-Mock-Server": "Fetch-Client",
				...headersObject(route.headers),
			});

			res.end(route.bodyType === "none" ? "" : route.body,);

			const log = buildLog(
				req,
				route.statusCode,
				route.id,
				Date.now() - start,
			);

			pushLog(serverId, log);
			onLog(serverId, log);
		};

		if (route.delayMs > 0) {
			setTimeout(respond, route.delayMs);
		} else {
			respond();
		}
	};
}

function isBodyMatched(
	req: http.IncomingMessage,
	route: IMockRoute,
): boolean {

	if (!route.bodyMatcher?.enabled) {
		return true;
	}

	const requestBody = ((req as any).rawBody ?? "").trim();
	const matcher = route.bodyMatcher;

	switch (matcher.matchType) {

		case "none":
			return true;

		case "exact":
			return requestBody === matcher.value;

		case "contains":
			return requestBody.includes(matcher.value);

		case "json":
			return matchJson(requestBody, matcher.value);

		default:
			return true;
	}
}

function matchJson(
	requestBody: string,
	expectedBody: string,
): boolean {

	try {

		const actual = JSON.parse(requestBody);
		const expected = JSON.parse(expectedBody);

		return deepContains(actual, expected);

	} catch {
		return false;
	}
}

function deepContains(
	actual: any,
	expected: any,
): boolean {

	if (typeof expected !== "object" || expected === null) {
		return actual === expected;
	}

	if (Array.isArray(expected)) {

		if (!Array.isArray(actual)) {
			return false;
		}

		return expected.every((v, i) =>
			deepContains(actual[i], v)
		);
	}

	return Object.keys(expected).every(key =>
		deepContains(actual[key], expected[key])
	);
}

function defaultHandler(
	serverId: string,
	onLog: LogCallback,
): http.RequestListener {
	return (req, res) => {
		const start = Date.now();
		res.writeHead(404, {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
			"X-Mock-Server": "Fetch-Client",
		});
		res.end(JSON.stringify({ error: "No matching mock route found." }));

		const log = buildLog(req, 404, null, Date.now() - start);
		pushLog(serverId, log);
		onLog(serverId, log);
	};
}

function buildLog(
	req: http.IncomingMessage,
	statusCode: number,
	matchedRouteId: string | null,
	durationMs: number,
): IMockRequestLog {
	return {
		id: randomBytes(8).toString("hex"),
		timestamp: new Date().toISOString(),
		method: req.method ?? "GET",
		path: req.url ?? "/",
		matchedRouteId,
		statusCode,
		durationMs,
	};
}

function pushLog(serverId: string, log: IMockRequestLog): void {
	const logs = requestLogs.get(serverId) ?? [];
	if (logs.length >= MAX_LOG_ENTRIES) {
		logs.shift();
	}
	logs.push(log);
	requestLogs.set(serverId, logs);
}

function bodyContentType(bodyType: IMockRoute["bodyType"]): string {
	switch (bodyType) {
		case "json":
			return "application/json";
		case "xml":
			return "application/xml";
		case "html":
			return "text/html";
		case "text":
			return "text/plain";
		default:
			return "text/plain";
	}
}

function headersObject(headers: IMockRoute["headers"]): Record<string, string> {
	const result: Record<string, string> = {};
	for (const h of headers) {
		if (h.key.trim()) {
			result[h.key.trim()] = h.value;
		}
	}
	return result;
}
