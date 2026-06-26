import { OpenAPIV3Document } from "../../../../types/openApi.v3.types";
import { IRequestModel } from "../../../../types/request.types";
import { ISettings, IHistory, ICollections, IFolder } from "../../../../types/sidebar.types";
import { ConvertedRequest } from "./converter";
import { v4 as uuidv4 } from 'uuid';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDefaultSettings(): ISettings {
  return {
    auth: {
      authType: "none",
      userName: "",
      password: "",
      addTo: "header",
      showPwd: false,
      tokenPrefix: "Bearer",
    },
    headers: [],
    sortOrder: "none",
  };
}

function requestToHistory(request: IRequestModel): IHistory {
  return {
    id: request.id,
    method: request.method,
    name: request.name,
    url: request.url,
    createdTime: request.createdTime,
  };
}

function groupRequests(
  converted: ConvertedRequest[]
): Map<string, ConvertedRequest[]> {
  const groups = new Map<string, ConvertedRequest[]>();

  for (const item of converted) {
    const groupNames =
      item.tags.length > 0 ? item.tags : [deriveGroupFromPath(item.path)];

    for (const name of groupNames) {
      if (!groups.has(name)) { groups.set(name, []); }
      groups.get(name)!.push(item);
    }
  }

  return groups;
}

function deriveGroupFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const meaningful = parts.find(
    (p) => !p.startsWith("{") && !/^v\d+$/.test(p) && p !== "api"
  );
  return meaningful ?? path;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildCollection(
  converted: ConvertedRequest[],
  doc: OpenAPIV3Document
): { collection: ICollections; requests: IRequestModel[] } {
  const requests: IRequestModel[] = converted.map((c) => c.request);
  const groups = groupRequests(converted);

  const folders: IFolder[] = [];

  for (const [groupName, groupItems] of groups.entries()) {
    const historyItems: IHistory[] = groupItems.map((item) =>
      requestToHistory(item.request)
    );

    folders.push({
      id: uuidv4(),
      name: groupName,
      createdTime: new Date().toISOString(),
      type: "folder",
      data: historyItems,
      settings: buildDefaultSettings(),
    });
  }

  const collection: ICollections = {
    id: uuidv4(),
    name: doc.info.title || "Imported API",
    createdTime: new Date().toISOString(),
    data: folders,
    variableId: "",
    settings: buildDefaultSettings(),
  };

  return { collection, requests };
}
