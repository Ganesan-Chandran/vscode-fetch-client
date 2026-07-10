import { MIMETypes } from "../consts/mimetype.consts";
import { responseTypes } from "../consts/requestTypes.consts";
import { ITableData } from "../types/common.types";

/** MIME types that map to plain-text / structured-text; treated as non-binary. */
const TEXT_CONTENT_TYPES = [
  "application/json",
  "application/ld+json",
  "application/vnd.api+json",
  "application/xml",
  "text/javascript",
  "application/javascript",
  "text/html",
  "text/css",
  "text/plain",
] as const;

// ---------------------------------------------------------------------------
// Content-type helpers
// ---------------------------------------------------------------------------

export function isFileType(headers: ITableData[]): boolean {
  const item = headers.find(t => t.key.toLowerCase() === "content-type");
  return item ? checkType(item.value) : false;
}

function checkType(value: string): boolean {
  const lower = value.toLowerCase();
  return !TEXT_CONTENT_TYPES.some(type => lower.includes(type));
}

export function getFileType(headers: ITableData[]): string {
  const item = headers.find(t => t.key.toLowerCase() === "content-type");
  if (!item) {
    return "";
  }

  const mimeKey = item.value.includes(";")
    ? item.value.toLowerCase().split(";")[0].trim()
    : item.value.toLowerCase().trim();

  return MIMETypes[mimeKey] ?? "";
}

// ---------------------------------------------------------------------------
// Byte helpers
// ---------------------------------------------------------------------------

export function FormatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) {
		return '0 Bytes';
	}

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// ---------------------------------------------------------------------------
// Misc utilities
// ---------------------------------------------------------------------------

export function getRandomNumber(digit: number): string {
  return Math.random().toFixed(digit).split('.')[1];
}

export function isFolder(item: any): boolean {
	return item.data !== undefined;
}

export function getErrorResponse() {
	return {
		type: responseTypes.apiResponse,
		response: {
			responseData: "",
			status: 0,
			statusText: "",
			size: "0",
			duration: 0,
			isError: true,
			responseType: {
				isBinaryFile: false,
				format: ""
			}
		},
		headers: [],
		cookies: []
	};
}

// ---------------------------------------------------------------------------
// Deep-clone helper (avoids repeated JSON.parse/JSON.stringify noise)
// ---------------------------------------------------------------------------

export function deepClone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
