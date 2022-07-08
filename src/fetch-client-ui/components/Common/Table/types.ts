export interface ITableData {
  isFixed?: boolean;
  isChecked?: boolean;
  type?: string;
  key: string;
  value: string;
}

export type TableType = "reqHeaders" | "queryParams" | "resHeaders" | "formData" | "urlEncoded" | "resCookies";

export const dataTypes = ["Text", "File"];

export const HerdersValues = [
  "application/json",
  "application/xml",
  "application/ld+json",
  "application/hal+json",
  "application/javascript",
  "application/octet-stream",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/html",
  "text/csv",
  "text/plain",
  "text/xml",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg",
];

export const HeadersKeys = [
  "Accept",
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Content-Type",
  "Connection",
  "Content-Encoding",
  "Content-Length",
  "Access-Control-Allow-Origin",
  "Access-Control-Allow-Credentials",
  "Access-Control-Allow-Headers",
  "Access-Control-Allow-Methods",
  "Access-Control-Expose-Headers",
  "Access-Control-Max-Age",
  "Access-Control-Request-Headers",
  "Access-Control-Request-Method",
  "Cache-Control",
  "Cookie",
  "Date",
  "DNT",
  "Expect",
  "Forwarded",
  "Host",
  "If-Match",
  "If-None-Match",
  "If-Modified-Since",
  "If-Unmodified-Since",
  "Location",
  "Max-Forwards",
  "Origin",
  "Pragma",
  "Proxy-Authorization",
  "Range",
  "Referer",
  "Set-Cookie",
  "Strict-Transport-Security",
  "User-Agent",
  "Upgrade-Insecure-Requests",
  "X-Authorization"
];