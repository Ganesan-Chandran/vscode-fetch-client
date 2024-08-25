import { v4 as uuidv4 } from "uuid";
import { IRequestModel } from "../../../fetch-client-ui/components/RequestUI/redux/types";
import { InitialSettings } from "../../../fetch-client-ui/components/SideBar/redux/reducer";
import { ICollections, IFolder, IHistory } from "../../../fetch-client-ui/components/SideBar/redux/types";
import { isFolder } from "../../../fetch-client-ui/components/SideBar/util";
import { formatDate } from "../../helper";
import { writeLog } from "../../logger/logger";

export const fetchClientImporter = (parsedData: any): { fcCollection: ICollections, fcRequests: IRequestModel[] } | null => {
	try {
		let reqData = [];

		let colData: ICollections = {
			id: uuidv4(),
			name: parsedData.name,
			createdTime: formatDate(),
			variableId: "",
			data: [],
			settings: parsedData.settings ? parsedData.settings : JSON.parse(JSON.stringify(InitialSettings))
		};

		let importedData = parsedData.data;

		importedData.forEach(item => {
			item.id = uuidv4();
			item.createdTime = formatDate();
			if (isFolder(item)) {
				let importData: any;
				let folder: IFolder = {
					id: uuidv4(),
					name: item.name,
					createdTime: formatDate(),
					type: "folder",
					data: [],
					settings: item.settings ? item.settings : JSON.parse(JSON.stringify(InitialSettings))
				};
				({ importData, reqData } = ImportFolder(item, folder, reqData));
				colData.data.push(importData);
			} else {
				item.id = uuidv4();
				item.createdTime = formatDate();
				reqData.push(item);
				let his: IHistory = {
					id: item.id,
					method: item.method,
					name: item.name,
					url: item.url,
					createdTime: formatDate()
				};
				colData.data.push(his);
			}
		});

		return {
			fcCollection: colData,
			fcRequests: reqData
		};

	} catch (err) {
		writeLog("error::fetchClientImporter(): - Error Message : " + err);
		return null;
	}
};

function ImportFolder(source: any, importData: any, reqData: any): any {
	for (let i = 0; i < source.data.length; i++) {
		if (isFolder(source.data[i])) {
			let folder: IFolder = {
				id: uuidv4(),
				name: source.data[i].name,
				createdTime: formatDate(),
				type: "folder",
				data: [],
				settings: source.data[i].settings ? source.data[i].settings : JSON.parse(JSON.stringify(InitialSettings))
			};
			let result = ImportFolder(source.data[i], folder, reqData);
			importData.data.push(result.importData);
		} else {
			source.data[i].id = uuidv4();
			source.data[i].createdTime = formatDate();
			let his: IHistory = {
				id: source.data[i].id,
				method: source.data[i].method,
				name: source.data[i].name,
				url: source.data[i].url,
				createdTime: source.data[i].createdTime
			};
			reqData.push(source.data[i]);
			importData.data.push(his);
		}
	}

	return { importData, reqData };
}
