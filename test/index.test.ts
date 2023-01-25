/* eslint @typescript-eslint/no-non-null-assertion: 0 */
import {
  fetchDomainBlocklist,
  fetchDomainBlocklistBloomFilter,
  scanDomain,
  ApiConfig,
  BloomFilter,
  DEFAULT_BLOCKLIST_URL,
} from "../src";

const EMPTY_BLOOM_FILTER: BloomFilter = {
  bitVector: [0],
  k: 1,
  hash: "",
  bits: 8,
  salt: "",
};

describe("fetchDomainBlocklist", () => {
  it("should return a not-null blocklist fetched from API with required fields", async () => {
    const apiConfig: ApiConfig = {
      domainBlocklistUrl: DEFAULT_BLOCKLIST_URL,
      apiKey: process.env.BLOWFISH_API_KEY,
    };
    const blocklist = await fetchDomainBlocklist(apiConfig);
    expect(blocklist).not.toBeNull();
    expect(blocklist).toHaveProperty("bloomFilter");
    expect(blocklist).toHaveProperty("recent");
    expect(blocklist!.bloomFilter).toHaveProperty("url");
    expect(blocklist!.bloomFilter.url).not.toBe("");
    expect(blocklist!.bloomFilter).toHaveProperty("hash");
    expect(blocklist!.bloomFilter.hash).not.toBe("");
  });
});

describe("fetchDomainBlocklistBloomFilter", () => {
  it("should return a bloom filter object from url in blocklist object", async () => {
    const apiConfig: ApiConfig = {
      domainBlocklistUrl: DEFAULT_BLOCKLIST_URL,
      apiKey: process.env.BLOWFISH_API_KEY,
    };
    const blocklist = await fetchDomainBlocklist(apiConfig);
    expect(blocklist).not.toBeNull();

    const bloomFilter = await fetchDomainBlocklistBloomFilter(
      blocklist!.bloomFilter.url
    );
    expect(bloomFilter).not.toBeNull();
    expect(bloomFilter).toHaveProperty("bitVector");
    expect(bloomFilter).toHaveProperty("k");
    expect(bloomFilter).toHaveProperty("hash");
    expect(bloomFilter).toHaveProperty("bits");
    expect(bloomFilter).toHaveProperty("salt");
  });
});

describe("scanDomain", () => {
  it("should return a block action when domain is in the recent list", () => {
    expect(
      scanDomain(EMPTY_BLOOM_FILTER, ["google.com"], "https://google.com")
    ).toBe("BLOCK");
    expect(
      scanDomain(EMPTY_BLOOM_FILTER, ["google.com"], "https://www.google.com")
    ).toBe("BLOCK");
  });

  it("should return a none action when domain is not in the recent list", () => {
    expect(scanDomain(EMPTY_BLOOM_FILTER, [], "https://www.google.com")).toBe(
      "NONE"
    );
  });

  it("should return a block action when lowercase domain is in the recent blocklist", () => {
    expect(
      scanDomain(EMPTY_BLOOM_FILTER, ["google.com"], "https://wWw.GoogLE.com")
    ).toBe("BLOCK");
  });

  it("should return a block action when specific subdomain is in the recent blocklist", () => {
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["app1.vercel.com"],
        "https://app1.vercel.com"
      )
    ).toBe("BLOCK");
  });

  it("should return a none action when another subdomain is in the recent blocklist", () => {
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["app1.vercel.com"],
        "https://app2.vercel.com"
      )
    ).toBe("NONE");
    expect(
      scanDomain(EMPTY_BLOOM_FILTER, ["app1.vercel.com"], "https://vercel.com")
    ).toBe("NONE");
  });

  it("supports a second level of subdomain nesting", () => {
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["blocked.app1.vercel.com"],
        "https://blocked.app1.vercel.com"
      )
    ).toBe("BLOCK");
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["blocked.app1.vercel.com"],
        "https://unblocked.app1.vercel.com"
      )
    ).toBe("NONE");
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["blocked.app1.vercel.com"],
        "https://app1.vercel.com"
      )
    ).toBe("NONE");
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["blocked.app1.vercel.com"],
        "https://vercel.com"
      )
    ).toBe("NONE");
  });

  it("should return a block action when domain is in the bloom filter", () => {
    expect(
      scanDomain(
        // This bloom filter contains the domain "google.com"
        {
          hash: "39570c5c52ebe3f8b8cee74ffc29107189fc216f37e52d9eb7b13c613dad7e05",
          bitVector: [
            0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0,
          ],
          k: 1,
          bits: 256,
          salt: "abc",
        },
        [],
        "https://google.com"
      )
    ).toBe("BLOCK");
  });

  it("should return a none action when domain not in the bloom filter", () => {
    expect(
      scanDomain(
        // This bloom filter contains the domain "google.com"
        {
          hash: "39570c5c52ebe3f8b8cee74ffc29107189fc216f37e52d9eb7b13c613dad7e05",
          bitVector: [
            0, 0, 0, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0, 0, 0, 0, 0, 0, 0, 0, 0,
          ],
          k: 1,
          bits: 256,
          salt: "abc",
        },
        [],
        "https://yahoo.com"
      )
    ).toBe("NONE");
  });

  it("should return actions for domain in bloom filter from API", async () => {
    const apiConfig: ApiConfig = {
      domainBlocklistUrl: DEFAULT_BLOCKLIST_URL,
      apiKey: process.env.BLOWFISH_API_KEY,
    };
    const blocklist = await fetchDomainBlocklist(apiConfig);
    const bloomFilter = await fetchDomainBlocklistBloomFilter(
      blocklist!.bloomFilter.url
    );
    expect(
      scanDomain(bloomFilter!, blocklist!.recent, "https://google.com")
    ).toBe("NONE");
    expect(
      scanDomain(bloomFilter!, blocklist!.recent, "https://cryptopunks.app")
    ).toBe("BLOCK");
  });
});
