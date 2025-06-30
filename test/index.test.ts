/* eslint @typescript-eslint/no-non-null-assertion: 0 */
import {
  fetchDomainBlocklist,
  fetchDomainBlocklistBloomFilter,
  scanDomain,
  BloomFilter,
} from "../src/utils";

const EMPTY_BLOOM_FILTER: BloomFilter = {
  bitVector: "AA",
  k: 1,
  hash: "",
  bits: 8,
  salt: "",
};

const BLOCKLIST_ENDPOINT = 'v0/domains/blocklist';

describe("fetchDomainBlocklist", () => {
  it("should return a non-null blocklist fetched from API with required fields", async () => {
    const apiConfig = {
      domainBlocklistUrl: process.env.BLOWFISH_BASE_URL! + BLOCKLIST_ENDPOINT,
      apiKey: process.env.BLOWFISH_API_KEY,
    };
    const blocklist = await fetchDomainBlocklist(apiConfig);
    expect(blocklist).not.toBeNull();
    expect(blocklist).toHaveProperty("bloomFilter");
    expect(blocklist).toHaveProperty("recentlyAdded");
    expect(blocklist).toHaveProperty("recentlyRemoved");
    expect(blocklist!.bloomFilter).toHaveProperty("url");
    expect(blocklist!.bloomFilter.url).not.toBe("");
    expect(blocklist!.bloomFilter).toHaveProperty("hash");
    expect(blocklist!.bloomFilter.hash).not.toBe("");
  });

  it("should return a cursor that can be used to re-fetch the blocklist", async () => {
    const apiConfig = {
      domainBlocklistUrl: process.env.BLOWFISH_BASE_URL! + BLOCKLIST_ENDPOINT,
      apiKey: process.env.BLOWFISH_API_KEY,
    };
    const blocklist = await fetchDomainBlocklist(apiConfig);
    expect(blocklist).not.toBeNull();
    expect(blocklist).toHaveProperty("bloomFilter");
    expect(blocklist).toHaveProperty("recentlyAdded");
    expect(blocklist).toHaveProperty("recentlyRemoved");

    const { nextCursor } = blocklist!;
    const nextBlocklist = await fetchDomainBlocklist(
      apiConfig,
      undefined,
      undefined,
      nextCursor
    );
    expect(nextBlocklist).not.toBeNull();
    expect(nextBlocklist!.recentlyAdded.length).toEqual(0);
    expect(nextBlocklist!.recentlyRemoved.length).toEqual(0);
  });

  it("tracks thrown errors using a passed function", async () => {
    // eslint-disable-next-line prefer-const
    let errors: unknown[] = [];
    const reportError = (error: unknown) => {
      errors.push(error);
    };
    const apiConfig = {
      domainBlocklistUrl: "http://2CeaMJtzCTdx8ht2.com/", // this domain does not exist
    };
    await fetchDomainBlocklist(
      apiConfig,
      undefined,
      undefined,
      undefined,
      reportError
    );
    expect(errors.length).toBe(1);
    expect((errors[0] as Error).message).toBe(
      "request to http://2ceamjtzctdx8ht2.com/ failed, reason: getaddrinfo ENOTFOUND 2ceamjtzctdx8ht2.com"
    );
  });

  it("tracks !response.ok errors using a passed function", async () => {
    // eslint-disable-next-line prefer-const
    let errors: unknown[] = [];
    const reportError = (error: unknown) => {
      errors.push(error);
    };
    const apiConfig = {
      domainBlocklistUrl: "https://google.com/fdjfkdkdkfdkdf/", // this should return 404
    };
    await fetchDomainBlocklist(
      apiConfig,
      undefined,
      undefined,
      undefined,
      reportError
    );
    expect(errors.length).toBe(1);
    expect(errors[0] as string).toContain("Error 404 (Not Found)");
  });
});

