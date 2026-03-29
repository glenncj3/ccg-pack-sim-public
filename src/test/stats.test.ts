import { describe, it, expect } from 'vitest'
import { computeDistributionStats, computePercentiles } from '../lib/stats'

describe('computeDistributionStats', () => {
  it('returns zeros for empty distribution', () => {
    const result = computeDistributionStats([])
    expect(result.mean).toBe(0)
    expect(result.median).toBe(0)
    expect(result.stdDev).toBe(0)
    expect(result.min).toBe(0)
    expect(result.max).toBe(0)
    expect(result.sorted).toEqual([])
  })

  it('computes correct stats for a known dataset', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9]
    const result = computeDistributionStats(data)

    expect(result.mean).toBe(5)
    expect(result.median).toBe(4.5) // even length: (4+5)/2
    expect(result.min).toBe(2)
    expect(result.max).toBe(9)
    expect(result.stdDev).toBeCloseTo(2, 0) // stddev ≈ 2
    expect(result.sorted).toEqual([2, 4, 4, 4, 5, 5, 7, 9])
  })

  it('handles single value', () => {
    const result = computeDistributionStats([42])
    expect(result.mean).toBe(42)
    expect(result.median).toBe(42)
    expect(result.stdDev).toBe(0)
    expect(result.min).toBe(42)
    expect(result.max).toBe(42)
  })

  it('handles odd-length array for median', () => {
    const result = computeDistributionStats([1, 3, 5])
    expect(result.median).toBe(3)
  })

  it('does not mutate original array', () => {
    const data = [3, 1, 2]
    computeDistributionStats(data)
    expect(data).toEqual([3, 1, 2])
  })
})

describe('computePercentiles', () => {
  it('returns zeros for empty array', () => {
    const result = computePercentiles([])
    expect(result.p10).toBe(0)
    expect(result.p50).toBe(0)
    expect(result.p90).toBe(0)
  })

  it('computes percentiles for sorted array', () => {
    // 100 values: 1..100
    const sorted = Array.from({ length: 100 }, (_, i) => i + 1)
    const result = computePercentiles(sorted)

    expect(result.p10).toBe(11) // index 10, value 11
    expect(result.p25).toBe(26)
    expect(result.p50).toBe(51)
    expect(result.p75).toBe(76)
    expect(result.p90).toBe(91)
  })

  it('percentiles are in ascending order', () => {
    const sorted = Array.from({ length: 1000 }, (_, i) => i * 2).sort((a, b) => a - b)
    const result = computePercentiles(sorted)
    expect(result.p10).toBeLessThanOrEqual(result.p25)
    expect(result.p25).toBeLessThanOrEqual(result.p50)
    expect(result.p50).toBeLessThanOrEqual(result.p75)
    expect(result.p75).toBeLessThanOrEqual(result.p90)
  })
})
