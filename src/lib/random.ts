/**
 * Seeded PRNG (xoshiro128**) — single source of truth for all simulation modules.
 */
export function xoshiro128ss(seed: number): () => number {
  let s0 = seed | 0
  let s1 = (seed << 13) ^ seed
  let s2 = (seed >> 7) ^ seed
  let s3 = (seed << 5) | 0x9e3779b9

  // Warm up
  for (let i = 0; i < 20; i++) {
    const t = s1 << 9
    s2 ^= s0
    s3 ^= s1
    s1 ^= s2
    s0 ^= s3
    s2 ^= t
    s3 = (s3 << 11) | (s3 >>> 21)
  }

  return function () {
    const s1x5 = Math.imul(s1, 5)
    const result = Math.imul((s1x5 << 7) | (s1x5 >>> 25), 9) >>> 0
    const t = s1 << 9
    s2 ^= s0
    s3 ^= s1
    s1 ^= s2
    s0 ^= s3
    s2 ^= t
    s3 = (s3 << 11) | (s3 >>> 21)
    return (result >>> 0) / 4294967296
  }
}

/**
 * Create a PRNG function: seeded if seed is provided, Math.random otherwise.
 */
export function createRNG(seed: number | null): () => number {
  return seed != null ? xoshiro128ss(seed) : () => Math.random()
}
