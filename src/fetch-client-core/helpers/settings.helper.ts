import { ICollections, ISettings } from "../types/sidebar.types";
import { InitialSettings } from "../consts/initialValues.consts";
import { isFolder } from "./common.helper";

export function defaultSettings(): typeof InitialSettings {
	return JSON.parse(JSON.stringify(InitialSettings));
}

export function resolveParentSettings(
	collection: ICollections,
	folderId: string,
): ISettings {
	if (!folderId) {
		return collection.settings ?? defaultSettings();
	}

	return (
		findParentSettings(collection, folderId) ??
		defaultSettings()
	);
}

export function findParentSettings(
	source: any,
	id: string,
	prevSettings: any = null,
): any | null {
	let curSettings = source.settings ?? null;

	if (curSettings?.auth?.authType === "inherit") {
		curSettings = prevSettings;
	}

	const directMatch = source.data.find((el: any) => el.id === id);

	if (directMatch) {
		if (!directMatch.settings) {
			return curSettings;
		}

		if (directMatch.settings.auth?.authType === "inherit") {
			directMatch.settings.auth = curSettings?.auth;
		}

		return directMatch.settings;
	}

	for (const entry of source.data) {
		if (isFolder(entry)) {
			const result = findParentSettings(entry, id, curSettings);

			if (result) {
				return result;
			}
		}
	}

	return null;
}
