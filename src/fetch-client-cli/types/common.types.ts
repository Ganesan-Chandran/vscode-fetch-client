import { ExportFormat } from "../../fetch-client-core/consts/export.consts";
import { ICollections, IFolder, IVariable } from "../../fetch-client-core/types/sidebar.types";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { ITlsCertificate } from "../../fetch-client-core/types/common.types";

export interface ICliConfig {
	dbPath: string;
	encryptionEnabled: boolean;
	encryptionKey: string;
	sslCheck: boolean;
	tlsCertificate: ITlsCertificate[];
}

export interface RunCollectionFileOptions {
	file: string;
	varFile?: string;
	exportFormat?: ExportFormat;
	exportPath?: string;
}

export interface RequestLeaf {
	id: string;
	name: string;
	method: string;
	url: string;
	folderId: string;
}

export interface RequestRunContext {
	request: IRequestModel;
	collection: ICollections;
	folderId: string;
	variable: IVariable;
	effectiveVarId: string;
	requestMap?: Map<string, IRequestModel>;
}

export interface CollectionRunContext {
	collection: ICollections;
	leaves: RequestLeaf[];
	requestMap: Map<string, IRequestModel>;
	variable: IVariable;
	effectiveVarId: string;
}

export interface FolderRunContext {
	folder: IFolder;
	collection: ICollections;
	leaves: RequestLeaf[];
	requestMap: Map<string, IRequestModel>;
	variable: IVariable;
	effectiveVarId: string;
}