import { ITableData } from "../../fetch-client-core/types/common.types";
import * as crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const KEY_LENGTH = 32; // AES-256 key length in bytes
const IV_LENGTH = 16;  // CBC IV length in bytes

export class FCCipher {
	private readonly key: Buffer;
	private readonly iv: Buffer;

	constructor(secretKey: string) {
		const digest = crypto.createHash("sha512").update(secretKey).digest("hex");
		this.key = Buffer.from(digest.substring(0, KEY_LENGTH), "utf8");
		this.iv = Buffer.from(digest.substring(0, IV_LENGTH), "utf8");
	}

	EncryptData(text: string): string {
		if (!text) {
			return "";
		}
		try {
			const cipher = crypto.createCipheriv(ALGORITHM, this.key, this.iv);
			const hexEncrypted = cipher.update(text, "utf8", "hex") + cipher.final("hex");
			return Buffer.from(hexEncrypted, "utf8").toString("base64");
		} catch (err) {
			this.logError("EncryptData", err);
			return "";
		}
	}

	DecryptData(encryptedData: string): string {
		try {
			return this.decryptInternal(encryptedData);
		} catch (err) {
			this.logError("DecryptData", err);
			return "";
		}
	}

	private decryptInternal(encryptedData: string): string {
		if (!encryptedData) {
			return "";
		}
		const hexEncrypted = Buffer.from(encryptedData, "base64").toString("utf8");
		const decipher = crypto.createDecipheriv(ALGORITHM, this.key, this.iv);
		return decipher.update(hexEncrypted, "hex", "utf8") + decipher.final("utf8");
	}

	EncryptBulkData(records: ITableData[]): ITableData[] {
		for (const record of records) {
			record.value = this.EncryptData(record.value);
		}
		return records;
	}

	DecryptBulkData(records: ITableData[]): ITableData[] {
		for (const record of records) {
			try {
				record.value = this.decryptInternal(record.value);
			} catch {
				// leave value as-is if it isn't decryptable
			}
		}
		return records;
	}

	private logError(method: string, err: unknown): void {
		console.log(`error::${method}(): - Error Message: ${err instanceof Error ? err.message : String(err)}`);
	}
}
