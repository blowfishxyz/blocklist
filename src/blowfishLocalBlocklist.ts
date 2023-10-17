import {
  DownloadBlocklistRequest,
  createMultiChainClient,
} from "@blowfishxyz/api-client/v20230605";
import {
  ApiConfig,
  BlowifshBlocklistStorageKey,
  BlowifshBlocklistStorage,
} from "./types";
import {
  Action,
  BloomFilter,
  DomainBlocklist,
  fetchDomainBlocklistBloomFilter,
  fetcher,
  scanDomain,
  withRetry,
} from "./utils";

export {
  DownloadBlocklistRequestAllowListsEnum,
  DownloadBlocklistRequestBlockListsEnum,
  DownloadBlocklistRequestPriorityAllowListsEnum,
  DownloadBlocklistRequestPriorityBlockListsEnum,
} from "@blowfishxyz/api-client/v20230605";

const logger =
  process.env.NODE_ENV === "production"
    ? () => {
        /**/
      }
    : console.log;

class InMemoryStorageImpl implements BlowifshBlocklistStorage {
  private _storage: { [k in BlowifshBlocklistStorageKey]?: unknown } = {};

  async getItem<T>(key: BlowifshBlocklistStorageKey) {
    return this._storage[key] as T | undefined;
  }

  async setItem(key: BlowifshBlocklistStorageKey, data: unknown) {
    this._storage[key] = data;
  }
}

export class BlowfishLocalBlocklist {
  private readonly client: ReturnType<typeof createMultiChainClient>;
  constructor(
    apiConfig: ApiConfig,
    private readonly blocklistConfig:
      | DownloadBlocklistRequest
      | undefined = undefined,
    private readonly storage: BlowifshBlocklistStorage = new InMemoryStorageImpl(),
    private readonly reportError: (err: unknown) => void = () => {
      /**/
    }
  ) {
    this.client = createMultiChainClient({
      basePath: apiConfig.basePath,
      apiKey: apiConfig.apiKey,
      fetchApi: fetcher,
    });
  }

  async scanDomain(url: string): Promise<Action> {
    logger("scanDomain start");
    let storedDomainBlocklist = await this.storage.getItem<DomainBlocklist>(
      BlowifshBlocklistStorageKey.DomainBlocklist
    );
    let storedBloomFilter = await this.storage.getItem<BloomFilter>(
      BlowifshBlocklistStorageKey.BloomFilter
    );

    logger("scanDomain fetch 1", storedDomainBlocklist);

    if (!storedDomainBlocklist || !storedBloomFilter) {
      await withRetry(() => this.fetchBlocklist(), 3);
      storedDomainBlocklist = await this.storage.getItem<DomainBlocklist>(
        BlowifshBlocklistStorageKey.DomainBlocklist
      );
      storedBloomFilter = await this.storage.getItem<BloomFilter>(
        BlowifshBlocklistStorageKey.BloomFilter
      );
      logger("scanDomain fetch 2", storedDomainBlocklist);
    }

    if (!storedDomainBlocklist || !storedBloomFilter) {
      logger("scanDomain error", storedDomainBlocklist);
      this.reportError(new Error("Failed to fetch blocklist"));
      // Note(metreniuk): should we fail silently here?
      return Action.NONE;
    }

    const action = scanDomain(
      storedBloomFilter,
      storedDomainBlocklist.recentlyAdded,
      storedDomainBlocklist.recentlyRemoved,
      url
    );

    if (action === Action.BLOCK) {
      logger("scanDomain BLOCK");
      const allowlist =
        (await this.storage.getItem<string[]>(
          BlowifshBlocklistStorageKey.UserAllowlist
        )) || [];
      const hostname = new URL(url).hostname;
      if (allowlist.includes(hostname)) {
        logger("scanDomain allowlist", allowlist, hostname);
        return Action.NONE;
      }
    }

    logger("scanDomain action", action);

    return action;
  }

  async fetchBlocklist(): Promise<void> {
    logger("fetchBlocklist start");
    const domainBlocklist = await this.client.downloadBlocklist(
      this.blocklistConfig
    );
    logger("fetchBlocklist fetched", domainBlocklist);
    const storedDomainBlocklist = await this.storage.getItem<DomainBlocklist>(
      BlowifshBlocklistStorageKey.DomainBlocklist
    );
    logger("fetchBlocklist storage", storedDomainBlocklist);

    if (
      storedDomainBlocklist &&
      storedDomainBlocklist.bloomFilter.hash ===
        domainBlocklist?.bloomFilter.hash
    ) {
      await this.storage.setItem(
        BlowifshBlocklistStorageKey.DomainBlocklist,
        domainBlocklist
      );

      return;
    }

    if (!domainBlocklist) {
      logger("fetchBlocklist fail 1 domainBlocklist");
      this.reportError(new Error("Failed to fetch blocklist"));
      return;
    }

    const bloomFilterObject = await fetchDomainBlocklistBloomFilter(
      domainBlocklist.bloomFilter.url,
      this.reportError
    );

    if (!bloomFilterObject) {
      logger("fetchBlocklist fail 2 bloomFilterObject");
      this.reportError(new Error("Failed to fetch bloom filter"));
      return;
    }
    await this.storage.setItem(
      BlowifshBlocklistStorageKey.DomainBlocklist,
      domainBlocklist
    );
    await this.storage.setItem(
      BlowifshBlocklistStorageKey.BloomFilter,
      bloomFilterObject
    );
    logger("fetchBlocklist success ", domainBlocklist, bloomFilterObject);
  }

  async allowDomainLocally(domain: string) {
    const existing =
      (await this.storage.getItem<string[]>(
        BlowifshBlocklistStorageKey.UserAllowlist
      )) || [];
    await this.storage.setItem(
      BlowifshBlocklistStorageKey.UserAllowlist,
      existing.concat(domain)
    );
    logger("allowDomainLocally success ");
  }
}

export { Action };
