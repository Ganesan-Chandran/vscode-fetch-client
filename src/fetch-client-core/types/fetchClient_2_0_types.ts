/** ISO-8601 datetime string, e.g. "2026-06-29T12:35:18.000Z" */
type ISODateString = string;

/** Semantic dot-path that identifies what an assertion/extractor targets.
 *  Mirrors ParametersModelMapping from the app source. */
export type AssertionSource =
  | "response.status"       // Response Code
  | "response.body"         // Response Body (raw text)
  | "response.duration"     // Response Time (ms)
  | "headers.Content-Type"
  | "headers.Content-Length"
  | "headers.Content-Encoding"
  | "headers.custom"        // any other response header → path = header name
  | "body.jsonPath"         // JSON value via JSONPath   → path = expression
  | "variable";             // environment / collection variable

export type AssertionAction =
  | "equal" | "notEqual"
  | "contains" | "notContains"
  | "regex"
  | "type"     // value type check (string / number / boolean …)
  | "isJSON"   // response body is valid JSON
  | "length"   // array / string length
  | "<" | "<=" | ">" | ">=";

export type AuthType =
  | "noauth"
  | "inherit"      // only valid on a folder/request; resolves to parent
  | "basic"
  | "bearertoken"
  | "apikey"
  | "aws"
  | "oauth2";

export type BodyType =
  | "none"
  | "formdata"
  | "urlencoded"
  | "raw"
  | "binary"
  | "graphql";

export type HttpMethod =
  | "GET" | "POST" | "PUT" | "PATCH"
  | "DELETE" | "OPTIONS" | "HEAD";


// ── Key-value pair (headers, params, form fields …) ──────────────────────────

export interface IExportKeyValue {
  key: string;
  value: string;
  /** Whether this row is active. Disabled rows are exported but not sent. */
  enabled: boolean;
  /** Optional description / comment for the pair */
  description?: string;
}


// ── Auth ──────────────────────────────────────────────────────────────────────

export interface IAuthNone { type: "noauth"; }
export interface IAuthInherit { type: "inherit"; }

export interface IAuthBasic {
  type: "basic";
  credentials: {
    username: string;
    password: string;
  };
}

export interface IAuthBearer {
  type: "bearertoken";
  credentials: {
    token: string;
    prefix: string;   // e.g. "Bearer"
  };
}

export interface IAuthApiKey {
  type: "apikey";
  credentials: {
    key: string;
    value: string;
    addTo: "header" | "queryparams";
  };
}

