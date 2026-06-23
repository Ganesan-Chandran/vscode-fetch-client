import { IReponseModel } from "../../fetch-client-core/types/response.types";
import { responseDBPath } from "../../fetch-client-core/db/dbHelper";
import loki, { LokiFsAdapter } from "lokijs";

function getDB(): loki {
	const idbAdapter = new LokiFsAdapter();
	const db = new loki(responseDBPath(), { adapter: idbAdapter });
	db.autosaveDisable();
	return db;
}

function loadDB(): Promise<loki> {
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

function saveDB(db: loki): Promise<void> {
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

export async function Response_Repository_SaveResponse(resData: IReponseModel): Promise<void> {
	const db = await loadDB();
	const apiResponses = db.getCollection("apiResponses");
	const res = apiResponses.findOne({ id: resData.id });

	if (res) {
		res.response = resData.response;
		res.headers = resData.headers;
		res.cookies = resData.cookies;

		apiResponses.update(res);
	} else {
		apiResponses.insert(resData);
	}

	await saveDB(db);
}

export async function Response_Repository_GetExitingItemResponse(
	id: string
): Promise<IReponseModel[]> {
	const db = await loadDB();
	const apiResponses = db.getCollection("apiResponses");
	return apiResponses.find({ id }) as IReponseModel[];
}
