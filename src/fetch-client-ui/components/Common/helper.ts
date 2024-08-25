import { ITableData } from "./Table/types";

export const notesMaxLimit = 2500;

export function GetDataFromHTML(data: string): string {
	let removedData: string;
	removedData = data?.replace(/(<([^>]+)>)/gm, '');
	removedData = removedData?.replace(/(&nbsp;|&gt;|&lt;|&amp;)/gm, ' ');
	return removedData;
}

export function GetDomainName(url: string, cookie: ITableData): string {
	let domainName = "";

	if (!url && !cookie) {
		return null;
	}

	try {
		domainName = getDomainNameFromURL(url);
	}
	catch {
		domainName = getDomainNameFromCookie(cookie);
	}

	return domainName;
}

function getDomainNameFromCookie(cookie: ITableData): string {
	let domainName = "";
	let startIndex = cookie.value.indexOf("domain=");
	let endIndex = -1;
	if (startIndex !== -1) {
		let str = cookie.value.substring(startIndex);
		str = str.replace("domain=", "").trim();
		endIndex = str.indexOf(";");
		domainName = str.substring(0, endIndex === -1 ? cookie.value.length - 1 : endIndex);
		if (domainName.charAt(0) === ".") {
			domainName = domainName.replace(".", "").trim();
		}
	}

	return domainName;
}

export function getDomainNameFromURL(url: string): string {
	let domainName = "";
	if (url.startsWith("http://") || url.startsWith("https://")) {
		url = url;
	} else {
		url = "https://" + url;
	}
	let domain = new URL(url);
	domainName = domain.hostname.replace('www.', '').trim();

	return domainName;
}

export function GetFileName(path: string) {
	return path.split('\\').pop().split("/").pop();
}
