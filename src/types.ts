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

export type LocalBlocklist = {
  domainBlocklist: DomainBlocklist;
  bloomFilter: BloomFilter;
};

export interface BlowifshBlocklistStorage {
  getLocalBlocklist: () => Promise<LocalBlocklist | undefined>;
  setLocalBlocklist: (data: LocalBlocklist) => Promise<void>;
  getUserAllowlist: () => Promise<string[] | undefined>;
  setUserAllowlist: (data: string[]) => Promise<void>;
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
