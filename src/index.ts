import fetch from "cross-fetch";
import { ApiConfig, Action, BloomFilter, DomainBlocklist } from "./types";
import { lookup } from "./bloomFilter";

export type { ApiConfig, Action, BloomFilter, DomainBlocklist };

export const DEFAULT_BLOCKLIST_URL =
  "https://api.blowfish.xyz/v0/domains/blocklist";

// Fetch blocklist JSON object from Blowfish API with link to bloom filter and recent domains.
export async function fetchDomainBlocklist(
  apiConfig: ApiConfig,
  priorityBlockLists: string[] = [],
  priorityAllowLists: string[] = []
): Promise<DomainBlocklist | null> {
  const apiKeyConfig = apiConfig.apiKey
    ? { headers: { "x-api-key": apiConfig.apiKey } }
    : {};
  // We wrap errors with a null so any downtime won't break user's browsing flow.
  const response = await fetch(apiConfig.domainBlocklistUrl, {
    method: "POST",
    body: JSON.stringify({
      priorityBlockLists,
      priorityAllowLists,
    }),
    ...apiKeyConfig,
  });
  if (!response.ok) {
    return null;
  }
  // Catch JSON decoding errors
  try {
    return (await response.json()) as DomainBlocklist;
  } catch {
    return null;
  }
}

// Fetch bloom filter JSON object from CDN url.
export async function fetchDomainBlocklistBloomFilter(
  url: string
): Promise<BloomFilter | null> {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  // Catch JSON decoding errors
  try {
    return (await response.json()) as BloomFilter;
  } catch {
    return null;
  }
}

// Scan if url's domain is blocked by the bloom filter or is contained in the "recent domains" list.
//
// This function does not implement any priority logic and considers any domain in the blocklist blocked.
export function scanDomain(
  blocklist: DomainBlocklist,
  bloomFilter: BloomFilter,
  url: string
): Action {
  const domain = new URL(url).hostname.toLowerCase();
  const domainParts = domain.split(".");
  // Lookup all possible subdomains.
  // E.g. for abc.cde.google.com, we'll lookup: abc.cde.google.com, cde.google.com, google.com
  // Blowfish API is responsible for not including public suffix domains to the bloom filter.
  for (let i = 0; i < domainParts.length - 1; i++) {
    const domainToLookup = domainParts.slice(i).join(".");
    if (blocklist.recent.includes(domainToLookup)) {
      return Action.BLOCK;
    }
    if (lookup(bloomFilter, domainToLookup)) {
      return Action.BLOCK;
    }
  }
  return Action.NONE;
}
