// ─────────────────────────────────────────────────────────────────────────────
// Public result type
// ─────────────────────────────────────────────────────────────────────────────

import { IRequestModel } from "./request.types";
import { ICollections, IVariable } from "./sidebar.types";

export interface OpenApiImportResult {
	fcCollection: ICollections;
	fcRequests: IRequestModel[];
	fcVariable: IVariable | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// OpenAPI v3 type definitions
//
// Only fields that the importer actually reads are declared.  Extra fields in
// the document are ignored – no accidental use of undeclared data.
// ─────────────────────────────────────────────────────────────────────────────

export interface OARef {
	$ref: string;
}
export type MaybeRef<T> = T | OARef;

export interface OADocument {
	openapi: string;
	info: OAInfo;
	servers?: OAServer[];
	paths?: Record<string, OAPathItem>;
	components?: OAComponents;
	tags?: OATag[];
	security?: OASecurityRequirement[];
}

export interface OAInfo {
	title: string;
	version: string;
	description?: string;
}
export interface OATag {
	name: string;
	description?: string;
}

export interface OAServer {
	url: string;
	description?: string;
	variables?: Record<string, OAServerVariable>;
}
export interface OAServerVariable {
	default: string;
	enum?: string[];
	description?: string;
}

export interface OAPathItem {
	summary?: string;
	description?: string;
	parameters?: MaybeRef<OAParameter>[];
	servers?: OAServer[];
	// HTTP verbs – typed as the full union so we can index by method string
	get?: OAOperation;
	post?: OAOperation;
	put?: OAOperation;
	patch?: OAOperation;
	delete?: OAOperation;
	options?: OAOperation;
	head?: OAOperation;
}

export interface OAOperation {
	operationId?: string;
	summary?: string;
	description?: string;
	tags?: string[];
	parameters?: MaybeRef<OAParameter>[];
	requestBody?: MaybeRef<OARequestBody>;
	security?: OASecurityRequirement[];
	deprecated?: boolean;
}

export interface OAParameter {
	name: string;
	in: "query" | "header" | "path" | "cookie";
	description?: string;
	required?: boolean;
	deprecated?: boolean;
	schema?: MaybeRef<OASchema>;
	example?: unknown;
	examples?: Record<string, MaybeRef<OAExample>>;
}

export interface OARequestBody {
	description?: string;
	required?: boolean;
	content: Record<string, OAMediaType>;
}

export interface OAMediaType {
	schema?: MaybeRef<OASchema>;
	example?: unknown;
	examples?: Record<string, MaybeRef<OAExample>>;
}

export interface OASchema {
	type?: string;
	format?: string;
	properties?: Record<string, MaybeRef<OASchema>>;
	items?: MaybeRef<OASchema>;
	required?: string[];
	example?: unknown;
	default?: unknown;
	enum?: unknown[];
	$ref?: string;
	allOf?: MaybeRef<OASchema>[];
	oneOf?: MaybeRef<OASchema>[];
	anyOf?: MaybeRef<OASchema>[];
	additionalProperties?: boolean | MaybeRef<OASchema>;
	description?: string;
	nullable?: boolean;
}

export interface OAExample {
	summary?: string;
	description?: string;
	value?: unknown;
}

export interface OAComponents {
	schemas?: Record<string, OASchema>;
	securitySchemes?: Record<string, OASecurityScheme>;
	parameters?: Record<string, OAParameter>;
	requestBodies?: Record<string, OARequestBody>;
}

type OASecuritySchemeType = "apiKey" | "http" | "oauth2" | "openIdConnect";

export interface OASecurityScheme {
	type: OASecuritySchemeType;
	description?: string;
	// apiKey
	name?: string;
	in?: "query" | "header" | "cookie";
	// http
	scheme?: string;
	bearerFormat?: string;
	// oauth2
	flows?: OAOAuthFlows;
}

export interface OAOAuthFlows {
	implicit?: OAOAuthFlow;
	password?: OAOAuthFlow;
	clientCredentials?: OAOAuthFlow;
	authorizationCode?: OAOAuthFlow;
}

export interface OAOAuthFlow {
	authorizationUrl?: string;
	tokenUrl?: string;
	scopes: Record<string, string>;
}

export type OASecurityRequirement = Record<string, string[]>;
