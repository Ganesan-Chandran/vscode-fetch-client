// generated from https://schema.getpostman.com/json/collection/v2.1.0/collection.json
/* eslint-disable */
export const POSTMAN_SCHEMA_V2_1 = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

/**
 * This file was automatically generated by https://app.quicktype.io/
**/

export interface PostmanSchema_2_1 {
		auth?: null | Auth;
		event?: Event[];
		info: Information;
		/**
		 * Items are the basic unit for a Postman collection. You can think of them as corresponding
		 * to a single API endpoint. Each Item has one request and may have multiple API responses
		 * associated with it.
		 */
		item: Items[];
		protocolProfileBehavior?: { [key: string]: any };
		variable?: Variable[];
}

/**
 * Represents authentication helpers provided by Postman
 */
export interface Auth {
		/**
		 * The attributes for API Key Authentication.
		 */
		apikey?: ApikeyElement[];
		/**
		 * The attributes for [AWS
		 * Auth](http://docs.aws.amazon.com/AmazonS3/latest/dev/RESTAuthentication.html).
		 */
		awsv4?: ApikeyElement[];
		/**
		 * The attributes for [Basic
		 * Authentication](https://en.wikipedia.org/wiki/Basic_access_authentication).
		 */
		basic?: ApikeyElement[];
		/**
		 * The helper attributes for [Bearer Token
		 * Authentication](https://tools.ietf.org/html/rfc6750)
		 */
		bearer?: ApikeyElement[];
		/**
		 * The attributes for [Digest
		 * Authentication](https://en.wikipedia.org/wiki/Digest_access_authentication).
		 */
		digest?: ApikeyElement[];
		/**
		 * The attributes for [Akamai EdgeGrid
		 * Authentication](https://developer.akamai.com/legacy/introduction/Client_Auth.html).
		 */
		edgegrid?: ApikeyElement[];
		/**
		 * The attributes for [Hawk Authentication](https://github.com/hueniverse/hawk)
		 */
		hawk?: ApikeyElement[];
		noauth?: any;
		/**
		 * The attributes for [NTLM
		 * Authentication](https://msdn.microsoft.com/en-us/library/cc237488.aspx)
		 */
		ntlm?: ApikeyElement[];
		/**
		 * The attributes for [OAuth2](https://oauth.net/1/)
		 */
		oauth1?: ApikeyElement[];
		/**
		 * Helper attributes for [OAuth2](https://oauth.net/2/)
		 */
		oauth2?: ApikeyElement[];
		type: AuthType;
}

/**
 * Represents an attribute for any authorization method provided by Postman. For example
 * `username` and `password` are set as auth attributes for Basic Authentication method.
 */
export interface ApikeyElement {
		key: string;
		type?: string;
		value?: any;
}

export enum AuthType {
		Apikey = "apikey",
		Awsv4 = "awsv4",
		Basic = "basic",
		Bearer = "bearer",
		Digest = "digest",
		Edgegrid = "edgegrid",
		Hawk = "hawk",
		NTLM = "ntlm",
		Noauth = "noauth",
		Oauth1 = "oauth1",
		Oauth2 = "oauth2",
}

/**
 * Postman allows you to configure scripts to run when specific events occur. These scripts
 * are stored here, and can be referenced in the collection by their ID.
 *
 * Defines a script associated with an associated event name
 */
export interface Event {
		/**
		 * Indicates whether the event is disabled. If absent, the event is assumed to be enabled.
		 */
		disabled?: boolean;
		/**
		 * A unique identifier for the enclosing event.
		 */
		id?: string;
		/**
		 * Can be set to `test` or `prerequest` for test scripts or pre-request scripts respectively.
		 */
		listen: string;
		script?: Script;
}

/**
 * A script is a snippet of Javascript code that can be used to to perform setup or teardown
 * operations on a particular response.
 */
