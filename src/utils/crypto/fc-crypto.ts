// This Dummy Package used for development purpose.
import { CryptoMode, ITableData } from "./types";

export class FCCipher {

	secret_key: string = "";

	constructor(cryptoMode: CryptoMode) {
		this.secret_key = cryptoMode === CryptoMode.Export ? "Export_Dummy" : "Transit_Dummy";
	}

	EncryptData(text: string): string {
		try {
			if (!text) {
				return "";
			}
			return text;
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
			return encryptedData;
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
