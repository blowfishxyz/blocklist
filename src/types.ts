export type ApiConfig = {
  domainBlocklistUrl: string;
  apiKey?: string;
};

export type DomainBlocklist = {
  bloomFilter: { url: string; hash: string };
  recentlyAdded: string[];
  recentlyRemoved: string[];
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
