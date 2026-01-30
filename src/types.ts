export type ApiConfig = {
  basePath: string;
  apiKey?: string;
};

export type DomainBlocklist = {
  bloomFilter: { url: string; hash: string };
  recentlyAdded: string[];
  recentlyRemoved: string[];
  nextCursor: string;
};

export type BloomFilter = {
  bitVector: string;
  k: number;
  hash: string;
  bits: number;
  salt: string;
};

export enum Action {
  BLOCK = "BLOCK",
  NONE = "NONE",
}

export type ScanDomainResult =
  | { action: Action.BLOCK; hostname: string }
  | { action: Action.NONE; hostname: null };

export const BLOWFISH_API_BASE_URL = "https://api.blowfish.xyz";
