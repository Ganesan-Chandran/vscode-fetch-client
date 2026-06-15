import loki, { LokiFsAdapter } from 'lokijs';
import { writeLog } from '../logger/logger';
import { settingsDBPath } from './helper';
import { IDbSettings } from './types';

let db: loki;

let dbPromise: Promise<loki> | null = null;

export function InitSettingsDB(): Promise<loki> {
	if (dbPromise) {
		return dbPromise;
	}

	dbPromise = new Promise((resolve, reject) => {
		const idbAdapter = new LokiFsAdapter();

		const newDb = new loki(settingsDBPath(), {
			adapter: idbAdapter,
			autosave: true,
			autosaveInterval: 1000
		});

		newDb.loadDatabase({}, (err: any) => {
			if (err) {
				dbPromise = null;
				reject(err);
				return;
			}

			db = newDb;
			resolve(newDb);
		});
	});

	return dbPromise;
}

function getDb(): loki {
	if (!db) {
		writeLog("error::getDb(): Database accessed before initialization completed.");
	}
	return db;
}

export function SaveSettings(item: IDbSettings) {
	try {
		const database = getDb();

		const dbSettings = database.getCollection('dbSettings');

		if (!dbSettings) {
			writeLog("error::SaveSettings(): dbSettings collection not found.");
			return;
		}

		let settingItem = dbSettings.find({ id: item.id });
		if (settingItem === null || settingItem?.length === 0) {
			dbSettings.insert(item);
		} else {
			settingItem[0].name = item.name;
			settingItem[0].id = item.id;
			settingItem[0].value = JSON.stringify(item.value);
		}

		database.saveDatabase();

	} catch (err) {
		writeLog("error::SaveSettings(): " + err);
	}
}

export function GetSettingsByName(configName: string): Record<string, unknown> | null {
	try {
		const database = getDb();
		const collection = database.getCollection("dbSettings");

		if (!collection) {
			return null;
		}

		const results = collection
			.chain()
			.find({ name: configName })
			.data();

		return results && results.length > 0
			? (results[0] as IDbSettings).value
			: null;

	} catch (err) {
		writeLog(`error::GetSettingsByName(): ${err}`);
		return null;
	}
}

export function GetEncryptionKeyFromSettings(): string | null {
	const encryptionKeySetting = GetSettingsByName("encryptionKeyInStore");
	if (!encryptionKeySetting) { return null; }
	try {
		const parsed = JSON.parse(encryptionKeySetting as unknown as string);
		const key = parsed?.encryptionKey as string;
		return key ? key : null;
	} catch {
		return null;
	}
}
