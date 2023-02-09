# Blowfish Local Blocklists
This is a Javascript library that makes it easy to access the Blowfish Local Blocklist API: for example, to fetch the blocklist object from API, scan a domain against the blocklist and saved bloom filter.

It's designed to support React Native, Chrome Extension and Node.js environments.

## Install
```bash
npm install @blowfishxyz/blocklist
```

## Usage

In order to execute lookups, you need to fetch a **blocklist object** and **bloom filter**. 
After the first fetch, you should keep these objects updated. You can save the objects in a local database
(for example, using local storage in Chrome extension).

### Blocklist object
This object includes a link to the bloom filter and the recently added/removed domains domains. 

We recommend updating it every 5 minutes.

```javascript
import { fetchBlocklist, DEFAULT_BLOCKLIST_URL } from '@blowfishxyz/blocklist';

const apiConfig: ApiConfig = {
    domainBlocklistUrl: DEFAULT_BLOCKLIST_URL,
    apiKey: "",
};
const blocklist = await fetchDomainBlocklist(apiConfig);

if (blocklist) {
    [...] // save blocklist.recentlyAdded and blocklist.recentlyRemoved to a local database
}
```

You can skip `apiKey` and pass custom `domainBlocklistUrl` to route the query to your backend app.

### Bloom filter

Blocklist object links to a bloom filter. However, bloom filter is a 500 KB file, so your app should only
re-download it when nessesary.

To do that, consider tracking `blocklist.bloomFilter.hash` in your local database.
If app doesn't have a stored hash, or stored hash doesn't match `blocklist.bloomFilter.hash`, download the blocklist from `blocklist.bloomFilter.url`.

Then, save the bloom filter object itself and its hash to your local database.

```javascript
import { fetchBloomFilter } from '@blowfishxyz/blocklist';

const blocklist = await fetchDomainBlocklist(apiConfig);
const storedHash = [...]; // fetch it from your storage
if (storedHash != blocklist.bloomFilter.hash) {
    const bloomFilter = await fetchBloomFilter(blocklist.bloomFilter.url);
    [...] // save bloomFilter to a local database
    [...] // save bloomFilter.hash or blocklist.bloomFilter.hash to a local database
}
```

We don't update blocklist hash more often than every 24 hours.

### Executing lookups

Once you have a blocklist object and a bloom filter saved, you can execute lookups.

```javascript
import { scanDomain, Action } from '@blowfishxyz/blocklist';

const recentlyAdded = [...]; // get from storage
const recentlyRemoved = [...]; // get from storage
const bloomFilter = [...]; // get from storage

const action = scanDomain(
    bloomFilter,
    recentlyAdded,
    recentlyRemoved, 
    "https://example.com/"
);

if (action === Action.BLOCK) {
    // block the domain
}
```

### Error handling

Functions that depend on API an/or network can return `null` when I/O errors are encountered.

If you would like to track errors, you can pass optional `trackError` callback to `fetchBlocklist` and `fetchBloomFilter` functions. 

It could be called with an `Error` or with a string.


## Exported functions

The following functions are exported by the library:

### `fetchDomainBlocklist`
Fetch blocklist JSON object from Blowfish API with recent domains and  a link to the bloom filter.

#### Arguments
* `apiConfig: ApiConfig`: an object that contains the API configuration details, such as the URL for the domain blocklist and the API key.
You can use it to pass API requests to a proxy that sits between your users and Blowfish API.
* `priorityBlockLists: string[] | null`: An array of strings that contains the priority blocklists. (optional)
* `priorityAllowLists: string[] | null`: An array of strings that contains the priority allowlists. (optional)
* `reportError: (error: unknown) => void`: A callback function that library uses to track errors when result is `null`. (optional)

#### Return type
```
Promise<{ bloomFilter: BloomFilter, recentlyAdded: string[], recentlyRemoved: string[] } | null>
```

### `fetchDomainBlocklistBloomFilter`

Fetches the bloom filter from specified URL and returns it.

#### Arguments
* `url: string`: the URL for the bloom filter. 
You can use URL returned from `fetchDomainBlocklist` function or proxy this URL through your own server.

#### Return type
`Promise<{ bitVector: number[], k: number, hash: string, bits: number, salt: number } | null>`

### `scanDomain`
Scans a domain against the domain blocklist and returns the action to be taken (either `BLOCK` or `NONE`).

#### Arguments

* `bloomFilter: { bitVector: number[], k: number, hash: string, bits: number, salt: number }`: the bloom filter for the domain blocklist.
* `recentlyAdded: string[]`: an array of domains that have recently been added to the blocklist.
* `recentlyRemoved: string[]`: an array of domains that have recently been removed from the blocklist.
* `domain: string`: the domain or an URL to be scanned.

#### Return type
```
enum Action {
    BLOCK = "BLOCK",
    NONE = "NONE",
}
```
