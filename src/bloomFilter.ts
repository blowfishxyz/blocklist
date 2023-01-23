import sha1 from "sha1";
import type { BloomFilter } from "./types";

// This is implementation of bloom filter lookup algorithm.
//
// Algorithm should exactly match the one used to generate the bloom filter.
// In order to simplify the algorithm, we're using a universal hash function
// and generate hash from scratch for each key.
//
// Bloom filter's bitVector is expected to have 8 bits in each element (u8[]).
// First bit in vector is highest order bit in the first element.
// See encoding implementation in
// https://github.com/contain-rs/bit-vec/blob/d15090df70f6499da2c9770942c8d39750cb1a21/src/lib.rs#L1120.
export function lookup(bloomFilter: BloomFilter, key: string): boolean {
  // `k` means number of hash functions used for each lookup/insert.
  for (let i = 0; i < bloomFilter.k; i++) {
    // We use salt to be able to change bloom-filter ordering when needed.
    const hash = sha1(`${bloomFilter.salt}_${key}_${i}`, { asBytes: true });
    // We only need first 4 bytes of the hash to construct a 32-bit integer.
    const buffer = Buffer.from(hash).subarray(0, 4);
    // Determine bit vector position for bit that we're seeking. Each integer in bloomFilter.bitVector has 8 bits.
    const index = buffer.readUInt32BE(0) % bloomFilter.bits;
    const byte = Math.floor(index / 8);
    const bit = index % 8;
    // Lookup bit in the bit vector using a bit mask.
    // We invert `bit` position, because `bit` is counted from highest order bit.
    // 1 << 7 selects highest order bit, 1 << 0 selects lowest order bit.
    if ((bloomFilter.bitVector[byte] & (1 << (7 - bit))) === 0) {
      // If lookup isn't successful, the item is definitely not in the bloom filter.
      return false;
    }
  }
  return true;
}
