import { BloomFilter } from "../src";
import { lookup } from "../src/bloomFilter";

describe("lookup", () => {
  it("should return true for a key that exists in the bloom filter", () => {
    const bloomFilter: BloomFilter = {
      hash: "39570c5c52ebe3f8b8cee74ffc29107189fc216f37e52d9eb7b13c613dad7e05",
      bitVector: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
      ],
      k: 1,
      bits: 256,
      salt: "abc",
    };
    const key = "test string";
    expect(lookup(bloomFilter, key)).toBe(true);
  });

  it("should return false for a key that does not exist in the bloom filter", () => {
    const bloomFilter: BloomFilter = {
      hash: "39570c5c52ebe3f8b8cee74ffc29107189fc216f37e52d9eb7b13c613dad7e05",
      bitVector: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
      ],
      k: 1,
      bits: 256,
      salt: "abc",
    };
    const key = "test string 2";
    expect(lookup(bloomFilter, key)).toBe(false);
  });

  it("should return true for a key that exists in the bloom filter with k=2", () => {
    const bloomFilter: BloomFilter = {
      hash: "39570c5c52ebe3f8b8cee74ffc29107189fc216f37e52d9eb7b13c613dad7e05",
      bitVector: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 8, 0,
      ],
      k: 2,
      bits: 256,
      salt: "abc",
    };
    const key = "test string in bloom filter";
    expect(lookup(bloomFilter, key)).toBe(true);
  });

  it("should return false for a key does not exist in the bloom filter with k=2", () => {
    const bloomFilter: BloomFilter = {
      hash: "39570c5c52ebe3f8b8cee74ffc29107189fc216f37e52d9eb7b13c613dad7e05",
      bitVector: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 32, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 8, 0,
      ],
      k: 2,
      bits: 256,
      salt: "abc",
    };
    const key = "test string not in bloom filter";
    expect(lookup(bloomFilter, key)).toBe(false);
  });

  // This tests checks how we're handling where bitvector size is not a multiple of 8.
  it("should return true for a key that exists in the bloom filter with k=2 and n=257", () => {
    const bloomFilter: BloomFilter = {
      hash: "39570c5c52ebe3f8b8cee74ffc29107189fc216f37e52d9eb7b13c613dad7e05",
      bitVector: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 16, 0, 0, 0, 0, 0,
      ],
      k: 2,
      bits: 257,
      salt: "abc",
    };
    const key = "test string in bloom filter";
    expect(lookup(bloomFilter, key)).toBe(true);
  });

  it("should return false when salt is provided incorrectly", () => {
    const bloomFilter: BloomFilter = {
      hash: "39570c5c52ebe3f8b8cee74ffc29107189fc216f37e52d9eb7b13c613dad7e05",
      bitVector: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 1, 16, 0, 0, 0, 0, 0,
      ],
      k: 2,
      bits: 257,
      salt: "abcd",
    };
    const key = "test string in bloom filter";
    expect(lookup(bloomFilter, key)).toBe(false);
  });
});
