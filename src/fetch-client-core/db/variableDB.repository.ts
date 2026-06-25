import { createAutoDBCache } from "./dbManager";
import { FCCipher } from "../../fetch-client-packages/crypto/index";
import { formatDate } from '../helpers/dateTime.helper';
import { getVariableEncryptionConfiguration, getVariableEncryptionKey, getVariableEncryptionFCConfiguration } from "../utils/vscodeConfig";
import { IVariable } from "../types/sidebar.types";
import { v4 as uuidv4 } from 'uuid';
import { variableDBPath } from './dbHelper';
import { writeLog } from "../helpers/logger/logger";

const { getLoadedDB: getVariableDB, saveDB, flush: flushVariableDB, invalidate: invalidateVariableDB } = createAutoDBCache(variableDBPath);
export { getVariableDB, flushVariableDB, invalidateVariableDB };

export async function Var_Repository_Insert(item: IVariable): Promise<void> {
	try {
		const db = await getVariableDB();
		const userVariables = db.getCollection("userVariables");
		const config = getVariableEncryptionConfiguration();
		if (config) {
			let key = getVariableEncryptionKey();
			item.data = new FCCipher(key).EncryptBulkData(item.data);
		}
		userVariables.insert(item);
		saveDB(db);
	} catch (err) {
		writeLog("error::Var_Repository_Insert(): " + err);
		throw err;
	}
}

export async function Var_Repository_InsertDuplicate(id: string): Promise<IVariable | null> {
	try {
		const db = await getVariableDB();
		const sourceData = db.getCollection("userVariables").chain().find({ 'id': id }).data({ forceClones: true, removeMeta: true });
		if (sourceData && sourceData.length > 0) {
			let distData: IVariable = {
				id: uuidv4(),
				name: sourceData[0].name.toUpperCase().trim() === "GLOBAL" ? "Global - Copy" : sourceData[0].name + " - Copy",
				createdTime: formatDate(),
				isActive: true,
				data: sourceData[0].data
			};
			db.getCollection("userVariables").insert(distData);
			await saveDB(db);
			return distData;
		}
		return null;
	} catch (err) {
		writeLog("error::Var_Repository_InsertDuplicate(): " + err);
		throw err;
	}
}

export async function Var_Repository_Update(item: IVariable): Promise<void> {
	try {
		const db = await getVariableDB();
		const config = getVariableEncryptionConfiguration();
		if (config) {
			let key = getVariableEncryptionKey();
			item.data = new FCCipher(key).EncryptBulkData(item.data);
		}
		db.getCollection("userVariables").findAndUpdate({ 'id': item.id }, itm => { itm.data = item.data; });
		saveDB(db);
	} catch (err) {
		writeLog("error::Var_Repository_Update(): " + err);
		throw err;
	}
}

export async function Var_Repository_UpdateAndReturn(item: IVariable): Promise<IVariable | null> {
	try {
		const db = await getVariableDB();
		const config = getVariableEncryptionConfiguration();
		if (config) {
			let key = getVariableEncryptionKey();
			item.data = new FCCipher(key).EncryptBulkData(item.data);
		}
		db.getCollection("userVariables").findAndUpdate({ 'id': item.id }, itm => { itm.data = item.data; });
		saveDB(db);
		let vars = db.getCollection("userVariables").find({ 'id': item.id });
		return vars && vars.length > 0 ? vars[0] as IVariable : null;
	} catch (err) {
		writeLog("error::Var_Repository_UpdateAndReturn(): " + err);
		throw err;
	}
}

export function Var_Repository_UpdateVariableSync(item: IVariable) {
	try {
		return new Promise<IVariable>(async (resolve, _reject) => {
			const result = await Var_Repository_UpdateAndReturn(item);
			resolve(result);
		});
	} catch (err) {
		writeLog("error::Var_Repository_UpdateVariableSync(): " + err);
		throw err;
	}
}

export async function Var_Repository_FindAll(): Promise<IVariable[]> {
	try {
		const db = await getVariableDB();
		const userVariables = db.getCollection("userVariables").chain().data({ forceClones: true, removeMeta: true }) as IVariable[];
		const config = getVariableEncryptionConfiguration();
		if (config) {
			let key = getVariableEncryptionKey();
			userVariables.forEach((item: IVariable) => {
				item.data = new FCCipher(key).DecryptBulkData(item.data);
			});
		}
		return userVariables;
	} catch (err) {
		writeLog("error::Var_Repository_FindAll(): " + err);
		throw err;
	}
}

export async function Var_Repository_FindById(id: string, isGlobal: boolean): Promise<IVariable[]> {
	try {
		const db = await getVariableDB();
		let userVariables = db.getCollection("userVariables").chain().find(isGlobal ? { 'name': 'Global' } : { 'id': id }).data({ forceClones: true, removeMeta: true }) as IVariable[];
		const config = getVariableEncryptionFCConfiguration();
		if (config) {
			let key = getVariableEncryptionKey();
			userVariables?.forEach((item: IVariable) => {
				item.data = new FCCipher(key).DecryptBulkData(item.data);
			});
		}
		return userVariables;
	} catch (err) {
		writeLog("error::Var_Repository_FindById(): " + err);
		throw err;
	}
}

