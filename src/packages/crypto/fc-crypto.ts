import * as crypto from "crypto";
import { ITableData } from "./types";

export class FCCipher {
	secret_key: string;
	secret_iv: string;
	algorithm = 'aes-256-cbc';

	constructor(secretKey: string) {
		this.secret_key = crypto.createHash('sha512').update(secretKey).digest('hex').substring(0, 32);
		this.secret_iv = crypto.createHash('sha512').update(secretKey).digest('hex').substring(0, 16);
	}

	EncryptData(text: string): string {
		try {
			if (!text) {
				return "";
			}
			const cipher = crypto.createCipheriv(this.algorithm, this.secret_key, this.secret_iv);
			return Buffer.from(
				cipher.update(text.toString(), 'utf8', 'hex') + cipher.final('hex')
			).toString('base64');
		}
		catch (err) {
			console.log("error::EncryptData(): - Error Mesaage : " + err);
			return "";
		}
	}

	DecryptData(encryptedData: string): string {
		try {
			if (!encryptedData) {
				return "";
			}
			const buff = Buffer.from(encryptedData.toString(), 'base64');
			const decipher = crypto.createDecipheriv(this.algorithm, this.secret_key, this.secret_iv);
			return (
				decipher.update(buff.toString('utf8'), 'hex', 'utf8') +
				decipher.final('utf8')
			);
		}
		catch (err) {
			console.log("error::DecryptData(): - Error Mesaage : " + err);
			return "";
		}
	}

	EncryptBulkData(data: ITableData[]): ITableData[] {
		data.forEach((data) => {
			data.value = this.EncryptData(data.value);
		});

		return data;
	}

	DecryptBulkData(data: ITableData[]): ITableData[] {
		data.forEach((data) => {
			data.value = this.DecryptData(data.value);
		});

		return data;
	}
}