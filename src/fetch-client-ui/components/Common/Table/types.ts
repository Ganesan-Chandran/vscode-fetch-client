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
  "application/atom+xml",
  "application/hal+json",
  "application/javascript",
  "application/json",
  "application/ld+json",
  "application/vnd.api+json",
  "application/octet-stream",
  "application/x-www-form-urlencoded",
  "application/xml",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg",
  "image/webp",
  "multipart/form-data",
  "text/csv",
  "text/html",
  "text/plain",
  "text/xml",
];

export const HeadersKeys = [
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Accept",
  "Access-Control-Allow-Credentials",
  "Access-Control-Allow-Headers",
  "Access-Control-Allow-Methods",
  "Access-Control-Allow-Origin",
  "Access-Control-Expose-Headers",
  "Access-Control-Max-Age",
  "Access-Control-Request-Headers",
  "Access-Control-Request-Method",
  "Authorization",
  "Cache-Control",
  "Connection",
  "Content-Encoding",
  "Content-Length",
  "Content-Type",
  "Cookie",
  "Date",
  "DNT",
  "Expect",
  "Forwarded",
  "Host",
  "If-Match",
  "If-Modified-Since",
  "If-None-Match",
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
  "Upgrade-Insecure-Requests",
  "User-Agent",
  "X-Authorization"
];