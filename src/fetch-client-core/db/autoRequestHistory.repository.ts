import { autoRequestHistoryDBPath } from "./dbHelper";
import { IAutoRequestHistory } from "../types/autorequest.types";
import { v4 as uuidv4 } from "uuid";
import { writeLog } from "../helpers/logger/logger";
import loki, { LokiFsAdapter, Collection } from "lokijs";

function getDB(): loki {
	const adapter = new LokiFsAdapter();
	return new loki(autoRequestHistoryDBPath(), { adapter });
}

function loadDatabase(): Promise<loki> {
	return new Promise((resolve, reject) => {
		try {
			const db = getDB();
			db.loadDatabase({}, (err) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(db);
			});
		} catch (error) {
			reject(error);
		}
	});
}

function saveDatabase(db: loki): Promise<void> {
	return new Promise((resolve, reject) => {
		db.saveDatabase((err) => {
			if (err) {
				reject(err);
				return;
			}
			resolve();
		});
	});
}

export async function AutoReqHistory_Repository_GetAll(): Promise<IAutoRequestHistory[]> {
	try {
		const { collection } = await getHistoryCollection();
		return collection
			.chain()
			.simplesort("executedTime", { desc: true })
			.data({ removeMeta: true });
	} catch (error) {
		writeLog(`error::AutoReqHistory_Repository_GetAll(): ${error}`);
		throw error;
	}
}

async function getHistoryCollection(): Promise<{
	db: loki;
	collection: Collection<IAutoRequestHistory>;
}> {
	const db = await loadDatabase();
	const collection = db.getCollection<IAutoRequestHistory>("autoRequestHistory");
	if (!collection) {
		return { db, collection: null };
	}
	return { db, collection };
}

export async function AutoReqHistory_Repository_Add(entry: Omit<IAutoRequestHistory, "id">): Promise<void> {
	try {
		const { db, collection } = await getHistoryCollection();
		collection.insert({ ...entry, id: uuidv4() });
		await saveDatabase(db);
	} catch (error) {
		writeLog(`error::AutoReqHistory_Repository_Add(): ${error}`);
	}
}

export async function AutoReqHistory_Repository_Upsert(model: Omit<IAutoRequestHistory, "id">): Promise<void> {
	const { db, collection } = await getHistoryCollection();

	const existing = collection.findOne({
		autoReqId: model.autoReqId,
		scheduleId: model.scheduleId,
	});

	if (existing) {
		collection.update({ ...existing, ...model });
	} else {
		collection.insert({ id: uuidv4(), ...model });
	}

	await saveDatabase(db);
}

export async function AutoReqHistory_Repository_GetByColId(
	colId: string,
): Promise<IAutoRequestHistory[]> {
	try {
		const { collection } = await getHistoryCollection();
		return collection
			.chain()
			.find({ colId })
			.simplesort("executedTime", { desc: true })
			.data({ removeMeta: true });
	} catch (error) {
		writeLog(`error::AutoReqHistory_Repository_GetByColId(): ${error}`);
		throw error;
	}
}

export async function AutoReqHistory_Repository_Delete(id: string): Promise<void> {
	try {
		const { db, collection } = await getHistoryCollection();
		collection.findAndRemove({ id });
		await saveDatabase(db);
	} catch (error) {
		writeLog(`error::AutoReqHistory_Repository_Delete(): ${error}`);
	}
}

export async function AutoReqHistory_Repository_DeleteByAutoReqId(
	autoReqId: string,
): Promise<void> {
	try {
		const { db, collection } = await getHistoryCollection();
		collection.findAndRemove({ autoReqId });
		await saveDatabase(db);
	} catch (error) {
		writeLog(`error::AutoReqHistory_Repository_DeleteByAutoReqId(): ${error}`);
	}
}

export async function AutoReqHistory_Repository_StopAllRunning(): Promise<void> {
	try {
		const { db, collection } = await getHistoryCollection();
		const running = collection.find({ scheduleStatus: "running" });
		for (const entry of running) {
			collection.update({ ...entry, scheduleStatus: "stopped", nextRunTime: "-" });
		}
		await saveDatabase(db);
	} catch (error) {
		writeLog(`error::AutoReqHistory_Repository_StopAllRunning(): ${error}`);
	}
}

export async function AutoReqHistory_Repository_GetDistinctRunningScheduleIds(): Promise<string[]> {
	try {
		const { collection } = await getHistoryCollection();
		const running = collection.find({ scheduleStatus: "running" });
		return [...new Set(running.map((item) => item.scheduleId ?? item.autoReqId))];
	} catch (error) {
		writeLog(`error::AutoReqHistory_Repository_GetDistinctRunningScheduleIds(): ${error}`);
		return [];
	}
}

export async function AutoReqHistory_Repository_ReconcileOwnSession(
	currentSessionId: string,
): Promise<void> {
	try {
		const { db, collection } = await getHistoryCollection();
		if (collection) {
			const stale = collection.find({ scheduleStatus: "running" }).filter(
				(item) => !item.ownerSessionId || item.ownerSessionId === currentSessionId,
			);
			for (const entry of stale) {
				collection.update({ ...entry, scheduleStatus: "stopped", nextRunTime: "-" });
			}
			if (stale.length) {
				await saveDatabase(db);
			}
		}
	} catch (error) {
		writeLog(`error::AutoReqHistory_Repository_ReconcileOwnSession(): ${error}`);
	}
}
