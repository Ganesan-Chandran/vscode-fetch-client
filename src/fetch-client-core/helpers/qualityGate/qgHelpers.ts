import { ITableData } from "../../types/common.types";

export function getHeader(
	headers: ITableData[],
	name: string,
): string | undefined {
	return headers.find((h) => h.key?.toLowerCase() === name.toLowerCase())
		?.value;
}

export function safeParseJson(raw: unknown): Record<string, unknown> {
	if (raw && typeof raw === "object") {
		return raw as Record<string, unknown>;
	}
	if (typeof raw === "string" && raw.trim()) {
		try {
			return JSON.parse(raw);
		} catch {
			/* non-JSON body */
		}
	}
	return {};
}

export function parseSizeBytes(sizeStr: string): number {
	const cleanSizeStr = sizeStr.replace(/,/g, "");
	const sizeMul = cleanSizeStr.toUpperCase().includes("MB")
		? 1_048_576
		: cleanSizeStr.toUpperCase().includes("KB")
			? 1024
			: 1;
	return parseFloat(cleanSizeStr) * sizeMul;
}