export async function Var_Repository_FindByIdSync(id: string): Promise<IVariable | null> {
	try {
		const db = await getVariableDB();
		let userVariables = db.getCollection("userVariables").chain().find({ 'id': id }).data({ forceClones: true, removeMeta: true }) as IVariable[];
		const config = getVariableEncryptionFCConfiguration();
		if (config) {
			let key = getVariableEncryptionKey();
			userVariables?.forEach((item: IVariable) => {
				item.data = new FCCipher(key).DecryptBulkData(item.data);
			});
		}
		return userVariables && userVariables.length > 0 ? userVariables[0] as IVariable : null;
	} catch (err) {
		writeLog("error::Var_Repository_FindByIdSync(): " + err);
		throw err;
	}
}

export function Var_Repository_GetVariableByIdSync(id: string) {
	try {
		return new Promise<IVariable>(async (resolve, _reject) => {
			const result = await Var_Repository_FindByIdSync(id);
			resolve(result);
		});
	} catch (err) {
		writeLog("error::Var_Repository_GetVariableByIdSync(): " + err);
		throw err;
	}
}

export async function Var_Repository_Delete(id: string): Promise<void> {
	try {
		const db = await getVariableDB();
		db.getCollection("userVariables").findAndRemove({ 'id': id });
		await saveDB(db);
	} catch (err) {
		writeLog("error::Var_Repository_Delete(): " + err);
		throw err;
	}
}

export async function Var_Repository_Rename(id: string, name: string): Promise<void> {
	try {
		const db = await getVariableDB();
		db.getCollection("userVariables").findAndUpdate({ 'id': id }, item => { item.name = name; });
		await saveDB(db);
	} catch (err) {
		writeLog("error::Var_Repository_Rename(): " + err);
		throw err;
	}
}

export async function Var_Repository_UpdateStatus(id: string, status: boolean): Promise<void> {
	try {
		const db = await getVariableDB();
		db.getCollection("userVariables").findAndUpdate({ 'id': id }, item => { item.isActive = status; });
		await saveDB(db);
	} catch (err) {
		writeLog("error::Var_Repository_UpdateStatus(): " + err);
		throw err;
	}
}

export async function Var_Repository_FindByIdRaw(id: string): Promise<any[]> {
	try {
		const db = await getVariableDB();
		return db.getCollection("userVariables").chain().find({ 'id': id }).data({ forceClones: true, removeMeta: true });
	} catch (err) {
		writeLog("error::Var_Repository_FindByIdRaw(): " + err);
		throw err;
	}
}

export async function Var_Repository_UpdateAllWithReEncryption(oldKey: string, newKey: string): Promise<void> {
	try {
		const db = await getVariableDB();
		const userVariables = db.getCollection("userVariables").chain().data({ forceClones: true, removeMeta: true }) as IVariable[];
		userVariables.forEach((item: IVariable) => {
			item.data = new FCCipher(oldKey).DecryptBulkData(item.data);
			item.data = new FCCipher(newKey).EncryptBulkData(item.data);
			db.getCollection("userVariables").findAndUpdate({ 'id': item.id }, itm => { itm.data = item.data; });
		});
		await saveDB(db);
	} catch (err) {
		writeLog("error::Var_Repository_UpdateAllWithReEncryption(): " + err);
		throw err;
	}
}

export async function Var_Repository_EncryptAll(key: string): Promise<void> {
	try {
		const db = await getVariableDB();
		const userVariables = db.getCollection("userVariables").chain().data({ forceClones: true, removeMeta: true }) as IVariable[];
		userVariables.forEach((item: IVariable) => {
			item.data = new FCCipher(key).EncryptBulkData(item.data);
			db.getCollection("userVariables").findAndUpdate({ 'id': item.id }, itm => { itm.data = item.data; });
		});
		await saveDB(db);
	} catch (err) {
		writeLog("error::Var_Repository_EncryptAll(): " + err);
		throw err;
	}
}

export async function Var_Repository_DecryptAll(key: string): Promise<void> {
	try {
		const db = await getVariableDB();
		const userVariables = db.getCollection("userVariables").chain().data({ forceClones: true, removeMeta: true }) as IVariable[];
		userVariables?.forEach((item: IVariable) => {
			item.data = new FCCipher(key).DecryptBulkData(item.data);
			db.getCollection("userVariables").findAndUpdate({ 'id': item.id }, itm => { itm.data = item.data; });
		});
		await saveDB(db);
	} catch (err) {
		writeLog("error::Var_Repository_DecryptAll(): " + err);
		throw err;
	}
}

export async function Var_Repository_InsertRaw(reqData: IVariable): Promise<void> {
	try {
		const db = await getVariableDB();
		const userVariables = db.getCollection("userVariables");
		userVariables.insert(reqData);
		await saveDB(db);
	} catch (err) {
		writeLog("error::Var_Repository_InsertRaw(): " + err);
		throw err;
	}
}
