import fs from "fs";
import {
  getExtDbBKPPath,
  getExtLocalDbPath,
  getGlobalStorageUri
} from "./getExtDbPath";
import { getSaveToWorkspaceConfiguration, updateSaveToWorkspaceConfiguration, updateWorkspacePathConfiguration } from "../vscodeConfig";
import path from "path";

/**
 * In case we use the config option keepInLocalPath,
 * we have to move the db files to the local path of the user if the option is enabled.
 * And the db files should be moved to the global path if the option is disabled.
 */
export const transferDbConfig = () => {
  let customPath = getExtLocalDbPath();

  const pathState = getSaveToWorkspaceConfiguration();
  
  const actualPath = getGlobalStorageUri();

  if (actualPath && customPath && actualPath !== customPath) {
    if (pathState) {
      // First time taking bakeup of the data
      let bkpPath = getExtDbBKPPath();
      if (!fs.existsSync(bkpPath)) {
        fs.cpSync(actualPath, bkpPath, { recursive: true });
      }
      fs.renameSync(actualPath, customPath);
      updateWorkspacePathConfiguration(customPath);
    } else {
      
      fs.renameSync(customPath, actualPath);
      updateWorkspacePathConfiguration("");
    }
  }
};