export interface IAuthAws {
  type: "aws";
  credentials: {
    service: string;
    region: string;
    accessKey: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
}

export interface IAuthOAuth2 {
  type: "oauth2";
  credentials: {
    tokenName: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope: string;
    grantType: "password_credentials" | "client_credentials";
    username?: string;   // only for password_credentials
    password?: string;   // only for password_credentials
    clientAuth: "header" | "body";
    advanced?: {
      audience?: string;
      resource?: string;
    };
  };
}

/** Discriminated union – parse by switching on `type` */
export type IExportAuth =
  | IAuthNone
  | IAuthInherit
  | IAuthBasic
  | IAuthBearer
  | IAuthApiKey
  | IAuthAws
  | IAuthOAuth2;


// ── Request body ──────────────────────────────────────────────────────────────

export interface IExportBodyNone { type: "none"; }

export interface IExportBodyFormData {
  type: "formdata";
  fields: IExportKeyValue[];
}

export interface IExportBodyUrlEncoded {
  type: "formurlencoded";
  fields: IExportKeyValue[];
}

export interface IExportBodyRaw {
  type: "raw";
  content: string;
  /** Language hint: "json" | "xml" | "text" | "html" | "javascript" … */
  language: string;
}

export interface IExportBodyBinary {
  type: "binary";
  fileName: string;
  /** MIME type – derived from file extension via FileTypes map */
  contentType: string;
  /** "manual" = user-overridden; "auto" = derived from extension */
  contentTypeOption: "manual" | "auto";
}

export interface IExportBodyGraphQL {
  type: "graphql";
  query: string;
  /** JSON string of the variables object */
  variables: string;
}

export type IExportBody =
  | IExportBodyNone
  | IExportBodyFormData
  | IExportBodyUrlEncoded
  | IExportBodyRaw
  | IExportBodyBinary
  | IExportBodyGraphQL;


// ── Assertions (tests) ────────────────────────────────────────────────────────

export interface IExportAssertion {
  /** What to test against – semantic source path */
  source: AssertionSource;
  /**
   * Sub-path required for:
   *   headers.custom → header name,       e.g. "X-Request-Id"
   *   body.jsonPath  → JSONPath expression, e.g. "[0].id"
   */
  path?: string;
  action: AssertionAction;
  expectedValue: string;
}


// ── Variable extractors (set-var) ─────────────────────────────────────────────

export interface IExportVariableExtractor {
  source: AssertionSource;
  path?: string;
  /** Name of the variable to assign the extracted value into */
  variableName: string;
}


// ── Pre-run requests ──────────────────────────────────────────────────────────

export interface IExportPreRunRequest {
  /** ID of the request to execute before the current one */
  requestId: string;
  /** 1-based execution order */
  order: number;
  /**
   * Optional condition: this pre-run request only executes when the assertion
   * passes.  Uses the same shape as IExportAssertion so evaluation logic is
   * shared.
   */
  condition?: IExportAssertion;
}


// ── Folder defaults (auth / headers / preRunRequests inherited by children) ───

export interface IExportFolderDefaults {
  auth: IExportAuth;
  /** Non-empty headers only */
  headers?: IExportKeyValue[];
  preRunRequests?: IExportPreRunRequest[];
}


// ── Items ─────────────────────────────────────────────────────────────────────

interface IExportItemBase {
  id: string;
  name: string;
  createdAt: ISODateString;
  /**
   * Sibling ordering within the parent. 1-based.
   * Importers must not rely on array position.
   */
  order: number;
  /**
   * ID of the parent folder.
   * Omitted (undefined) when the item sits at the collection root.
   */
  parentId?: string;
}

export interface IExportFolder extends IExportItemBase {
  type: "folder";
  /** Values cascaded to all direct children unless they override */
  defaults: IExportFolderDefaults;
}

export interface IExportRequest extends IExportItemBase {
  type: "request";
  method: HttpMethod;
  url: string;
  auth: IExportAuth;
  body: IExportBody;
  /** Omitted when empty */
  queryParams?: IExportKeyValue[];
  /** Omitted when empty */
  headers?: IExportKeyValue[];
  /** Omitted when empty */
  assertions?: IExportAssertion[];
  /** Omitted when empty */
  variableExtractors?: IExportVariableExtractor[];
  /** Omitted when empty */
  preRunRequests?: IExportPreRunRequest[];
  /** Omitted when empty */
  notes?: string;
}

export type IExportItem = IExportFolder | IExportRequest;


// ── Collection settings (root-level application defaults) ─────────────────────

export interface IExportCollectionSettings {
  auth: IExportAuth;
  /** Omitted when empty */
  headers?: IExportKeyValue[];
  /** Omitted when empty */
  preRunRequests?: IExportPreRunRequest[];
}


// ── Export metadata ───────────────────────────────────────────────────────────

export interface IExportMetadata {
  /** Collection UUID */
  id: string;
  /** Human-readable collection name */
  name: string;
  /** When the collection was first created (ISO-8601) */
  createdAt: ISODateString;
  /** When this export file was generated (ISO-8601) */
  exportedAt: ISODateString;
  /** App name and version that produced this file, e.g. "Fetch Client 2.4" */
  generator: string;
}

// ── Export variables ───────────────────────────────────────────────────────────

export interface IExportVariables {
  /** Variable UUID */
  id: string;
  /** Human-readable variable name */
  name: string;
  /** List of variables */
  items: IExportKeyValue[];
}


// ── Top-level envelope ────────────────────────────────────────────────────────

export interface IFetchClientExportV2 {
  /**
   * Schema version as an integer.
   * Increment when a breaking structural change is made.
   * Importers gate on this with a numeric comparison (schemaVersion >= 2).
   */
  schemaVersion: 2;
  /** Identity and timestamp information for this export */
  metadata: IExportMetadata;
  /** Application-level defaults inherited by all root items unless overridden */
  settings: IExportCollectionSettings;
  /**
   * Flat list of every folder and request in the collection.
   * Reconstruct the tree by grouping items by parentId.
   * Items without parentId are root-level children.
   * Sort siblings by their `order` field before rendering.
   */
  items: IExportItem[];
  /** List of variable linked with the collection */
  variables?: IExportVariables;
}
