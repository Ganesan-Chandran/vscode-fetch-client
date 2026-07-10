/**
 * Insomnia export format type definitions - supports both v4 and v5.
 *
 * Format 4: Insomnia < 8.x classic export.
 * Format 5: Insomnia 8.x+ export (structurally identical to v4 with minor additions).
 *
 * Reference: https://github.com/Kong/insomnia/blob/develop/packages/insomnia/src/common/
 */

// -Export format version constants
export const INSOMNIA_EXPORT_FORMAT_4 = 4;
export const INSOMNIA_EXPORT_FORMAT_5 = 5;

// -Top-level export document
export interface InsomniaExport {
	_type: "export";
	__export_format: 4 | 5;
	__export_date: string;
	__export_source: string;
	resources: InsomniaResource[];
}

// -Discriminated union of all resource types
export type InsomniaResource =
	| InsomniaWorkspace
	| InsomniaRequestGroup
	| InsomniaRequest
	| InsomniaEnvironment
	| InsomniaCookieJar
	| InsomniaApiSpec
	| InsomniaGrpcRequest
	| InsomniaWebSocketRequest
	| InsomniaUnknownResource;

// -Base resource
export interface InsomniaResourceBase {
	_id: string;
	_type: string;
	parentId: string | null;
	name: string;
	description?: string;
	created?: number;
	modified?: number;
	metaSortKey?: number;
}

// -Workspace (collection root)
export interface InsomniaWorkspace extends InsomniaResourceBase {
	_type: "workspace";
	/**
	 * "collection" | "design" | "environment"
	 * Only workspaces with scope "collection" (or no scope) contain API requests.
	 */
	scope?: string;
}

// -Request Group (folder)
export interface InsomniaRequestGroup extends InsomniaResourceBase {
	_type: "request_group";
	environment?: Record<string, unknown>;
	environmentPropertyOrder?: Record<string, unknown> | null;
	authentication?: InsomniaAuthentication;
}

// -HTTP Request
export interface InsomniaRequest extends InsomniaResourceBase {
	_type: "request";
	method: string;
	url: string;
	body: InsomniaBody;
	headers: InsomniaHeader[];
	parameters: InsomniaParameter[];
	authentication: InsomniaAuthentication;
	pathParameters?: InsomniaPathParameter[];
	settingStoreCookies?: boolean;
	settingSendCookies?: boolean;
	settingDisableRenderRequestBody?: boolean;
	settingEncodeUrl?: boolean;
	settingRebuildPath?: boolean;
	/** "global" | "on" | "off" */
	settingFollowRedirects?: string;
}

// -Request body
export interface InsomniaBody {
	mimeType?: string;
	/** Raw text / JSON / XML body content */
	text?: string;
	/** Form params (for urlencoded and multipart) */
	params?: InsomniaFormParam[];
	/** File path used for binary uploads */
	fileName?: string;
}

export interface InsomniaFormParam {
	id?: string;
	name: string;
	value: string;
	description?: string;
	disabled?: boolean;
	/** "file" | "text" */
	type?: string;
	/** Applicable when type === "file" */
	fileName?: string;
	multiline?: string;
}

// -Headers
export interface InsomniaHeader {
	id?: string;
	name: string;
	value: string;
	description?: string;
	disabled?: boolean;
}

// -Query / path parameters
export interface InsomniaParameter {
	id?: string;
	name: string;
	value: string;
	description?: string;
	disabled?: boolean;
}

export interface InsomniaPathParameter {
	id?: string;
	name: string;
	value: string;
}

// -Authentication
export interface InsomniaAuthentication {
	type?: string;
	disabled?: boolean;

	// basic / digest / ntlm
	username?: string;
	password?: string;

	// bearer
	token?: string;
	prefix?: string;

	// apikey
	key?: string;
	value?: string;

	/** "header" | "queryParams" */
	addTo?: string;

	// oauth2
	grantType?: string;
	clientId?: string;
	clientSecret?: string;
	accessTokenUrl?: string;
	authorizationUrl?: string;
	scope?: string;
	audience?: string;
	resource?: string;

	/** oauth2 client authentication: "basic" | "post" */
	credentialsInBody?: boolean;
	tokenPrefix?: string;

	// AWS (IAM)
	accessKeyId?: string;
	secretAccessKey?: string;
	region?: string;
	service?: string;
	sessionToken?: string;
}

// -Environment (variables)
export interface InsomniaEnvironment extends InsomniaResourceBase {
	_type: "environment";

	/** Key/value pairs. Values can be primitives or nested objects. */
	data: Record<string, unknown>;
	dataPropertyOrder?: Record<string, unknown> | null;
	color?: string | null;
	isPrivate?: boolean;
}

// -Stub types for resource kinds we intentionally skip
export interface InsomniaCookieJar extends InsomniaResourceBase {
	_type: "cookie_jar";
	cookies: unknown[];
}

export interface InsomniaApiSpec extends InsomniaResourceBase {
	_type: "api_spec";
	fileName?: string;
	contentType?: string;
	contents?: string;
}

export interface InsomniaGrpcRequest extends InsomniaResourceBase {
	_type: "grpc_request";
	url?: string;
	protoFileId?: string;
	protoMethodName?: string;
}

export interface InsomniaWebSocketRequest extends InsomniaResourceBase {
	_type: "websocket_request";
	url?: string;
	headers?: InsomniaHeader[];
	authentication?: InsomniaAuthentication;
	parameters?: InsomniaParameter[];
}

/** Catch-all for unknown or future resource types. */
export interface InsomniaUnknownResource extends InsomniaResourceBase {
	_type: string;
	[key: string]: unknown;
}