export interface Script {
		exec?: string[] | string;
		/**
		 * A unique, user defined identifier that can  be used to refer to this script from requests.
		 */
		id?: string;
		/**
		 * Script name
		 */
		name?: string;
		src?: URLObject | string;
		/**
		 * Type of the script. E.g: 'text/javascript'
		 */
		type?: string;
}

export interface URLObject {
		/**
		 * Contains the URL fragment (if any). Usually this is not transmitted over the network, but
		 * it could be useful to store this in some cases.
		 */
		hash?: string;
		/**
		 * The host for the URL, E.g: api.yourdomain.com. Can be stored as a string or as an array
		 * of strings.
		 */
		host?: string[] | string;
		path?: Array<PathObject | string> | string;
		/**
		 * The port number present in this URL. An empty value implies 80/443 depending on whether
		 * the protocol field contains http/https.
		 */
		port?: string;
		/**
		 * The protocol associated with the request, E.g: 'http'
		 */
		protocol?: string;
		/**
		 * An array of QueryParams, which is basically the query string part of the URL, parsed into
		 * separate variables
		 */
		query?: QueryParam[];
		/**
		 * The string representation of the request URL, including the protocol, host, path, hash,
		 * query parameter(s) and path variable(s).
		 */
		raw?: string;
		/**
		 * Postman supports path variables with the syntax `/path/:variableName/to/somewhere`. These
		 * variables are stored in this field.
		 */
		variable?: Variable[];
}

export interface PathObject {
		type?: string;
		value?: string;
}

export interface QueryParam {
		description?: null | Description | string;
		/**
		 * If set to true, the current query parameter will not be sent with the request.
		 */
		disabled?: boolean;
		key?: null | string;
		value?: null | string;
}

export interface Description {
		/**
		 * The content of the description goes here, as a raw string.
		 */
		content?: string;
		/**
		 * Holds the mime type of the raw description content. E.g: 'text/markdown' or 'text/html'.
		 * The type is used to correctly render the description when generating documentation, or in
		 * the Postman app.
		 */
		type?: string;
		/**
		 * Description can have versions associated with it, which should be put in this property.
		 */
		version?: any;
}

/**
 * Collection variables allow you to define a set of variables, that are a *part of the
 * collection*, as opposed to environments, which are separate entities.
 * *Note: Collection variables must not contain any sensitive information.*
 *
 * Using variables in your Postman requests eliminates the need to duplicate requests, which
 * can save a lot of time. Variables can be defined, and referenced to from any part of a
 * request.
 */
export interface Variable {
		description?: null | Description | string;
		disabled?: boolean;
		/**
		 * A variable ID is a unique user-defined value that identifies the variable within a
		 * collection. In traditional terms, this would be a variable name.
		 */
		id?: string;
		/**
		 * A variable key is a human friendly value that identifies the variable within a
		 * collection. In traditional terms, this would be a variable name.
		 */
		key?: string;
		/**
		 * Variable name
		 */
		name?: string;
		/**
		 * When set to true, indicates that this variable has been set by Postman
		 */
		system?: boolean;
		/**
		 * A variable may have multiple types. This field specifies the type of the variable.
		 */
		type?: VariableType;
		/**
		 * The value that a variable holds in this collection. Ultimately, the variables will be
		 * replaced by this value, when say running a set of requests from a collection
		 */
		value?: any;
}

/**
 * A variable may have multiple types. This field specifies the type of the variable.
 */
export enum VariableType {
		Any = "any",
		Boolean = "boolean",
		Number = "number",
		String = "string",
}

/**
 * Detailed description of the info block
 */
