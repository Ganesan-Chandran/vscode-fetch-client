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
			(dbItem) => !requests.some((req) => req.id === dbItem.id),
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
