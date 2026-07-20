// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

import { ITlsCertificate } from "../types/common.types";

export let variableEncryptionKeyCache = "";
let variableEncryptionConfiguration = false;
let SSLCheck = true;
let tlsCertificates: ITlsCertificate[] = null;
let secretsCacheDuration: number = 0;
let awsDefaultRegion: string = "";

// ---------------------------------------------------------------------------
// Variable encryption state (set once on activation, updated on config change)
// ---------------------------------------------------------------------------

export function setVariableEncryptionConfiguration(enabled: boolean): void {
	variableEncryptionConfiguration = enabled;
}

export function setVariableEncryptionKey(key: string): void {
	variableEncryptionKeyCache = key;
}

export function getVariableEncryptionConfiguration(): boolean {
	return variableEncryptionConfiguration;
}

// ---------------------------------------------------------------------------
// SSL and TLS configuration
// ---------------------------------------------------------------------------

export function setSSLCheck(enabled: boolean): void {
	SSLCheck = enabled;
}

export function getSSLCheck(): boolean {
	return SSLCheck;
}

export function setTLSCertificates(config: ITlsCertificate[]): void {
	tlsCertificates = config;
}

export function getTLSCertificates(): ITlsCertificate[] {
	return tlsCertificates;
}

// ---------------------------------------------------------------------------
// AWS Configuration
// ---------------------------------------------------------------------------

export function setSecretsCacheDuration(duration: number): void {
	secretsCacheDuration = duration;
}

export function setAwsDefaultRegion(region: string): void {
	awsDefaultRegion = region;
}

export function getSecretsCacheDuration(): number {
	return secretsCacheDuration;
}

export function getAwsDefaultRegion(): string {
	return awsDefaultRegion;
}
