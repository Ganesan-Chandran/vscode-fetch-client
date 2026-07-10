import { createAutoDBCache } from "../../fetch-client-core/db/dbManager";
import { IHistory } from "../../fetch-client-core/types/sidebar.types";
import { historyDBPath } from "./dbHelper";

const {
	getLoadedDB: getHistoryDB,
	saveDB,
	flush: flushHistoryDB,
	invalidate: invalidateHistoryDB,
} = createAutoDBCache(historyDBPath);
export { getHistoryDB, flushHistoryDB, invalidateHistoryDB };

export async function History_Repository_InsertHistory(
	item: IHistory,
): Promise<void> {
	const db = await getHistoryDB();

	db.getCollection("userHistory").insert(item);

	await saveDB(db);
}

export async function History_Repository_UpdateHistory(
	item: IHistory,
): Promise<boolean> {
	const db = await getHistoryDB();
	const userHistory = db.getCollection("userHistory");
	const req = userHistory.findOne({ id: item.id });

	if (!req) {
		return false;
	}

	req.name = item.name;
	req.method = item.method;
	req.url = item.url;
	req.createdTime = item.createdTime;

	userHistory.update(req);
	await saveDB(db);
	return true;
}

export async function History_Repository_GetHistoryById(
	id: string,
): Promise<IHistory[]> {
	const db = await getHistoryDB();
	return db.getCollection("userHistory").find({ id });
}

export async function History_Repository_GetAllHistory(): Promise<IHistory[]> {
	const db = await getHistoryDB();

	return db.getCollection("userHistory").chain().data({
		forceClones: true,
		removeMeta: true,
	});
}

export async function History_Repository_DeleteAllHistory(): Promise<string[]> {
	const db = await getHistoryDB();
	const userHistory = db.getCollection("userHistory");

	const results = userHistory.chain().data({
		forceClones: true,
		removeMeta: true,
	});

	const ids = results.map((item) => item.id);
	userHistory.removeDataOnly();
	await saveDB(db);
	return ids;
}

export async function History_Repository_DeleteHistory(
	id: string,
): Promise<void> {
	const db = await getHistoryDB();
	db.getCollection("userHistory").findAndRemove({ id });
	await saveDB(db);
}

export async function History_Repository_RenameHistory(
	id: string,
	name: string,
): Promise<boolean> {
	const db = await getHistoryDB();
	const item = db.getCollection("userHistory").findOne({ id });

	if (!item) {
		return false;
	}

	item.name = name;
	db.getCollection("userHistory").update(item);
	await saveDB(db);

	return true;
}
