import { fromIni } from "@aws-sdk/credential-provider-ini";
import { getAwsDefaultRegion, getSecretsCacheDuration } from "../commonConfig";
import { loadSharedConfigFiles } from "@smithy/shared-ini-file-loader";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

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

async function getRegionForProfile(profile: string): Promise<string | undefined> {
  if (regionCache.has(profile)) { return regionCache.get(profile); }
  let region: string | undefined;
  try {
    const { configFile } = await loadSharedConfigFiles();
    region = configFile[profile]?.region;
  } catch {
  }
  region = region ?? getAwsDefaultRegion();
  regionCache.set(profile, region);
  return region;
}

function isCacheEntryValid(hit: CacheEntry | undefined, ttl: number): hit is CacheEntry {
  if (!hit) { return false; }
  if (ttl === 0) { return true; }
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

export async function getSecretCached(profile: string, secretName: string): Promise<{ ok: boolean; raw: string; cached: boolean; }> {
  const key = `${profile}::${secretName}`;
  const ttl = getSecretsCacheDuration();
  const hit = secretCache.get(key);
  if (isCacheEntryValid(hit, ttl)) {
    return { ok: true, raw: hit.value, cached: true };
  }
  try {
    const raw = await fetchSecret(profile, secretName);
    secretCache.set(key, { value: raw, fetchedAt: Date.now() });
    return { ok: true, raw, cached: false };
  } catch (e: any) {
    return { ok: false, raw: e.message ?? String(e), cached: false };
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
      results.push({ ...t, ok: false, stage: "secret", error: s.raw });
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

  const fetchResults = new Map<string, { ok: boolean; error?: string; }>();

  for (const t of targets) {
    const profile = profileMap.get(t.profile)!;

    if (!profile.ok) {
      continue;
    }

    const key = `${t.profile}::${t.secretName}`;

    if (fetchResults.has(key)) {
      continue;
    }

    const result = await fetchAndCacheSecret(t.profile, t.secretName);

    if (result.ok) {
      fetchResults.set(key, { ok: true });
    } else {
      fetchResults.set(key, { ok: false, error: result.error, });
    }
  }

  return targets.map((t) => {
    const profile = profileMap.get(t.profile)!;

    if (!profile.ok) {
      return { ...t, ok: false, stage: "profile", error: profile.error, };
    }

    const key = `${t.profile}::${t.secretName}`;
    const secret = fetchResults.get(key)!;

    if (!secret.ok) {
      return { ...t, ok: false, stage: "secret", error: secret.error, };
    }

    return { ...t, ok: true, cached: false, };
  });
}

export function clearAwsSecretCache(targets: TargetRef[]): any[] {
  const clearResults = new Map<string, boolean>();

  for (const t of targets) {
    const key = `${t.profile}::${t.secretName}`;

    if (!clearResults.has(key)) {
      const existed = secretCache.has(key);
      secretCache.delete(key);
      clearResults.set(key, existed);
    }
  }

  return targets.map((t) => {
    const key = `${t.profile}::${t.secretName}`;
    const existed = clearResults.get(key) ?? false;

    return {
      ...t,
      ok: true,
      cached: false,
      error: existed ? undefined : "Not cached",
    };
  });
}