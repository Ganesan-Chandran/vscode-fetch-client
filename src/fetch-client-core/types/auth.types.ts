export interface IAwsAuth {
	service: string;
	region: string;
	accessKey: string;
	secretAccessKey: string;
	sessionToken: string;
}

export interface IAdvancedOAuth {
	audience: string;
	resource: string;
}

export interface IOAuth {
	authorizationUrl: string;
	codeChallengeMethod: CodeChallengeMethod;
	clientAuth: ClientAuth;
	clientId: string;
	clientSecret: string;
	grantType: GrantType;
	password?: string;
	scope: string;
	tokenName: string;
	tokenUrl: string;
	username?: string;
	advancedOpt: IAdvancedOAuth;
}

export enum GrantType {
	Client_Crd = "client_credentials",
	PWD_Crd = "password_credentials",
	Authorization_Code = "authorization_code",
	Authorization_Code_PKCE = "authorization_code_pkce",
}

export enum CodeChallengeMethod {
	S256 = "S256",
	Plain = "plain",
}

export enum ClientAuth {
	Header = "header",
	Body = "body",
}

export interface IAuth {
	authType: string;
	userName: string;
	password: string;
	addTo: string;
	showPwd: boolean;
	tokenPrefix: string;
	aws?: IAwsAuth;
	oauth?: IOAuth;
}
