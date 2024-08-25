import { ClientAuth, GrantType } from "../../../redux/types";

export const apiKeyAddTo = [
	{ name: "Query Params", value: "queryparams" },
	{ name: "Header", value: "header" }
];

export const grantTypeOpt = [
	{ name: "Password Credentials", value: GrantType.PWD_Crd },
	{ name: "Client Credentials", value: GrantType.Client_Crd }
];

export const clientAuthOpt = [
	{ name: "As Auth Header", value: ClientAuth.Header },
	{ name: "As Request Body", value: ClientAuth.Body }
];

export const basicAuthTypes = [
	{ name: "No Auth", value: "noauth" },
	{ name: "API Key", value: "apikey" },
	{ name: "Bearer Token", value: "bearertoken" },
	{ name: "Basic Auth", value: "basic" },
	{ name: "AWS Signature", value: "aws" },
	{ name: "OAuth 2.0", value: "oauth2" }
];

export const allAuthTypes = [
	{ name: "Inherit auth from parent", value: "inherit" },
	...basicAuthTypes
];

export const authCollection = {
	"noauth": "No Auth",
	"apikey": "API Key",
	"bearertoken": "Bearer Token",
	"basic": "Basic Auth",
	"aws": "AWS Signature",
	"oauth2": "OAuth 2.0"
};
