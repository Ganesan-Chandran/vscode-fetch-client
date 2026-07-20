import { FCCipher } from "../../../../../fetch-client-packages/crypto";
import { formatDate } from "../../../dateTime.helper";
import { getVariableEncryptionConfiguration } from "../../../../utils/commonConfig";
import { getVariableEncryptionKey } from "../../../../utils/vscodeConfig";
import { ITableData } from "../../../../types/common.types";
import { IVariable } from "../../../../types/sidebar.types";
import { ThunderClientVariableSchema_1_2 } from "../../../../types/thunderClient_1_2.variable_types";
import { v4 as uuidv4 } from "uuid";

export function ImporTCVariable(
  data: string,
): IVariable {
  const parsedData = JSON.parse(data) as ThunderClientVariableSchema_1_2;

  let varData: ITableData[] = [];

  let encryptVariableConfiguration = getVariableEncryptionConfiguration();

  let key = getVariableEncryptionKey();
  let fcCrypto = new FCCipher(key);

  for (let i = 0; i < parsedData.variables?.length; i++) {
    if (parsedData.variables[i].name) {
      varData.push({
        isChecked: true,
        key: parsedData.variables[i].name,
        value: encryptVariableConfiguration
          ? fcCrypto.EncryptData(parsedData.variables[i].value)
          : parsedData.variables[i].value,
      });
    }
  }

  const convertedData: IVariable = {
    id: uuidv4(),
    createdTime: formatDate(),
    modifiedTime: formatDate(),
    name: parsedData.environmentName,
    isActive: true,
    data: varData,
  };

  return convertedData;
}