describe("fetchDomainBlocklistBloomFilter", () => {
  it("should return a bloom filter object from url in blocklist object", async () => {
    const apiConfig = {
      domainBlocklistUrl: process.env.BLOWFISH_BASE_URL! + BLOCKLIST_ENDPOINT,
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

  it("tracks thrown errors using a passed function", async () => {
    // eslint-disable-next-line prefer-const
    let errors: unknown[] = [];
    const reportError = (error: unknown) => {
      errors.push(error);
    };
    await fetchDomainBlocklistBloomFilter(
      "http://2CeaMJtzCTdx8ht2.com/", // this domain does not exist
      reportError
    );

    expect(errors.length).toBe(1);
    expect((errors[0] as Error).message).toBe(
      "request to http://2ceamjtzctdx8ht2.com/ failed, reason: getaddrinfo ENOTFOUND 2ceamjtzctdx8ht2.com"
    );
  });

  it("tracks !response.ok errors using a passed function", async () => {
    // eslint-disable-next-line prefer-const
    let errors: unknown[] = [];
    const reportError = (error: unknown) => {
      errors.push(error);
    };
    await fetchDomainBlocklistBloomFilter(
      "https://google.com/fdjfkdkdkfdkdf/", // this should return 404
      reportError
    );
    expect(errors.length).toBe(1);
    expect(errors[0] as string).toContain("Error 404 (Not Found)");
  });
});

describe("scanDomain", () => {
  it("should return a block action when domain is in the recent list", () => {
    expect(
      scanDomain(EMPTY_BLOOM_FILTER, ["google.com"], [], "https://google.com")
    ).toBe("BLOCK");
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["google.com"],
        [],
        "https://www.google.com"
      )
    ).toBe("BLOCK");
  });

  it("should return a block action when blocked domain is passed with a dot", () => {
    expect(
      scanDomain(EMPTY_BLOOM_FILTER, ["google.com"], [], "https://google.com.")
    ).toBe("BLOCK");
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["google.com"],
        [],
        "https://www.google.com."
      )
    ).toBe("BLOCK");
  });

  it("should return a none action when domain is not in the recent list", () => {
    expect(
      scanDomain(EMPTY_BLOOM_FILTER, [], [], "https://www.google.com")
    ).toBe("NONE");
  });

  it("should return a block action when lowercase domain is in the recent blocklist", () => {
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["google.com"],
        [],
        "https://wWw.GoogLE.com"
      )
    ).toBe("BLOCK");
  });

  it("should return a block action when specific subdomain is in the recent blocklist", () => {
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["app1.vercel.com"],
        [],
        "https://app1.vercel.com"
      )
    ).toBe("BLOCK");
  });

  it("should return a none action when another subdomain is in the recent blocklist", () => {
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["app1.vercel.com"],
        [],
        "https://app2.vercel.com"
      )
    ).toBe("NONE");
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["app1.vercel.com"],
        [],
        "https://vercel.com"
      )
    ).toBe("NONE");
  });

  it("supports a second level of subdomain nesting", () => {
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["blocked.app1.vercel.com"],
        [],
        "https://blocked.app1.vercel.com"
      )
    ).toBe("BLOCK");
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["blocked.app1.vercel.com"],
        [],
        "https://unblocked.app1.vercel.com"
      )
    ).toBe("NONE");
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["blocked.app1.vercel.com"],
        [],
        "https://app1.vercel.com"
      )
    ).toBe("NONE");
    expect(
      scanDomain(
        EMPTY_BLOOM_FILTER,
        ["blocked.app1.vercel.com"],
        [],
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
          bitVector: "AAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
          k: 1,
          bits: 256,
          salt: "abc",
        },
        [],
        [],
        "https://google.com"
      )
    ).toBe("BLOCK");
  });

  it("should return a none action when domain is in the bloom filter and in the recently removed list", () => {
    expect(
      scanDomain(
        // This bloom filter contains the domain "google.com"
        {
          hash: "39570c5c52ebe3f8b8cee74ffc29107189fc216f37e52d9eb7b13c613dad7e05",
          bitVector: "AAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
          k: 1,
          bits: 256,
          salt: "abc",
        },
        [],
        ["google.com"],
        "https://google.com"
      )
    ).toBe("NONE");
  });

  it("should return a none action when domain not in the bloom filter", () => {
    expect(
      scanDomain(
        // This bloom filter contains the domain "google.com"
        {
          hash: "39570c5c52ebe3f8b8cee74ffc29107189fc216f37e52d9eb7b13c613dad7e05",
          bitVector: "AAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
          k: 1,
          bits: 256,
          salt: "abc",
        },
        [],
        [],
        "https://yahoo.com"
      )
    ).toBe("NONE");
  });

  it("should return actions for domain in bloom filter from API", async () => {
    const apiConfig = {
      domainBlocklistUrl: process.env.BLOWFISH_BASE_URL! + BLOCKLIST_ENDPOINT,
      apiKey: process.env.BLOWFISH_API_KEY,
    };
    const blocklist = await fetchDomainBlocklist(apiConfig);
    const bloomFilter = await fetchDomainBlocklistBloomFilter(
      blocklist!.bloomFilter.url
    );
    expect(
      scanDomain(
        bloomFilter!,
        blocklist!.recentlyAdded,
        blocklist!.recentlyRemoved,
        "https://google.com"
      )
    ).toBe("NONE");
    expect(
      scanDomain(
        bloomFilter!,
        blocklist!.recentlyAdded,
        blocklist!.recentlyRemoved,
        "https://-magiceden.io"
      )
    ).toBe("BLOCK");
  });
});
