import { describe, it, expect } from 'vitest'
import { xoshiro128ss, createRNG } from '../lib/random'

describe('xoshiro128ss', () => {
  it('produces values in [0, 1)', () => {
    const rand = xoshiro128ss(42)
    for (let i = 0; i < 1000; i++) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is deterministic with the same seed', () => {
    const r1 = xoshiro128ss(123)
    const r2 = xoshiro128ss(123)
    for (let i = 0; i < 100; i++) {
      expect(r1()).toBe(r2())
    }
  })

  it('different seeds produce different sequences', () => {
    const r1 = xoshiro128ss(1)
    const r2 = xoshiro128ss(2)
    const seq1 = Array.from({ length: 10 }, () => r1())
    const seq2 = Array.from({ length: 10 }, () => r2())
    expect(seq1).not.toEqual(seq2)
  })

  it('has reasonable distribution (chi-squared sanity check)', () => {
    const rand = xoshiro128ss(99)
    const buckets = new Array(10).fill(0)
    const n = 10000
    for (let i = 0; i < n; i++) {
      const bucket = Math.floor(rand() * 10)
      buckets[bucket]++
    }
    const expected = n / 10
    for (const count of buckets) {
      expect(count).toBeGreaterThan(expected * 0.85)
      expect(count).toBeLessThan(expected * 1.15)
    }
  })
})

describe('createRNG', () => {
  it('returns seeded PRNG when seed is provided', () => {
    const r1 = createRNG(42)
    const r2 = createRNG(42)
    for (let i = 0; i < 10; i++) {
      expect(r1()).toBe(r2())
    }
  })

  it('returns Math.random when seed is null', () => {
    const rand = createRNG(null)
    const v = rand()
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  })
})
