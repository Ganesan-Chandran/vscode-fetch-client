import loki, { LokiFsAdapter, Collection } from "lokijs";
import { autoRequestDBPath } from "../../fetch-client-core/db/dbHelper";
import { IAutoRequest } from "../../fetch-client-core/types/autorequest.types";
import { writeLog } from "../helpers/logger/logger";

function getDB(): loki {
	const adapter = new LokiFsAdapter();
	return new loki(autoRequestDBPath(), { adapter });
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

async function getAutoRequestCollection(): Promise<{
	db: loki;
	collection: Collection<IAutoRequest>;
}> {
	const db = await loadDatabase();

	const collection = db.getCollection<IAutoRequest>("autoRequests");

	if (!collection) {
		throw new Error("autoRequests collection not found");
	}

	return { db, collection };
}

export async function Auto_Repository_SaveAutoRequests(
	colId: string,
	requests: IAutoRequest[],
): Promise<{
	savedRequests: IAutoRequest[];
	deletedRequests: IAutoRequest[];
}> {
	try {
		const { db, collection } = await getAutoRequestCollection();

		requests.forEach((item) => {
			if (!item.colId || !item.reqId) {
				return;
			}

			const existing = collection.findOne({ id: item.id });

			if (!existing) {
				collection.insert(item);
				return;
			}

				existing.id = item.id;
				existing.scheduleId = item.scheduleId;
			existing.colId = item.colId;
			existing.reqId = item.reqId;
			existing.parentId = item.parentId;
			existing.interval = item.interval;
			existing.duration = item.duration;
			existing.status = item.status;
			existing.cron = item.cron;
			existing.createdTime = item.createdTime;

			collection.update(existing);
		});

		const deletedRequests = collection.data.filter(
			(dbItem) =>
				(colId ? dbItem.colId === colId : true) &&
				!requests.some((req) => req.id === dbItem.id),
		);

		deletedRequests.forEach((item) => {
			collection.findAndRemove({ id: item.id });
		});

		await saveDatabase(db);

		return {
			savedRequests: requests,
			deletedRequests,
		};
	} catch (error) {
		writeLog(`error::SaveAutoRequests(): ${error}`);
		throw error;
	}
}

/** Adds schedules without removing the schedules already shown in the summary. */
export async function Auto_Repository_AddAutoRequests(
	requests: IAutoRequest[],
): Promise<IAutoRequest[]> {
	try {
		const { db, collection } = await getAutoRequestCollection();
		const validRequests = requests.filter((item) => item.colId && item.reqId);
		validRequests.forEach((item) => {
			const existing = collection.findOne({ id: item.id });
			if (existing) {
				Object.assign(existing, item);
				collection.update(existing);
			} else {
				collection.insert(item);
			}
		});
		await saveDatabase(db);
		return validRequests;
	} catch (error) {
		writeLog(`error::AddAutoRequests(): ${error}`);
		throw error;
	}
}

export async function Auto_Repository_GetAllAutoRequests(): Promise<
	IAutoRequest[]
> {
	try {
		const { collection } = await getAutoRequestCollection();

		return collection.chain().data({
			removeMeta: true,
		});
	} catch (error) {
		writeLog(`error::GetAllAutoRequests(): ${error}`);
		throw error;
	}
}

export async function Auto_Repository_GetAutoRequestById(
	id: string,
): Promise<IAutoRequest[]> {
	try {
		const { collection } = await getAutoRequestCollection();

		return collection.find({ id });
	} catch (error) {
		writeLog(`error::GetAutoRequestById(): ${error}`);
		throw error;
	}
}

export async function Auto_Repository_GetAutoRequestsByColId(
	colId: string,
): Promise<IAutoRequest[]> {
	try {
		const { collection } = await getAutoRequestCollection();
		return collection.find({ colId });
	} catch (error) {
		writeLog(`error::GetAutoRequestsByColId(): ${error}`);
		throw error;
	}
}