export interface Information {
		/**
		 * Every collection is identified by the unique value of this field. The value of this field
		 * is usually easiest to generate using a UID generator function. If you already have a
		 * collection, it is recommended that you maintain the same id since changing the id usually
		 * implies that is a different collection than it was originally.
		 * *Note: This field exists for compatibility reasons with Collection Format V1.*
		 */
		_postman_id?: string;
		description?: null | Description | string;
		/**
		 * A collection's friendly name is defined by this field. You would want to set this field
		 * to a value that would allow you to easily identify this collection among a bunch of other
		 * collections, as such outlining its usage or content.
		 */
		name: string;
		/**
		 * This should ideally hold a link to the Postman schema that is used to validate this
		 * collection. E.g: https://schema.getpostman.com/collection/v1
		 */
		schema: string;
		version?: CollectionVersionObject | string;
}

export interface CollectionVersionObject {
		/**
		 * A human friendly identifier to make sense of the version numbers. E.g: 'beta-3'
		 */
		identifier?: string;
		/**
		 * Increment this number if you make changes to the collection that changes its behaviour.
		 * E.g: Removing or adding new test scripts. (partly or completely).
		 */
		major: number;
		meta?: any;
		/**
		 * You should increment this number if you make changes that will not break anything that
		 * uses the collection. E.g: removing a folder.
		 */
		minor: number;
		/**
		 * Ideally, minor changes to a collection should result in the increment of this number.
		 */
		patch: number;
}

/**
 * Items are entities which contain an actual HTTP request, and sample responses attached to
 * it.
 *
 * One of the primary goals of Postman is to organize the development of APIs. To this end,
 * it is necessary to be able to group requests together. This can be achived using
 * 'Folders'. A folder just is an ordered set of requests.
 */
export interface Items {
		description?: null | Description | string;
		event?: Event[];
		/**
		 * A unique ID that is used to identify collections internally
		 */
		id?: string;
		/**
		 * A human readable identifier for the current item.
		 *
		 * A folder's friendly name is defined by this field. You would want to set this field to a
		 * value that would allow you to easily identify this folder.
		 */
		name?: string;
		protocolProfileBehavior?: { [key: string]: any };
		request?: RequestObject | string;
		response?: Array<any[] | boolean | number | number | null | ResponseObject | string>;
		variable?: Variable[];
		auth?: null | Auth;
		/**
		 * Items are entities which contain an actual HTTP request, and sample responses attached to
		 * it. Folders may contain many items.
		 */
		item?: Items[];
}

export interface RequestObject {
		auth?: null | Auth;
		body?: null | Body;
		certificate?: Certificate;
		description?: null | Description | string;
		header?: Header[] | string;
		method?: string;
		proxy?: ProxyConfig;
		url?: URLObject | string;
}

/**
 * This field contains the data usually contained in the request body.
 */
export interface Body {
		/**
		 * When set to true, prevents request body from being sent.
		 */
		disabled?: boolean;
		file?: File;
		formdata?: FormParameter[];
		graphql?: { [key: string]: any };
		/**
		 * Postman stores the type of data associated with this request in this field.
		 */
		mode?: Mode;
		/**
		 * Additional configurations and options set for various body modes.
		 */
		options?: { [key: string]: any };
		raw?: string;
		urlencoded?: URLEncodedParameter[];
}

export interface File {
		content?: string;
		src?: null | string;
}

export interface FormParameter {
		/**
		 * Override Content-Type header of this form data entity.
		 */
		contentType?: string;
		description?: null | Description | string;
		/**
		 * When set to true, prevents this form data entity from being sent.
		 */
		disabled?: boolean;
		key: string;
		type?: FormParameterType;
		value?: string;
		src?: any[] | null | string;
}

export enum FormParameterType {
		File = "file",
		Text = "text",
}

/**
 * Postman stores the type of data associated with this request in this field.
 */
export enum Mode {
		File = "file",
		Formdata = "formdata",
		Graphql = "graphql",
		Raw = "raw",
		Urlencoded = "urlencoded",
}

export interface URLEncodedParameter {
		description?: null | Description | string;
		disabled?: boolean;
		key: string;
		value?: string;
}

/**
 * A representation of an ssl certificate
 */
