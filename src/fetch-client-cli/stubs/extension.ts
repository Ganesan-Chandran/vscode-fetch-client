/**
 * Stub for src/extension.ts used in CLI context.
 * Provides the exported symbols that fetch-client-core modules reference
 * (primarily pubSub) without pulling in any VS Code UI code.
 */

import { PubSub } from '../../fetch-client-core/utils/pubSub';
import { IPubSubMessage } from '../../fetch-client-core/utils/pubSub';

export const pubSub = new PubSub<IPubSubMessage>();

// Stub out everything else that is exported from the real extension.ts
export const vsCodeLogger: any = null;
export const sideBarProvider: any = null;

export function OpenExistingItem(
  _id?: string,
  _name?: string,
  _collId?: string,
  _folderId?: string,
  _varId?: string,
  _type?: string,
  _newTab?: boolean
): void { }
