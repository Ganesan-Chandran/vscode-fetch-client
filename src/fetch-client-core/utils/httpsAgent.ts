import { getSSLCheck, getTLSCertificates } from "./vscodeConfig";
import { ITlsCertificate } from "../types/common.types";
import * as fs from "fs/promises";
import * as https from "https";

const httpsAgentCache = new Map<string, https.Agent>();

export async function getHttpsAgent(
	url: string,
): Promise<https.Agent | undefined> {
	const uri = new URL(url);

	// HTTP doesn't use TLS
	if (uri.protocol !== "https:") {
		return undefined;
	}

	const rejectUnauthorized = getSSLCheck();
	const certificates = getTLSCertificates();

  // No matching client certificate
	if (!certificates || certificates?.length === 0) {
		return getDefaultHttpsAgent(rejectUnauthorized);
	}

	const certificate = findCertificate(uri.hostname, certificates);

	// No matching client certificate
	if (!certificate) {
		return getDefaultHttpsAgent(rejectUnauthorized);
	}

	const cacheKey = JSON.stringify({
		host: certificate.host,
		type: certificate.type,
		certPath: certificate.certPath,
		keyPath: certificate.keyPath,
		pfxPath: certificate.pfxPath,
		rejectUnauthorized,
	});

	const cached = httpsAgentCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	let agent: https.Agent;

	if (certificate.type === "pem") {
		if (!certificate.certPath || !certificate.keyPath) {
			throw new Error(
				`Invalid PEM certificate configuration for '${certificate.host}'.`,
			);
		}

		try {
			agent = new https.Agent({
				rejectUnauthorized,
				cert: await fs.readFile(certificate.certPath),
				key: await fs.readFile(certificate.keyPath),
				passphrase: certificate.passphrase,
			});
		} catch (err) {
			throw new Error(
				`Unable to load certificate '${certificate.host}': ${
					(err as Error).message
				}`,
			);
		}
	} else {
		if (!certificate.pfxPath) {
			throw new Error(
				`Invalid PFX certificate configuration for '${certificate.host}'.`,
			);
		}

		try {
			agent = new https.Agent({
				rejectUnauthorized,
				pfx: await fs.readFile(certificate.pfxPath),
				passphrase: certificate.passphrase,
			});
		} catch (err) {
			throw new Error(
				`Unable to load certificate '${certificate.host}': ${
					(err as Error).message
				}`,
			);
		}
	}

	httpsAgentCache.set(cacheKey, agent);

	return agent;
}

function getDefaultHttpsAgent(
	rejectUnauthorized: boolean,
): https.Agent {
	const cacheKey = `default:${rejectUnauthorized}`;

	const cached = httpsAgentCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const agent = new https.Agent({
		rejectUnauthorized,
	});

	httpsAgentCache.set(cacheKey, agent);

	return agent;
}

export function findCertificate(
	host: string,
	certificates: ITlsCertificate[],
): ITlsCertificate | undefined {
	host = host.toLowerCase();

	// Exact match first
	const exact = certificates.find(
		(c) =>
			c.enabled !== false &&
			c.host.toLowerCase() === host,
	);

	if (exact) {
		return exact;
	}

	// Most specific wildcard match (*.api.company.com beats *.company.com)
	const wildcards = certificates
		.filter((c) => {
			if (c.enabled === false) {
				return false;
			}

			const pattern = c.host.toLowerCase();

			return (
				pattern.startsWith("*.") &&
				host.endsWith(pattern.substring(1))
			);
		})
		.sort((a, b) => b.host.length - a.host.length);

	return wildcards[0];
}

export function clearHttpsAgentCache(): void {
	httpsAgentCache.clear();
}
