import fetch from "cross-fetch";
import { URL } from "whatwg-url";
import { ApiConfig, Action, BloomFilter, DomainBlocklist } from "./types";
import { lookup } from "./bloomFilter";

export type { ApiConfig, Action, BloomFilter, DomainBlocklist };

export const DEFAULT_BLOCKLIST_URL =
  "https://api.blowfish.xyz/v0/domains/blocklist";

export type ErrorCallback = (error: unknown) => void;

// Fetch blocklist JSON object from Blowfish API with link to bloom filter and recent domains.
//
// Blocklist should be fetched/updated in two steps.
// 1) Fetch a blocklist JSON object from Blowfish API with a link to bloom filter and recent domains.
// Start using recent domains immediately.
// 2) If stored bloom filter hash does not match `bloomFilter.hash`, fetch new bloom filter
// from `bloomFilter.url` and store it.
//
// `bloomFilter.url` and `bloomFilter.hash` are updated daily. `recent` is updated as soon new domains are added.
// This optimization allows to save bandwidth and never download unchanged bloom filter, while still updating
// recent domains every 5 minutes.
export async function fetchDomainBlocklist(
  apiConfig: ApiConfig,
  priorityBlockLists: string[] | null = null,
  priorityAllowLists: string[] | null = null,
  reportError: ErrorCallback | undefined = undefined
): Promise<DomainBlocklist | null> {
  const apiKeyConfig = apiConfig.apiKey
    ? { headers: { "x-api-key": apiConfig.apiKey } }
    : {};
  try {
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
      if (reportError) {
        reportError(await response.text());
      }
      return null;
    }
    // Catch JSON decoding errors too.
    return (await response.json()) as DomainBlocklist;
  } catch (error: unknown) {
    if (reportError) {
      reportError(error);
    }
    return null;
  }
}

// Fetch bloom filter JSON object from CDN url.
export async function fetchDomainBlocklistBloomFilter(
  url: string,
  reportError: ErrorCallback | undefined = undefined
): Promise<BloomFilter | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (reportError) {
        reportError(await response.text());
      }
      return null;
    }
    // Catch JSON decoding errors too.
    return (await response.json()) as BloomFilter;
  } catch (error: unknown) {
    if (reportError) {
      reportError(error);
    }
    return null;
  }
}

// Scan if url's domain is blocked by the bloom filter or is contained in the "recent domains" list.
//
// This function does not implement any priority logic and considers any domain in the blocklist blocked.
// `recent` has to be passed from stored blocklist object.
export function scanDomain(
  bloomFilter: BloomFilter,
  recentlyAdded: string[],
  recentlyRemoved: string[],
  url: string
): Action {
  const domain = new URL(url).hostname.toLowerCase();
  const domainParts = domain.split(".");
  // Lookup all possible subdomains.
  // E.g. for abc.cde.google.com, we'll lookup: abc.cde.google.com, cde.google.com, google.com
  // Blowfish API is responsible for not including public suffix domains to the bloom filter.
  for (let i = 0; i < domainParts.length - 1; i++) {
    const domainToLookup = domainParts.slice(i).join(".");
    if (recentlyAdded.includes(domainToLookup)) {
      return Action.BLOCK;
    }
    if (
      lookup(bloomFilter, domainToLookup) &&
      !recentlyRemoved.includes(domainToLookup)
    ) {
      return Action.BLOCK;
    }
  }
  return Action.NONE;
}
