import { ITableData } from "./Table/types";

export const notesMaxLimit = 2500;
export function getDataFromHTML(data: string): string {
    let removedData: string;
    removedData = data?.replace(/(<([^>]+)>)/gm, '');
    removedData = removedData?.replace(/(&nbsp;|&gt;|&lt;|&amp;)/gm, ' ');
    return removedData;
}

export function getDomainName(url: string, cookie: ITableData): string {
    let domainName = "";

    try {
        url = url.startsWith("http://") || url.startsWith("https:// ") ? url : "https://" + url;
        let domain = (new URL(url));
        domainName = domain.hostname.replace('www.', '').trim();
    }
    catch {
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
    }

    return domainName;
}