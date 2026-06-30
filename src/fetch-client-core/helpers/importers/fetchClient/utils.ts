import { formatDate } from "../../dateTime.helper";
import { IHistory } from "../../../types/sidebar.types";
import { IRequestModel } from "../../../types/request.types";

export type IRawImportRequest = Omit<IRequestModel, "id" | "createdTime"> & {
	id?: string;
	createdTime?: string;
};

export function buildHistoryEntry(id: string, req: IRawImportRequest): IHistory {
	return {
		id,
		method: req.method,
		name: req.name,
		url: req.url,
		createdTime: formatDate(),
		modifiedTime: formatDate(),
	};
}