import { formatDate } from "../../dateTime.helper";
import { InitialSettings } from "../../../consts/initialValues.consts";
import { IRequestModel } from "../../../types/request.types";
import { ISettings, ICollections, IFolder } from "../../../types/sidebar.types";
import { isFolder } from "../../common.helper";
import { v4 as uuidv4 } from "uuid";
import { writeLog } from "../../logger/logger";
import { IRawImportRequest, buildHistoryEntry } from "./utils";

/** Shape of a folder entry as it appears in a raw fetchClient export file. */
interface IRawImportFolder {
	name: string;
	type: "folder";
	settings?: ISettings;
	data: Array<IRawImportRequest | IRawImportFolder>;
}

/** Shape of the top-level collection object in a raw fetchClient export file. */
interface IRawImportCollection {
	name: string;
	settings?: ISettings;
	data: Array<IRawImportRequest | IRawImportFolder>;
}

export interface IImportResult {
	fcCollection: ICollections;
	fcRequests: IRequestModel[];
}

function cloneSettings(settings?: ISettings): ISettings {
	return JSON.parse(JSON.stringify(settings ?? InitialSettings));
}

function importFolder(source: IRawImportFolder, reqData: IRequestModel[]): IFolder {
	const folder: IFolder = {
		id: uuidv4(),
		name: source.name,
		createdTime: formatDate(),
		type: "folder",
		data: [],
		settings: cloneSettings(source.settings),
	};

	for (const item of source.data) {
		if (isFolder(item)) {
			folder.data!.push(importFolder(item as IRawImportFolder, reqData));
		} else {
			const req = item as IRawImportRequest;
			const id = uuidv4();
			const requestModel: IRequestModel = { ...req, id, createdTime: formatDate() };
			reqData.push(requestModel);
			folder.data!.push(buildHistoryEntry(id, req));
		}
	}

	return folder;
}

export const fetchClientImporter = (parsedData: IRawImportCollection): IImportResult | null => {
	try {
		const reqData: IRequestModel[] = [];

		const colData: ICollections = {
			id: uuidv4(),
			name: parsedData.name,
			createdTime: formatDate(),
			variableId: "",
			data: [],
			settings: cloneSettings(parsedData.settings),
		};

		for (const item of parsedData.data) {
			if (isFolder(item)) {
				colData.data!.push(importFolder(item as IRawImportFolder, reqData));
			} else {
				const req = item as IRawImportRequest;
				const id = uuidv4();
				const requestModel: IRequestModel = { ...req, id, createdTime: formatDate() };
				reqData.push(requestModel);
				colData.data!.push(buildHistoryEntry(id, req));
			}
		}

		return { fcCollection: colData, fcRequests: reqData };

	} catch (err) {
		writeLog(`error::fetchClientImporter() - ${err instanceof Error ? err.message : String(err)}`);
		return null;
	}
};
