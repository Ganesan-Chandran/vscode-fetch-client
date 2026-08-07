import { createAutoDBCache } from "./dbManager";
import { formatDate } from "../helpers/dateTime.helper";
import { IMockServer } from "../types/mockServer.types";
import { mockServerDBPath } from "./dbHelper";
import { writeLog } from "../helpers/logger/logger";

const {
	getLoadedDB: getMockServerDB,
	saveDB,
	flush: flushMockServerDB,
	invalidate: invalidateMockServerDB,
} = createAutoDBCache(mockServerDBPath);
export { getMockServerDB, flushMockServerDB, invalidateMockServerDB };

export async function MockServer_Repository_GetAll(): Promise<IMockServer[]> {
	try {
		const db = await getMockServerDB();
		const col = db.getCollection("mockServers");
		if (!col) {
			return [];
		}
		return col
			.chain()
			.data({ forceClones: true, removeMeta: true }) as IMockServer[];
	} catch (err) {
		writeLog("error::MockServer_Repository_GetAll(): " + err);
		throw err;
	}
}

export async function MockServer_Repository_GetById(
	id: string,
): Promise<IMockServer | null> {
	try {
		const db = await getMockServerDB();
		const col = db.getCollection("mockServers");
		if (!col) {
			return null;
		}
		const results = col
			.chain()
			.find({ id })
			.data({ forceClones: true, removeMeta: true }) as IMockServer[];
		return results.length > 0 ? results[0] : null;
	} catch (err) {
		writeLog("error::MockServer_Repository_GetById(): " + err);
		throw err;
	}
}

export async function MockServer_Repository_Insert(
	item: IMockServer,
): Promise<void> {
	try {
		const db = await getMockServerDB();
		const col = db.getCollection("mockServers");
		if (!col) {
			return;
		}
		col.insert({ ...item });
		await saveDB(db);
	} catch (err) {
		writeLog("error::MockServer_Repository_Insert(): " + err);
		throw err;
	}
}

export async function MockServer_Repository_Update(
	item: IMockServer,
): Promise<void> {
	try {
		const db = await getMockServerDB();
		db.getCollection("mockServers").findAndUpdate({ id: item.id }, (doc) => {
			doc.name = item.name;
			doc.port = item.port;
			doc.description = item.description;
			doc.routes = item.routes;
			doc.modifiedTime = formatDate();
		});
		await saveDB(db);
	} catch (err) {
		writeLog("error::MockServer_Repository_Update(): " + err);
		throw err;
	}
}

export async function MockServer_Repository_Rename(
	id: string,
	name: string,
): Promise<void> {
	try {
		const db = await getMockServerDB();
		db.getCollection("mockServers").findAndUpdate({ id }, (doc) => {
			doc.name = name;
			doc.modifiedTime = formatDate();
		});
		await saveDB(db);
	} catch (err) {
		writeLog("error::MockServer_Repository_Rename(): " + err);
		throw err;
	}
}

export async function MockServer_Repository_Delete(id: string): Promise<void> {
	try {
		const db = await getMockServerDB();
		db.getCollection("mockServers").findAndRemove({ id });
		await saveDB(db);
	} catch (err) {
		writeLog("error::MockServer_Repository_Delete(): " + err);
		throw err;
	}
}
