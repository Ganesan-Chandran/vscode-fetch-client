import { FCCipher } from "../../../../../fetch-client-packages/crypto";
import { formatDate } from "../../../dateTime.helper";
import { getVariableEncryptionConfiguration, getVariableEncryptionKey } from "../../../../utils/vscodeConfig";
import { ITableData } from "../../../../types/common.types";
import { IVariable } from "../../../../types/sidebar.types";
import { PostmanVariableSchema_2_1 } from "../../../../types/postman_2_1.variable_types";
import { v4 as uuidv4 } from "uuid";
import { writeLog } from "../../../logger/logger";

export function ImportPostmanVariables(data: string): IVariable {
	const parsedData = JSON.parse(data) as PostmanVariableSchema_2_1;
	let varData: ITableData[] = [];

	if (
		!parsedData?._postman_exported_using?.includes("Postman/") ||
		!parsedData?._postman_variable_scope?.includes("environment")
	) {
		writeLog(
			"error::ImportPostmanVariable(): - Error Mesaage : Could not import the variable - Invalid data.",
		);
		throw new Error("Could not import the variable - Invalid data.");
	}

	let encryptVariableConfiguration = getVariableEncryptionConfiguration();
	let fcCrypto: FCCipher;

	if (encryptVariableConfiguration) {
		let key = getVariableEncryptionKey();
		fcCrypto = new FCCipher(key);
	}

	for (let i = 0; i < parsedData.values?.length; i++) {
		if (parsedData.values[i].key) {
			varData.push({
				isChecked: parsedData.values[i].enabled,
				key: parsedData.values[i].key,
				value: encryptVariableConfiguration
					? fcCrypto.EncryptData(parsedData.values[i].value)
					: parsedData.values[i].value,
			});
		}
	}

	const convertedData: IVariable = {
		id: uuidv4(),
		createdTime: formatDate(),
		modifiedTime: formatDate(),
		name: parsedData.name,
		isActive: true,
		data: varData,
	};

  return convertedData;
}