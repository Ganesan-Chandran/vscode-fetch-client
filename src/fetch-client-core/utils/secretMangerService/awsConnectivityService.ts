import { fromIni } from "@aws-sdk/credential-provider-ini";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { loadSharedConfigFiles } from "@smithy/shared-ini-file-loader";
import * as vscode from "vscode";

interface CacheEntry { value: string; fetchedAt: number; }
const secretCache = new Map<string, CacheEntry>();

const regionCache = new Map<string, string | undefined>();

interface TargetRef {
  variableId: string;
  variableName: string;
  profile: string;
  secretName: string;
  jsonProperty?: string;
}

function fallbackRegion(): string | undefined {
  return vscode.workspace
    .getConfiguration("fetch-client")
    .get<string>("awsDefaultRegion");
}

async function getRegionForProfile(profile: string): Promise<string | undefined> {
  if (regionCache.has(profile)) { return regionCache.get(profile); }
  let region: string | undefined;
  try {
    const { configFile } = await loadSharedConfigFiles();
    region = configFile[profile]?.region;
  } catch {
  }
  region = region ?? fallbackRegion();
  regionCache.set(profile, region);
  return region;
}

function cacheTtlMs(): number {
  return vscode.workspace
    .getConfiguration("fetch-client")
    .get<number>("secretsCacheDuration", 0);
}

function isCacheEntryValid(hit: CacheEntry | undefined, ttl: number): hit is CacheEntry {
  if (!hit) { return false; }
  if (ttl === 0) { return true; } // no expiry - always valid until manually cleared
  return Date.now() - hit.fetchedAt < ttl;
}

async function checkProfile(profile: string) {
  try {
    const region = await getRegionForProfile(profile);
    if (!region) {
      return {
        profile,
        ok: false,
        error: `No region configured for profile "${profile}". Add "region" under [profile ${profile}] in ~/.aws/config, or set fetch-client.awsDefaultRegion.`,
      };
    }
    const client = new STSClient({ region, credentials: fromIni({ profile }) });
    const res = await client.send(new GetCallerIdentityCommand({}));
    return { profile, ok: true, account: res.Account, arn: res.Arn };
  } catch (e: any) {
    return { profile, ok: false, error: e.message ?? String(e) };
  }
}

async function fetchSecret(profile: string, secretName: string) {
  const region = await getRegionForProfile(profile);
  const client = new SecretsManagerClient({ region, credentials: fromIni({ profile }) });
  const res = await client.send(new GetSecretValueCommand({ SecretId: secretName }));
  return res.SecretString ?? "";
}

async function getSecretCached(profile: string, secretName: string) {
  const key = `${profile}::${secretName}`;
  const ttl = cacheTtlMs();
  const hit = secretCache.get(key);
  if (isCacheEntryValid(hit, ttl)) {
    return { ok: true, raw: hit.value, cached: true };
  }
  try {
    const raw = await fetchSecret(profile, secretName);
    secretCache.set(key, { value: raw, fetchedAt: Date.now() });
    return { ok: true, raw, cached: false };
  } catch (e: any) {
    return { ok: false, error: e.message ?? String(e) };
  }
}

async function fetchAndCacheSecret(profile: string, secretName: string) {
  const key = `${profile}::${secretName}`;
  try {
    const raw = await fetchSecret(profile, secretName);
    secretCache.set(key, { value: raw, fetchedAt: Date.now() });
    return { ok: true, raw, cached: false };
  } catch (e: any) {
    return { ok: false, error: e.message ?? String(e) };
  }
}

export async function handleAwsCheckConnectivity(targets: TargetRef[]): Promise<any[]> {
  const uniqueProfiles = [...new Set(targets.map((t) => t.profile))];
  const profileResults = await Promise.all(uniqueProfiles.map(checkProfile));
  const profileMap = new Map(profileResults.map((r) => [r.profile, r]));

  const results = [];
  for (const t of targets) {
    const p = profileMap.get(t.profile)!;
    if (!p.ok) {
      results.push({ ...t, ok: false, stage: "profile", error: p.error });
      continue;
    }
    const s = await getSecretCached(t.profile, t.secretName);
    if (!s.ok) {
      results.push({ ...t, ok: false, stage: "secret", error: s.error });
      continue;
    }
    results.push({ ...t, ok: true, cached: s.cached });
  }
  return results;
}

export async function handleAwsFetchAndCache(targets: TargetRef[]): Promise<any[]> {
  const uniqueProfiles = [...new Set(targets.map((t) => t.profile))];
  const profileResults = await Promise.all(uniqueProfiles.map(checkProfile));
  const profileMap = new Map(profileResults.map((r) => [r.profile, r]));

  const results = [];
  for (const t of targets) {
    const p = profileMap.get(t.profile)!;
    if (!p.ok) {
      results.push({ ...t, ok: false, stage: "profile", error: p.error });
      continue;
    }
    const s = await fetchAndCacheSecret(t.profile, t.secretName);
    if (!s.ok) {
      results.push({ ...t, ok: false, stage: "secret", error: s.error });
      continue;
    }
    results.push({ ...t, ok: true, cached: false });
  }
  return results;
}

export function clearAwsSecretCache(): void {
  secretCache.clear();
}
