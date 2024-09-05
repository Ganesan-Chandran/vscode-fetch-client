import loki, { LokiFsAdapter } from "lokijs";
import { v4 as uuidv4 } from "uuid";
import { formatDate } from "../helper";
import { writeLog } from "../logger/logger";
import {
	autoRequestDBPath,
	collectionDBPath,
	cookieDBPath,
	historyDBPath,
	mainDBPath,
	variableDBPath,
} from "./dbPaths";

export function CreateHistoryDB(): any {

	let db: LokiConstructor;

	try {
		const idbAdapter = new LokiFsAdapter();
		db = new loki(historyDBPath(), {
			autoload: true,
			autoloadCallback: dbInitialize,
			autosave: true,
			autosaveInterval: 1000,
			serializationMethod: "normal",
			adapter: idbAdapter,
		});
	} catch (err: any) {
		writeLog("error::CreateHistoryDB(): " + err);
	}


	function dbInitialize() {
		try {
			const userHistory = db.getCollection("userHistory");
			if (userHistory === null) {
				db.addCollection("userHistory", { autoupdate: true, disableMeta: true, unique: ["id"], indices: "id" });
			}

			db.saveDatabase();
		} catch (err: any) {
			writeLog("error::CreateHistoryDB()::dbInitialize(): " + err);
		}
	}
}

export function CreateCollectionDB(): any {

	let db: LokiConstructor;

	try {
		const idbAdapter = new LokiFsAdapter();
		db = new loki(collectionDBPath(), {
			autoload: true,
			autoloadCallback: dbInitialize,
			autosave: true,
			autosaveInterval: 1000,
			serializationMethod: "normal",
			adapter: idbAdapter,
		});
	} catch (err: any) {
		writeLog("error::CreateCollectionDB(): " + err);
	}


	function dbInitialize() {
		try {
			let userCollections = db.getCollection("userCollections");
			if (userCollections === null) {
				userCollections = db.addCollection("userCollections", { autoupdate: true, disableMeta: true, unique: ["id"], indices: ["id", "variableId"] });
			}
			userCollections.insert({ id: uuidv4(), name: "Default", variableId: "", createdTime: formatDate(), data: [] });
			db.saveDatabase();
		} catch (err: any) {
			writeLog("error::CreateCollectionDB()::dbInitialize(): " + err);
		}
	}
}


export function CreateMainDB(): any {

	let db: LokiConstructor;

	try {
		const idbAdapter = new LokiFsAdapter();
		db = new loki(mainDBPath(), {
			autoload: true,
			autoloadCallback: dbInitialize,
			autosave: true,
			autosaveInterval: 1000,
			serializationMethod: "normal",
			adapter: idbAdapter,
		});
	}
	catch (err: any) {
		writeLog("error::CreateMainDB(): " + err);
	}


	function dbInitialize() {
		try {
			const apiRequests = db.getCollection("apiRequests");
			if (apiRequests === null) {
				db.addCollection("apiRequests", { autoupdate: true, disableMeta: true, unique: ["id"], indices: "id" });
			}
			db.saveDatabase();
		} catch (err: any) {
			writeLog("error::CreateMainDB::dbInitialize(): " + err);
		}
	}
}

export function CreateVariableDB(): any {
	let db: LokiConstructor;
	try {
		const idbAdapter = new LokiFsAdapter();
		db = new loki(variableDBPath(), {
			autoload: true,
			autoloadCallback: dbInitialize,
			autosave: true,
			autosaveInterval: 1000,
			serializationMethod: "normal",
			adapter: idbAdapter,
		});
	} catch (err: any) {
		writeLog("error::CreateVariableDB(): " + err);
	}

	function dbInitialize() {
		try {
			let userCollections = db.getCollection("userVariables");
			if (userCollections === null) {
				userCollections = db.addCollection("userVariables", { autoupdate: true, disableMeta: true, unique: ["id"], indices: "id" });
			}

			userCollections.insert({ id: uuidv4(), name: "Global", isActive: true, createdTime: formatDate(), data: [] });

			db.saveDatabase();
		} catch (err: any) {
			writeLog("error::CreateVariableDB()::dbInitialize(): " + err);
		}
	}
}

export function CreateCookieDB(): any {
	let db: LokiConstructor;
	try {
		const idbAdapter = new LokiFsAdapter();
		db = new loki(cookieDBPath(), {
			autoload: true,
			autoloadCallback: dbInitialize,
			autosave: true,
			autosaveInterval: 1000,
			serializationMethod: "normal",
			adapter: idbAdapter,
		});
	} catch (err: any) {
		writeLog("error::CreateVariableDB(): " + err);
	}


	function dbInitialize() {
		try {
			let userCookies = db.getCollection("userCookies");
			if (userCookies === null) {
				userCookies = db.addCollection("userCookies", { autoupdate: true, disableMeta: true, unique: ["id"], indices: ["id", "name"] });
			}
			db.saveDatabase();
		} catch (err: any) {
			writeLog("error::CreateCookieDB()::dbInitialize(): " + err);
		}
	}
}

export function CreateAutoRequestDB(): any {
	let db: LokiConstructor;
	try {
		const idbAdapter = new LokiFsAdapter();
		db = new loki(autoRequestDBPath(), {
			autoload: true,
			autoloadCallback: dbInitialize,
			autosave: true,
			autosaveInterval: 1000,
			serializationMethod: "normal",
			adapter: idbAdapter,
		});
	} catch (err: any) {
		writeLog("error::CreateAutoRequestDB(): " + err);
	}


	function dbInitialize() {
		try {
			let userCookies = db.getCollection("autoRequests");
			if (userCookies === null) {
				userCookies = db.addCollection("autoRequests", { autoupdate: true, disableMeta: true, unique: ["id"], indices: ["id"] });
			}
			db.saveDatabase();
		} catch (err: any) {
			writeLog("error::CreateAutoRequestDB()::dbInitialize(): " + err);
		}
	}
}
