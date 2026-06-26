// Minimal OpenAPI v3 type definitions for the importer

export interface OpenAPIV3Document {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
    variables?: Record<string, { default: string; enum?: string[]; description?: string }>;
  }>;
  paths?: Record<string, OpenAPIV3PathItem>;
  components?: {
    securitySchemes?: Record<string, OpenAPIV3SecurityScheme>;
    schemas?: Record<string, OpenAPIV3Schema>;
    parameters?: Record<string, OpenAPIV3Parameter>;
    requestBodies?: Record<string, OpenAPIV3RequestBody>;
  };
  security?: Array<Record<string, string[]>>;
  tags?: Array<{ name: string; description?: string }>;
}

export interface OpenAPIV3PathItem {
  summary?: string;
  description?: string;
  parameters?: Array<OpenAPIV3Parameter | OpenAPIV3Reference>;
  get?: OpenAPIV3Operation;
  put?: OpenAPIV3Operation;
  post?: OpenAPIV3Operation;
  delete?: OpenAPIV3Operation;
  options?: OpenAPIV3Operation;
  head?: OpenAPIV3Operation;
  patch?: OpenAPIV3Operation;
  trace?: OpenAPIV3Operation;
  servers?: Array<{ url: string }>;
}

export interface OpenAPIV3Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Array<OpenAPIV3Parameter | OpenAPIV3Reference>;
  requestBody?: OpenAPIV3RequestBody | OpenAPIV3Reference;
  security?: Array<Record<string, string[]>>;
  deprecated?: boolean;
  responses?: Record<string, unknown>;
}

export interface OpenAPIV3Parameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: OpenAPIV3Schema;
  example?: unknown;
  examples?: Record<string, unknown>;
  style?: string;
  explode?: boolean;
}

export interface OpenAPIV3RequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, OpenAPIV3MediaType>;
}

export interface OpenAPIV3MediaType {
  schema?: OpenAPIV3Schema;
  example?: unknown;
  examples?: Record<string, unknown>;
  encoding?: Record<string, unknown>;
}

export interface OpenAPIV3Schema {
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  properties?: Record<string, OpenAPIV3Schema>;
  items?: OpenAPIV3Schema;
  required?: string[];
  enum?: unknown[];
  default?: unknown;
  example?: unknown;
  allOf?: OpenAPIV3Schema[];
  anyOf?: OpenAPIV3Schema[];
  oneOf?: OpenAPIV3Schema[];
  $ref?: string;
  nullable?: boolean;
  additionalProperties?: boolean | OpenAPIV3Schema;
}

export interface OpenAPIV3SecurityScheme {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect" | "mutualTLS";
  description?: string;
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string; // "bearer", "basic", "digest", etc.
  bearerFormat?: string;
  flows?: {
    implicit?: OpenAPIV3OAuthFlow;
    password?: OpenAPIV3OAuthFlow;
    clientCredentials?: OpenAPIV3OAuthFlow;
    authorizationCode?: OpenAPIV3OAuthFlow;
  };
  openIdConnectUrl?: string;
}

export interface OpenAPIV3OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface OpenAPIV3Reference {
  $ref: string;
}

export type HttpMethod = "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace";

export const HTTP_METHODS: HttpMethod[] = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
