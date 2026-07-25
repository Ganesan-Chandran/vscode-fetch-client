import { formatDate } from "../helpers/dateTime.helper";
import { v4 as uuidv4 } from "uuid";
import { writeLog } from "../helpers/logger/logger";
import loki, { LokiFsAdapter } from "lokijs";
import {
	autoRequestDBPath,
	autoRequestHistoryDBPath,
	collectionDBPath,
	cookieDBPath,
	historyDBPath,
	mainDBPath,
	responseDBPath,
	variableDBPath,
} from "./dbHelper";

function createDatabase(
	dbPath: string,
	fnName: string,
	initializer: (db: loki) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		try {
			const idbAdapter = new LokiFsAdapter();
			const db = new loki(dbPath, {
				autoload: true,
				autoloadCallback: () => {
					try {
						initializer(db);
						db.saveDatabase();
						resolve();
					} catch (err) {
						writeLog(`error::${fnName}::dbInitialize(): ${err}`);
						reject(err);
					}
				},
				autosave: true,
				autosaveInterval: 1000,
				serializationMethod: "normal",
				adapter: idbAdapter,
			});
		} catch (err) {
			writeLog(`error::${fnName}: ${err}`);
			reject(err);
		}
	});
}

export function CreateHistoryDB(): Promise<void> {
	return createDatabase(historyDBPath(), "CreateHistoryDB", (db) => {
		if (db.getCollection("userHistory") === null) {
			db.addCollection("userHistory", {
				autoupdate: true,
				disableMeta: true,
				unique: ["id"],
				indices: "id",
			});
		}
	});
}

export function CreateCollectionDB(): Promise<void> {
	return createDatabase(collectionDBPath(), "CreateCollectionDB", (db) => {
		let userCollections = db.getCollection("userCollections");
		if (userCollections === null) {
			userCollections = db.addCollection("userCollections", {
				autoupdate: true,
				disableMeta: true,
				unique: ["id"],
				indices: ["id", "variableId"],
			});
		}
		userCollections.insert({
			id: uuidv4(),
			name: "Default",
			variableId: "",
			createdTime: formatDate(),
			modifiedTime: formatDate(),
			data: [],
		});
	});
}

export function CreateMainDB(): Promise<void> {
	return createDatabase(mainDBPath(), "CreateMainDB", (db) => {
		if (db.getCollection("apiRequests") === null) {
			db.addCollection("apiRequests", {
				autoupdate: true,
				disableMeta: true,
				unique: ["id"],
				indices: "id",
			});
		}
	});
}

export function CreateVariableDB(): Promise<void> {
	return createDatabase(variableDBPath(), "CreateVariableDB", (db) => {
		let userVariables = db.getCollection("userVariables");
		if (userVariables === null) {
			userVariables = db.addCollection("userVariables", {
				autoupdate: true,
				disableMeta: true,
				unique: ["id"],
				indices: "id",
			});
		}
		userVariables.insert({
			id: uuidv4(),
			name: "Global",
			isActive: true,
			createdTime: formatDate(),
			modifiedTime: formatDate(),
			data: [],
		});
	});
}

export function CreateCookieDB(): Promise<void> {
	return createDatabase(cookieDBPath(), "CreateCookieDB", (db) => {
		if (db.getCollection("userCookies") === null) {
			db.addCollection("userCookies", {
				autoupdate: true,
				disableMeta: true,
				unique: ["id"],
				indices: ["id", "name"],
			});
		}
	});
}

export function CreateAutoRequestDB(): Promise<void> {
	return createDatabase(autoRequestDBPath(), "CreateAutoRequestDB", (db) => {
		if (db.getCollection("autoRequests") === null) {
			db.addCollection("autoRequests", {
				autoupdate: true,
				disableMeta: true,
				unique: ["id"],
				indices: ["id"],
			});
		}
	});
}

export function CreateResponseDB(): Promise<void> {
	return createDatabase(responseDBPath(), "CreateResponseDB", (db) => {
		if (db.getCollection("apiResponses") === null) {
			db.addCollection("apiResponses", {
				autoupdate: true,
				disableMeta: true,
				unique: ["id"],
				indices: ["id"],
			});
		}
	});
}

export function CreateAutoRequestHistoryDB(): Promise<void> {
	return createDatabase(
		autoRequestHistoryDBPath(),
		"CreateAutoRequestHistoryDB",
		(db) => {
			if (db.getCollection("autoRequestHistory") === null) {
				db.addCollection("autoRequestHistory", {
					autoupdate: true,
					disableMeta: true,
					unique: ["id"],
					indices: ["id", "colId", "autoReqId"],
				});
			}
		},
	);
}
