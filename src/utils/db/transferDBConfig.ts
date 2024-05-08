import {
  getExtDbPath,
  getGlobalStorageUri,
  getExtLocalDbPath,
} from "./getExtDbPath";
import { getKeepInLocalPathConfiguration } from "../vscodeConfig";
import fs from "fs";

/**
 * In case we use the config option keepInLocalPath,
 * we have to move the db files to the local path of the user if the option is enabled.
 * And the db files should be moved to the global path if the option is disabled.
 */
export const transferDbConfig = () => {
  const pathState = getKeepInLocalPathConfiguration();

  if (pathState) {
    fs.renameSync(getGlobalStorageUri(), getExtDbPath());
  } else {
    fs.renameSync(getExtLocalDbPath(), getGlobalStorageUri());
  }
};
