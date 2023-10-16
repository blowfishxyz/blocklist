# Blowfish Local Blocklists

This is a Javascript library that makes it easy to access the Blowfish Local Blocklist API: for example, to fetch the blocklist object from API, scan a domain against the blocklist and saved bloom filter.

It's designed to support React Native, Chrome Extension and Node.js environments.

## Install

```bash
npm install @blowfishxyz/blocklist
```

It's also recommended for React Native apps to install `react-native-url-polyfill`.

## Usage

In order to execute lookups, you need to fetch a **blocklist object** and **bloom filter**.
After the first fetch, you should keep these objects updated. You can save the objects in a local database
(for example, using local storage in Chrome extension).

We recommend updating it every 5 minutes.

### Basic usage

```javascript
import {
  LocalBlocklist,
  BlowfishLocalBlocklist,
  ApiConfig,
} from "@blowfishxyz/blocklist";

const apiConfig: ApiConfig = {
  basePath: "https://api.blowfish.xyz",
  // It's highly encouraged to use a proxy server to not expose your API key on the client (see: https://docs.blowfish.xyz/docs/wallet-integration-guide#optional-proxy-server).
  // When using a proxy server, replace basePath with your endpoint and set apiKey to `undefined`.
  apiKey: "you-api-key",
};
const blocklist = new BlowfishLocalBlocklist(apiConfig);

// 1. Fetch the blocklist and persist it in the storage
blocklist.fetchBlocklist();

// 2. Re-refetch the blocklist every 5 minutes
setInterval(() => blocklist.fetchBlocklist(), 1000 * 60 * 5);

// 3. Once you have a blocklist object and a bloom filter saved, you can execute lookups
const action = blocklist.scanDomain("https://scam-website.io");

if (action === Action.BLOCK) {
  // block the domain
}
```

You can skip `apiKey` and pass custom `basePath` to route the query to your backend app or a proxy.

### Bloom filter

Blocklist object links to a bloom filter. However, bloom filter is a 500 KB file, so your app should only
re-download it when nessesary.

To do that, we are tracking bloom filter's hash and re-fetching it if necessary.

Then, we save the bloom filter object itself and its hash to the `storage`.

We don't update blocklist hash more often than every 24 hours.

### Error handling

Functions that depend on API an/or network can return `null` when I/O errors are encountered.

If you would like to track errors, you can pass optional `reportError` callback to `BlowfishLocalBlocklist` constructor.

It could be called with an `Error` or with a string.

## Guides

### Browser extension

```typescript
// src/blocklist.ts
import {
  BlowfishLocalBlocklist,
  BlowifshBlocklistStorage,
} from "@blowfishxyz/blocklist";

const storage: BlowifshBlocklistStorage = {
  getLocalBlocklist: async () => {
    const storage = await chrome.storage.local.get(["blocklist:v0.0.7"]);
    return storage["blocklist:v0.0.7"];
  },
  setLocalBlocklist: async (data: LocalBlocklist) => {
    return chrome.storage.local.set({ "blocklist:v0.0.7": data });
  },
  getUserAllowlist: async () => {
    const storage = await chrome.storage.local.get(["allowlist:v0.0.7"]);
    return storage["allowlist:v0.0.7"];
  },
  setUserAllowlist: async (newAllowlist: string[]) => {
    return chrome.storage.local.set({
      "allowlist:v0.0.7": newAllowlist,
    });
  },
};

export const blocklist = new BlowfishLocalBlocklist(
  { basePath: BLOWFISH_API_BASE_URL, apiKey: undefined },
  undefined,
  storage
);
export { Action } from "@blowfishxyz/blocklist";

// src/background.ts
import Browser from "webextension-polyfill";
import { blocklist } from "./blocklist";

Browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "refetch-blocklist") {
    blocklist.fetchBlocklist();
  }
});

Browser.alarms.create("refetch-blocklist", {
  periodInMinutes: 5,
  delayInMinutes: 0,
});

// src/content-script.ts
import Browser from "webextension-polyfill";
import { blocklist, Action } from "./blocklist";

blocklist.scanDomain(window.location.href).then((action) => {
  if (action === Action.BLOCK) {
    Browser.runtime.sendMessage({
      type: "block-domain",
      host: window.location.hostname,
      href: encodeURI(window.location.href),
    });
  }
});

// src/block-screen.tsx
import { blocklist } from "./blocklist";

function proceedToBlockedDomainButtonClickHandler() {
  blocklist.allowDomainLocally(window.location.href);
}
```

## API Reference

### `BlowfishLocalBlocklist`

### Constructor arguments

- `apiConfig: ApiConfig`
  - `basePath: string`: the URL for the domain blocklist. You can use it to pass API requests to a proxy that sits between your users and Blowfish API.
  - `apiKey: string | undefined`: the API key for the Blowfish API. Can be `undefined` when using a proxy.
- `blocklistConfig: BlocklistConfig`
  - `priorityBlockLists: PriorityBlockListsEnum[] | undefined`: Always block domain if it present on one of these lists, even if it's allow-listed on one of regular allow lists (ex: `PHANTOM`, `BLOWFISH`, `BLOWFISH_AUTOMATED`, `SOLFARE`, `PHISHFORT`, `SCAMSNIFFER`, `METAMASK`)
  - `priorityAllowLists: PriorityAllowListsEnum[] | undefined`: Override domain blocking if domain is present on one of these lists, even if it's block-listed on of regular block lists (ex: `BLOWFISH`, `METAMASK`, `DEFILLAMA`)
  - `blockLists: BlockListsEnum[] | undefined`: Override domain blocking if domain is present on one of these lists, even if it's block-listed on of regular block lists (ex: `PHANTOM`, `BLOWFISH`, `BLOWFISH_AUTOMATED`, `SOLFARE`, `PHISHFORT`, `SCAMSNIFFER`, `METAMASK`)
  - `allowLists: AllowListsEnum[] | undefined`: Override domain blocking if domain is present on one of these lists, even if it's block-listed on of regular block lists (ex: `BLOWFISH`, `METAMASK`, `DEFILLAMA`)
- `storage: BlowifshBlocklistStorage`
  - `getLocalBlockList: () => Promise<LocalBlocklist | undefined>`: get the blocklist metadata with bloom filter from the storage.
  - `setLocalBlockList: (data: LocalBlocklist) => Promise<void>`: save the blocklist metadata with bloom filter to the storage.
  - `getUserAllowList: () => Promise<string[] | undefined>`: get the user allow-listed domains from the storage.
  - `setUserAllowList: (data: string[]) => Promise<void>`: save the user allow-listed domains to the storage.
- `reportError: (error: unknown) => void`: A callback function that library uses to track errors when result is `null`. (optional)

### Methods

### `fetchBlocklist(): Promise<LocalBlocklist | undefined>`

Fetches the blocklist metadata and saves it to the storage. If the fetched blocklist hash is different from one in the storage, it re-fetches the bloom filter and saves it to the storage.

If the blocklist fetch fails, the method returns `undefined` and reports the error to `reportError`.

### `scanDomain(url: string): Promise<Action>`

Scans a domain against the stored domain blocklist and returns the action to be taken (either `BLOCK` or `NONE`).

If there is no stored blocklist it fetches the blocklist using `fetchBlocklist` method and returns the resulting action.

If the fetch fails, the method returns the action `NONE` and reports the error to `reportError`.

### `allowDomainLocally(url: string): Promise<Action>`

If the user wants to proceed to the blocked domain with an explicit action, the domain is added in the user allow list (locally in the storage).

The `scanDomain` method will return `NONE` action for this domain even if it's in the blocklist.
