export interface IFormattedTimestamp {
    unixSeconds: number;
    unixMilliseconds: number;
    iso: string;
}

export function copyText(value: string): void {
    if (!value) { return; }
    void navigator.clipboard?.writeText(value);
}

export function safeJsonParse(value: string): unknown {
    return JSON.parse(value);
}

export function prettyJson(value: unknown, spaces = 2): string {
    return JSON.stringify(value, null, spaces);
}

export function decodeBase64Url(value: string): string {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return atob(padded);
}

export function encodeBase64Url(value: string): string {
    return btoa(value)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

export function randomInt(min: number, max: number): number {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    return Math.floor(Math.random() * (high - low + 1)) + low;
}

export function formatTimestamp(value: number): IFormattedTimestamp | null {
    if (!Number.isFinite(value)) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return {
        unixSeconds: Math.floor(value / 1000),
        unixMilliseconds: value,
        iso: date.toISOString(),
    };
}