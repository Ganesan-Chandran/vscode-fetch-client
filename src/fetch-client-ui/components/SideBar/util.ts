import { IFolder, IHistory } from "./redux/types";

export function getDays(date1: string, date2: Date) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;

  let dateFormat = new Date(date1);
  const utc1 = Date.UTC(dateFormat.getFullYear(), dateFormat.getMonth(), dateFormat.getDate());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());

  const diffDays = Math.floor((utc2 - utc1) / _MS_PER_DAY);

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays > 365) {
    let year = Math.floor(diffDays / 365);
    return year + (year > 1 ? " years ago" : " year ago");
  }
  if (diffDays > 30) {
    let month = Math.floor(diffDays / 30);
    return month + (month > 1 ? " months ago" : " month ago");
  }
  if (diffDays > 7) {
    let week = Math.floor(diffDays / 7);
    return week + (week > 1 ? " weeks ago" : " week ago");
  }
  return diffDays + " days ago";
}


export function getMethodClassName(method: string) {
  switch (method) {
    case "GET":
      return "get-mtd";
    case "POST":
      return "post-mtd";
    case "PUT":
      return "put-mtd";
    case "PATCH":
      return "patch-mtd";
    case "DELETE":
      return "delete-mtd";
    default:
      return "other-mtd";
  }
}

export function getMethodName(method: string) {
  if (method === "OPTIONS") {
    return "OPT";
  }

  return method;
}

export function isFolder(data: IHistory | IFolder): boolean {
  return (data as IFolder).type !== undefined;
}