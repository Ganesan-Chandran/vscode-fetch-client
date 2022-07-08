export const apiKeyAddTo = [
  { name: "Query Params", value: "queryparams" },
  { name: "Header", value: "header" }
];


export const basicAuthTypes = [
  { name: "No Auth", value: "noauth" },
  { name: "API Key", value: "apikey" },
  { name: "Bearer Token", value: "bearertoken" },
  { name: "Basic Auth", value: "basic" },
  { name: "AWS Signature", value: "aws" }
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
  "aws": "AWS Signature"
};