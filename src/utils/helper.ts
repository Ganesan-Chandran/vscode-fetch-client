import { ITableData } from "../fetch-client-ui/components/Common/Table/types";
import { IRequestModel } from "../fetch-client-ui/components/RequestUI/redux/types";
import { getTimeOutConfiguration } from "./vscodeConfig";


export const MIMETypes = {
  "audio/aac": "aac",
  "application/x-abiword": "abw",
  "application/x-freearc": "arc",
  "image/avif": "avif",
  "video/x-msvideo": "avi",
  "application/vnd.amazon.ebook": "azw",
  "application/octet-stream": "bin",
  "image/bmp": "bmp",
  "application/x-bzip": "bz",
  "application/x-bzip2": "bz2",
  "application/x-cdf": "cda",
  "application/x-csh": "csh",
  "text/css": "css",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-fontobject": "eot",
  "application/epub+zip": "epub",
  "application/gzip": "gz",
  "image/gif": "gif",
  "text/html": "html",
  "image/vnd.microsoft.icon": "ico",
  "text/calendar": "ics",
  "application/java-archive": "jar",
  "image/jpeg": "jpg",
  "text/javascript": "javascript",
  "application/json": "json",
  "application/ld+json": "json",
  "application/vnd.api+json": "json",
  "audio/midi": "mid",
  "audio/x-midi": "midi",
  "audio/mpeg": "mp3",
  "video/mp4": "mp4",
  "video/mpeg": "mpeg",
  "application/vnd.apple.installer+xml": "mpkg",
  "application/vnd.oasis.opendocument.presentation": "odp",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/vnd.oasis.opendocument.text": "odt",
  "audio/ogg": "oga",
  "video/ogg": "ogv",
  "application/ogg": "ogx",
  "audio/opus": "opus",
  "font/otf": "otf",
  "image/png": "png",
  "application/pdf": "pdf",
  "application/x-httpd-php": "php",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.rar": "rar",
  "application/rtf": "rtf",
  "application/x-sh": "sh",
  "image/svg+xml": "svg",
  "application/x-shockwave-flash": "swf",
  "application/x-tar": "tar",
  "image/tiff": "tif tiff",
  "video/mp2t": "ts",
  "font/ttf": "ttf",
  "text/plain": "plaintext",
  "application/vnd.visio": "vsd",
  "audio/wav": "wav",
  "audio/webm": "weba",
  "video/webm": "webm",
  "image/webp": "webp",
  "font/woff": "woff",
  "font/woff2": "woff2",
  "application/xhtml+xml": "xhtml",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/xml ": "xml",
  "application/vnd.mozilla.xul+xml": "xul",
  "application/zip": "zip",
  "video/3gpp": "3gp",
  "audio/3gpp": "3gp",
  "video/3gpp2": "3g2",
  "audio/3gpp2": "3g2",
  "application/x-7z-compressed": "7z",
};

export function isFileType(headers: ITableData[]): boolean {
  let item = headers.filter(t => t.key.toLowerCase() === "content-type");

  if (item.length > 0) {
    return checkType(item[0].value);
  }

  return false;
}

function checkType(value: string): boolean {
  if (value.toLowerCase().includes("application/json")) {
    return false;
  }
  if (value.toLowerCase().includes("application/ld+json")) {
    return false;
  }
  if (value.toLowerCase().includes("application/vnd.api+json")) {
    return false;
  }
  if (value.toLowerCase().includes("application/xml")) {
    return false;
  }
  if (value.toLowerCase().includes("text/javascript")) {
    return false;
  }
  if (value.toLowerCase().includes("text/html")) {
    return false;
  }
  if (value.toLowerCase().includes("text/css")) {
    return false;
  }
  if (value.toLowerCase().includes("text/plain")) {
    return false;
  }
  if (value.toLowerCase().includes("application/javascript")) {
    return false;
  }

  return true;
}

export function getFileType(headers: ITableData[]) {
  let type: string;
  let item = headers.filter(t => t.key.toLowerCase() === "content-type");
  if (item.length > 0) {
    if (item[0].value.includes(";")) {
      type = MIMETypes[item[0].value.toLowerCase().split(";")[0].trim()];
    } else {
      type = MIMETypes[item[0].value.toLowerCase().trim()];
    }
  }

  return type ? type : "";
}

export function formatDate(value?: string) {
  let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let t = value ? new Date(value) : new Date();
  let date = ("0" + t.getDate()).slice(-2);
  let timeFormat = ("0" + t.getHours()).slice(-2) + ":" + ("0" + t.getMinutes()).slice(-2) + ":" + ("0" + t.getSeconds()).slice(-2); //t.toTimeString().replace(/([\d]+:[\d]{4})(:[\d]{4})(.*)/, "$1$3");

  return date + "-" + months[t.getMonth()] + "-" + t.getFullYear() + " " + timeFormat;
}

export function replaceValueWithVariable(request: IRequestModel, varData: any) {
  request.url = replaceDataWithVariable(request.url, varData);
  request.params = replaceTableDataWithVariable(request.params, varData);
  request.headers = replaceTableDataWithVariable(request.headers, varData);
  request.auth.userName = replaceDataWithVariable(request.auth.userName, varData);
  request.auth.password = replaceDataWithVariable(request.auth.password, varData);
  request.auth.tokenPrefix = replaceDataWithVariable(request.auth.tokenPrefix, varData);
  request.body.formdata = replaceTableDataWithVariable(request.body.formdata, varData);
  request.body.urlencoded = replaceTableDataWithVariable(request.body.urlencoded, varData);

  return request;
}

function replaceTableDataWithVariable(data: ITableData[], varData: any) {
  const re = new RegExp("({{([^}}]+)}})");
  data.forEach(item => {
    if (re.test(item.key)) {
      let ptn = item.key.match(/({{([^}}]+)}})/gm);
      ptn?.forEach(p => {
        item.key = item.key.replace(p, varData[p.replace("{{", "").replace("}}", "")]);
      });
    }

    if (re.test(item.value)) {
      let ptn = item.value.match(/({{([^}}]+)}})/gm);
      ptn?.forEach(p => {
        item.value = item.value.replace(p, varData[p.replace("{{", "").replace("}}", "")]);
      });
    }
  });

  return data;
}

export function replaceDataWithVariable(data: string, varData: any) {
  const re = new RegExp("({{([^}}]+)}})");
  if (re.test(data)) {
    let ptn = data.match(/({{([^}}]+)}})/gm);
    ptn?.forEach(item => {
      data = data.replace(item, varData[item.replace("{{", "").replace("}}", "")]);
    });
  }

  return data;
}

