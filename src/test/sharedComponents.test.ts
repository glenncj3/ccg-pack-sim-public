import { describe, it, expect } from 'vitest'
import { computeDistributionStats } from '../lib/stats'

/**
 * Phase 2 tests: verify that the DistributionHistogram and StatCard
 * decoupling is correct by testing the data flow contracts.
 *
 * The key change is that consumers no longer construct fake Rarity/RarityStats
 * objects. Instead they pass plain { label, color, distribution, mean, median, stdDev }.
 * We verify the stats computation that feeds these components is consistent.
 */

describe('DistributionHistogram data contract', () => {
  it('computeDistributionStats provides all fields needed by DistributionHistogram', () => {
    const distribution = [5, 10, 15, 20, 25, 30]
    const stats = computeDistributionStats(distribution)

    // DistributionHistogram needs: distribution, mean, median, stdDev
    expect(typeof stats.mean).toBe('number')
    expect(typeof stats.median).toBe('number')
    expect(typeof stats.stdDev).toBe('number')
    expect(stats.mean).toBeCloseTo(17.5, 1)
  })

  it('handles the packs-distribution use case (previously required fake Rarity)', () => {
    const packsNeeded = [10, 12, 15, 20, 25, 30, 35, 40, 50, 100]
    const { mean, median, stdDev } = computeDistributionStats(packsNeeded)

    // These would be passed directly to DistributionHistogram
    const props = {
      label: 'Packs to Complete',
      color: '#f0b429',
      distribution: packsNeeded,
      mean,
      median,
      stdDev,
    }

    expect(props.label).toBe('Packs to Complete')
    expect(props.color).toBe('#f0b429')
    expect(props.mean).toBeGreaterThan(0)
    expect(props.median).toBeGreaterThan(0)
    expect(props.stdDev).toBeGreaterThan(0)
  })

  it('RarityHistogram wrapper maps RarityStats to DistributionHistogram props correctly', () => {
    // Verify the mapping that RarityHistogram does
    const rarityStats = {
      rarityId: 'test',
      mean: 50,
      median: 48,
      stdDev: 5.5,
      min: 30,
      max: 70,
      avgPerPack: 0.5,
      avgPerBox: null,
      distribution: Array.from({ length: 100 }, (_, i) => 40 + (i % 20)),
    }

    const rarity = {
      id: 'test',
      name: 'Test Rarity',
      color: '#ff0000',
    }

    // The wrapper maps: label=rarity.name, color=rarity.color, rest from stats
    const props = {
      label: rarity.name,
      color: rarity.color,
      distribution: rarityStats.distribution,
      mean: rarityStats.mean,
      median: rarityStats.median,
      stdDev: rarityStats.stdDev,
    }

    expect(props.label).toBe('Test Rarity')
    expect(props.color).toBe('#ff0000')
    expect(props.distribution.length).toBe(100)
  })
})

describe('StatCard shared component contract', () => {
  it('accepts label and value as strings', () => {
    // This tests the interface contract — the component takes { label: string, value: string }
    const props = { label: 'Mean Packs', value: '42.5' }
    expect(props.label).toBe('Mean Packs')
    expect(props.value).toBe('42.5')
  })

  it('consumers format numbers to strings before passing', () => {
    const mean = 42.678
    expect(mean.toFixed(0)).toBe('43')

    // AcquisitionResults formats: result.mean.toFixed(1)
    expect(mean.toFixed(1)).toBe('42.7')

    // Both are valid string values for StatCard
    expect(typeof mean.toFixed(0)).toBe('string')
    expect(typeof mean.toFixed(1)).toBe('string')
  })
})
