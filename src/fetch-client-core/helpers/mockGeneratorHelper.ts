/**
 * UI-side mock generator helpers.
 * These operate on plain data already loaded in the Redux store
 * (no file-system / DB access) so they can run inside the WebView.
 */
import { ICollections } from "../types/sidebar.types";
import { IMockRoute } from "../types/mockServer.types";
import { v4 as uuidv4 } from "uuid";

export function generateMockFromCollection(
	collection: ICollections,
): IMockRoute[] {
	const routes: IMockRoute[] = [];

	function processItems(items: any[]): void {
		if (!Array.isArray(items)) { return; }
		for (const item of items) {
			if (item.type === "folder") {
				processItems(item.data ?? []);
				continue;
			}

			const method = (
				item.method ?? "get"
			).toUpperCase() as IMockRoute["method"];
			let routePath = "/";
			try {
				const url: string = item.url ?? "";
				const parsed = new URL(
					url.startsWith("http")
						? url
						: `http://localhost${url.startsWith("/") ? url : "/" + url}`,
				);
				routePath = parsed.pathname || "/";
			} catch {
				routePath = "/";
			}

			routes.push({
				id: uuidv4(),
				name: item.name || `${method} ${routePath}`,
				method,
				path: routePath.split("?")[0] || "/",
				statusCode: 200,
				bodyType: "json",
				body: JSON.stringify({ message: "Mock response" }, null, 2),
				headers: [{ key: "Content-Type", value: "application/json" }],
				delayMs: 0,
				isEnabled: true,
				bodyMatcher: {
					enabled: false,
					matchType: "none",
					value: ""
				}
			});
		}
	}

	processItems(collection.data ?? []);

	// Deduplicate by method+path
	const seen = new Set<string>();
	return routes.filter((r) => {
		const key = `${r.method}:${r.path}`;
		if (seen.has(key)) { return false; }
		seen.add(key);
		return true;
	});
}