export interface Certificate {
		/**
		 * An object containing path to file certificate, on the file system
		 */
		cert?: CERT;
		/**
		 * An object containing path to file containing private key, on the file system
		 */
		key?: Key;
		/**
		 * A list of Url match pattern strings, to identify Urls this certificate can be used for.
		 */
		matches?: string[];
		/**
		 * A name for the certificate for user reference
		 */
		name?: string;
		/**
		 * The passphrase for the certificate
		 */
		passphrase?: string;
}

/**
 * An object containing path to file certificate, on the file system
 */
export interface CERT {
		/**
		 * The path to file containing key for certificate, on the file system
		 */
		src?: any;
}

/**
 * An object containing path to file containing private key, on the file system
 */
export interface Key {
		/**
		 * The path to file containing key for certificate, on the file system
		 */
		src?: any;
}

/**
 * A representation for a list of headers
 *
 * Represents a single HTTP Header
 */
export interface Header {
		description?: null | Description | string;
		/**
		 * If set to true, the current header will not be sent with requests.
		 */
		disabled?: boolean;
		/**
		 * This holds the LHS of the HTTP Header, e.g ``Content-Type`` or ``X-Custom-Header``
		 */
		key: string;
		/**
		 * The value (or the RHS) of the Header is stored in this field.
		 */
		value: string;
}

/**
 * Using the Proxy, you can configure your custom proxy into the postman for particular url
 * match
 */
export interface ProxyConfig {
		/**
		 * When set to true, ignores this proxy configuration entity
		 */
		disabled?: boolean;
		/**
		 * The proxy server host
		 */
		host?: string;
		/**
		 * The Url match for which the proxy config is defined
		 */
		match?: string;
		/**
		 * The proxy server port
		 */
		port?: number;
		/**
		 * The tunneling details for the proxy config
		 */
		tunnel?: boolean;
}

export interface ResponseObject {
		/**
		 * The raw text of the response.
		 */
		body?: null | string;
		/**
		 * The numerical response code, example: 200, 201, 404, etc.
		 */
		code?: number;
		cookie?: Cookie[];
		header?: Array<Header | string> | null | string;
		/**
		 * A unique, user defined identifier that can  be used to refer to this response from
		 * requests.
		 */
		id?: string;
		originalRequest?: RequestObject | string;
		/**
		 * The time taken by the request to complete. If a number, the unit is milliseconds. If the
		 * response is manually created, this can be set to `null`.
		 */
		responseTime?: number | null | string;
		/**
		 * The response status, e.g: '200 OK'
		 */
		status?: string;
		/**
		 * Set of timing information related to request and response in milliseconds
		 */
		timings?: { [key: string]: any } | null;
}

/**
 * A Cookie, that follows the [Google Chrome
 * format](https://developer.chrome.com/extensions/cookies)
 */
export interface Cookie {
		/**
		 * The domain for which this cookie is valid.
		 */
		domain: string;
		/**
		 * When the cookie expires.
		 */
		expires?: number | string;
		/**
		 * Custom attributes for a cookie go here, such as the [Priority
		 * Field](https://code.google.com/p/chromium/issues/detail?id=232693)
		 */
		extensions?: any[];
		/**
		 * True if the cookie is a host-only cookie. (i.e. a request's URL domain must exactly match
		 * the domain of the cookie).
		 */
		hostOnly?: boolean;
		/**
		 * Indicates if this cookie is HTTP Only. (if True, the cookie is inaccessible to
		 * client-side scripts)
		 */
		httpOnly?: boolean;
		maxAge?: string;
		/**
		 * This is the name of the Cookie.
		 */
		name?: string;
		/**
		 * The path associated with the Cookie.
		 */
		path: string;
		/**
		 * Indicates if the 'secure' flag is set on the Cookie, meaning that it is transmitted over
		 * secure connections only. (typically HTTPS)
		 */
		secure?: boolean;
		/**
		 * True if the cookie is a session cookie.
		 */
		session?: boolean;
		/**
		 * The value of the Cookie.
		 */
		value?: string;
}
