import sha1 from "sha1";
import type { BloomFilter } from "./types";

export function lookup(bloomFilter: BloomFilter, key: string): boolean {
  // `k` means number of hash functions used for each lookup/insert.
  for (let i = 0; i < bloomFilter.k; i++) {
    // We use salt to be able to change bloom-filter ordering when needed.
    const hash = sha1(`${bloomFilter.salt}_${key}_${i}`, { asBytes: true });
    // We only need first 4 bytes of the hash to construct a 32-bit integer.
    const buffer = Buffer.from(hash).subarray(0, 4);
    // Determine bit vector position for bit that we're seeking. Each integer in bloomFilter.bitVector has 8 bits.
    const index = buffer.readUInt32BE(0) % bloomFilter.bits;
    // Base64 encodes 24 bits (3 bytes) in 4 characters (4 bytes).
    // So, we need extract a 24-bit base64-encoded sequence, which is basically a 4 character string slice.
    const sequenceIndex = Math.floor(index / 24);
    const sequence = Buffer.from(
      bloomFilter.bitVector.slice(sequenceIndex * 4, sequenceIndex * 4 + 4),
      "base64"
    );
    // Within this sequence, we need extract just one bit.
    const bitInSequence = index % 24;
    // This calculates specific byte & bit where are looking for in the 24-bit sequence.
    const byte = Math.floor(bitInSequence / 8);
    const bit = bitInSequence % 8;
    // Lookup bit in the bit vector using a bit mask.
    // We invert `bit` position, because `bit` is counted from highest order bit.
    // 1 << 7 selects highest order bit, 1 << 0 selects lowest order bit.
    if ((sequence[byte] & (1 << (7 - bit))) === 0) {
      // If lookup isn't successful, the item is definitely not in the bloom filter.
      return false;
    }
  }
  return true;
}
