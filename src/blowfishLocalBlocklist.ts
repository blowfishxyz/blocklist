import {
  DownloadBlocklistRequest,
  createMultiChainClient,
} from "@blowfishxyz/api-client/v20230605";
import { ApiConfig, BlowifshBlocklistStorage, LocalBlocklist } from "./types";
import {
  Action,
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
  private _blockList: LocalBlocklist | undefined = undefined;
  private _allowList: string[] = [];

  getLocalBlocklist() {
    return Promise.resolve(this._blockList);
  }
  setLocalBlocklist(data: LocalBlocklist) {
    this._blockList = data;
    return Promise.resolve();
  }
  getUserAllowlist() {
    return Promise.resolve(this._allowList);
  }
  setUserAllowlist(data: string[]) {
    this._allowList = data;
    return Promise.resolve();
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
    let storedBlocklist = await this.storage.getLocalBlocklist();

    logger("scanDomain fetch 1", storedBlocklist);

    if (!storedBlocklist) {
      storedBlocklist = await withRetry(() => this.fetchBlocklist(), 3);
      logger("scanDomain fetch 2", storedBlocklist);
    }

    if (!storedBlocklist) {
      logger("scanDomain error", storedBlocklist);
      this.reportError(new Error("Failed to fetch blocklist"));
      // Note(metreniuk): should we fail silently here?
      return Action.NONE;
    }

    this.storage.setLocalBlocklist(storedBlocklist);
    const { domainBlocklist, bloomFilter } = storedBlocklist;

    const action = scanDomain(
      bloomFilter,
      domainBlocklist.recentlyAdded,
      domainBlocklist.recentlyRemoved,
      url
    );

    if (action === Action.BLOCK) {
      logger("scanDomain BLOCK");
      const allowlist = (await this.storage.getUserAllowlist()) || [];
      const hostname = new URL(url).hostname;
      if (allowlist.includes(hostname)) {
        logger("scanDomain allowlist", allowlist, hostname);
        return Action.NONE;
      }
    }

    logger("scanDomain action", action);

    return action;
  }

  async fetchBlocklist(): Promise<LocalBlocklist | undefined> {
    logger("fetchBlocklist start");
    const domainBlocklist = await this.client.downloadBlocklist(
      this.blocklistConfig
    );
    logger("fetchBlocklist fetched", domainBlocklist);
    const existingBlocklist = await this.storage.getLocalBlocklist();
    logger("fetchBlocklist storage", existingBlocklist);

    if (
      existingBlocklist &&
      existingBlocklist.domainBlocklist &&
      existingBlocklist.domainBlocklist.bloomFilter.hash ===
        domainBlocklist?.bloomFilter.hash
    ) {
      return existingBlocklist;
    }

    if (!domainBlocklist) {
      logger("fetchBlocklist fail 1 domainBlocklist");
      this.reportError(new Error("Failed to fetch blocklist"));
      return;
    }

    const bloomFilter = await fetchDomainBlocklistBloomFilter(
      domainBlocklist.bloomFilter.url,
      this.reportError
    );

    if (!bloomFilter) {
      logger("fetchBlocklist fail 2 bloomFilter");
      this.reportError(new Error("Failed to fetch bloom filter"));
      return;
    }

    await this.storage.setLocalBlocklist({
      domainBlocklist,
      bloomFilter,
    });

    logger("fetchBlocklist success ", domainBlocklist, bloomFilter);

    return {
      domainBlocklist,
      bloomFilter,
    };
  }

  async allowDomainLocally(domain: string) {
    const existing = (await this.storage.getUserAllowlist()) || [];
    await this.storage.setUserAllowlist(existing.concat(domain));
    logger("allowDomainLocally success ");
  }
}

export { Action };
