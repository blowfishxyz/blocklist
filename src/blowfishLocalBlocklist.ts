import {
  DownloadBlocklistRequest,
  createMultiChainClient,
} from "@blowfishxyz/api-client/v20230605";
import {
  ApiConfig,
  BlowfishBlocklistStorageKey,
  BlowfishBlocklistStorage,
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
import { InMemoryStorage } from "./inMemoryStorage";

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

export class BlowfishLocalBlocklist {
  private readonly client: ReturnType<typeof createMultiChainClient>;
  constructor(
    apiConfig: ApiConfig,
    private readonly blocklistConfig:
      | DownloadBlocklistRequest
      | undefined = undefined,
    private readonly storage: BlowfishBlocklistStorage = new InMemoryStorage(),
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
      BlowfishBlocklistStorageKey.DomainBlocklist
    );
    let storedBloomFilter = await this.storage.getItem<BloomFilter>(
      BlowfishBlocklistStorageKey.BloomFilter
    );

    logger("scanDomain fetch 1", storedDomainBlocklist);

    if (!storedDomainBlocklist || !storedBloomFilter) {
      await withRetry(() => this.fetchBlocklist(), 3);
      storedDomainBlocklist = await this.storage.getItem<DomainBlocklist>(
        BlowfishBlocklistStorageKey.DomainBlocklist
      );
      storedBloomFilter = await this.storage.getItem<BloomFilter>(
        BlowfishBlocklistStorageKey.BloomFilter
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
          BlowfishBlocklistStorageKey.UserAllowlist
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
      BlowfishBlocklistStorageKey.DomainBlocklist
    );
    logger("fetchBlocklist storage", storedDomainBlocklist);

    if (
      storedDomainBlocklist &&
      storedDomainBlocklist.bloomFilter.hash ===
        domainBlocklist?.bloomFilter.hash
    ) {
      await this.storage.setItem(
        BlowfishBlocklistStorageKey.DomainBlocklist,
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
      BlowfishBlocklistStorageKey.DomainBlocklist,
      domainBlocklist
    );
    await this.storage.setItem(
      BlowfishBlocklistStorageKey.BloomFilter,
      bloomFilterObject
    );
    logger("fetchBlocklist success ", domainBlocklist, bloomFilterObject);
  }

  async allowDomainLocally(domain: string) {
    const existing =
      (await this.storage.getItem<string[]>(
        BlowfishBlocklistStorageKey.UserAllowlist
      )) || [];
    await this.storage.setItem(
      BlowfishBlocklistStorageKey.UserAllowlist,
      existing.concat(domain)
    );
    logger("allowDomainLocally success ");
  }
}

export { Action };
