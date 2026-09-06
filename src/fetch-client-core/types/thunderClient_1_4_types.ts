import {
	FoldersEntity,
	RequestsEntity,
	Settings,
} from "./thunderClient_1_2_types";

export interface ThunderClient_Schema_1_4 {
	clientName: string;
	collectionName: string;
	collectionId: string;
	dateExported: string;
	version: string;
	folders?: FoldersEntity[] | null;
	requests?: RequestsEntity[] | null;
	settings: Settings;
	ref: string;
}
