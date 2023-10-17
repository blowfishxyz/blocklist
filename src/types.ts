import {
  DownloadBlocklistRequestAllowListsEnum,
  DownloadBlocklistRequestBlockListsEnum,
  DownloadBlocklistRequestPriorityAllowListsEnum,
  DownloadBlocklistRequestPriorityBlockListsEnum,
} from "./blowfishLocalBlocklist";

export type ApiConfig = {
  basePath: string;
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

export enum BlowifshBlocklistStorageKey {
  DomainBlocklist = "BF:DOMAIN_BLOCKLIST:0.0.7",
  BloomFilter = "BF:BLOCKLIST_BLOOM_FILTER:0.0.7",
  UserAllowlist = "BF:USER_ALLOWLIST:0.0.7",
}

export interface BlowifshBlocklistStorage {
  getItem: <T>(key: BlowifshBlocklistStorageKey) => Promise<T | undefined>;
  setItem: <T>(key: BlowifshBlocklistStorageKey, data: T) => Promise<void>;
}

export type BlockListsEnum = DownloadBlocklistRequestBlockListsEnum;
export type AllowListsEnum = DownloadBlocklistRequestAllowListsEnum;
export type PriorityBlockListsEnum =
  DownloadBlocklistRequestPriorityBlockListsEnum;
export type PriorityAllowListsEnum =
  DownloadBlocklistRequestPriorityAllowListsEnum;

export enum Action {
  BLOCK = "BLOCK",
  NONE = "NONE",
}
