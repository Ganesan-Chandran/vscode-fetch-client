import { FCCipher } from "../../../../../fetch-client-packages/crypto";
import { formatDate } from "../../../dateTime.helper";
import { getVariableEncryptionConfiguration, getVariableEncryptionKey } from "../../../../utils/vscodeConfig";
import { IVariable } from "../../../../types/sidebar.types";
import { v4 as uuidv4 } from "uuid";

export function ImportFCVariable(
  data: string,
  decryptKey: string,
): IVariable {
  const parsedData = JSON.parse(data);
  let secretVariables = parsedData.secretVariables;
  let encryptVariableConfiguration = getVariableEncryptionConfiguration();
  let reqData: IVariable = {
    id: uuidv4(),
    createdTime: formatDate(),
    modifiedTime: formatDate(),
    name: parsedData.name,
    isActive: parsedData.isActive,
    data: parsedData.data,
  };

  let fcCryptoEncrypt: FCCipher;

  if (encryptVariableConfiguration) {
    let key = getVariableEncryptionKey();
    fcCryptoEncrypt = new FCCipher(key);
  }

  reqData.data.forEach((item) => {
    if (secretVariables) {
      let fcCryptoDecrypt = new FCCipher(decryptKey);
      item.value = fcCryptoDecrypt.DecryptData(item.value);
    }
    if (encryptVariableConfiguration) {
      item.value = fcCryptoEncrypt.EncryptData(item.value);
    }
  });

  return reqData;
}