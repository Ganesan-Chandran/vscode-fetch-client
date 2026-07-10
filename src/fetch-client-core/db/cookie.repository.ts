import { cookieDBPath } from "../../fetch-client-core/db/dbHelper";
import { ICookie } from "../../fetch-client-core/types/cookie.types";
import loki, { LokiFsAdapter } from "lokijs";

function getDB(): loki {
	const idbAdapter = new LokiFsAdapter();
	return new loki(cookieDBPath(), {
		adapter: idbAdapter,
		autosave: true,
		autosaveInterval: 1000,
	});
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

export async function Cookie_Repository_SaveCookie(
	item: ICookie,
): Promise<void> {
	const db = await loadDB();
	const userCookies = db.getCollection("userCookies");

	let cookieItem = userCookies.find({ id: item.id });

	if (cookieItem === null || cookieItem.length === 0) {
		userCookies.insert(item);
	} else {
		cookieItem[0].name = item.name;
		cookieItem[0].id = item.id;
		cookieItem[0].data = item.data;
		userCookies.update(cookieItem[0]);
	}

	await saveDB(db);
}

export async function Cookie_Repository_GetAllCookies(): Promise<ICookie[]> {
	const db = await loadDB();
	const userCookies = db.getCollection("userCookies");

	return userCookies.chain().data({
		forceClones: true,
		removeMeta: true,
	}) as ICookie[];
}

export async function Cookie_Repository_GetCookieById(
	id: string,
): Promise<ICookie[]> {
	const db = await loadDB();
	const userCookies = db.getCollection("userCookies");
	return userCookies.find({ id }) as ICookie[];
}

export async function Cookie_Repository_DeleteCookieById(
	id: string,
): Promise<void> {
	const db = await loadDB();
	const userCookies = db.getCollection("userCookies");
	userCookies.findAndRemove({ id });
	await saveDB(db);
}

export async function Cookie_Repository_DeleteAllCookies(): Promise<void> {
	const db = await loadDB();
	const userCookies = db.getCollection("userCookies");
	userCookies.removeDataOnly();
	await saveDB(db);
}
