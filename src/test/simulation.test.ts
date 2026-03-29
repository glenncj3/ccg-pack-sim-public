import { describe, it, expect } from 'vitest'
import { buildAliasTable, runSimulation } from '../lib/simulation'
import type { CCGSet, SimConfig } from '../types'

function makeTestSet(overrides?: Partial<CCGSet>): CCGSet {
  const commonId = 'common-id'
  const rareId = 'rare-id'
  const mythicId = 'mythic-id'

  return {
    id: 'test-set',
    name: 'Test Set',
    game: 'Test Game',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    packSize: 3,
    packsPerBox: null,
    packPrice: 4.0,

    rarities: [
      { id: commonId, name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 100, factionId: null },
      { id: rareId, name: 'Rare', shortCode: 'R', color: '#00f', cardCount: 30, factionId: null },
      { id: mythicId, name: 'Mythic', shortCode: 'M', color: '#f90', cardCount: 10, factionId: null },
    ],
    factions: [],
    slots: [
      { id: 'slot-1', position: 1, label: '', isFoil: false, pool: [{ rarityId: commonId, weight: 100 }] },
      { id: 'slot-2', position: 2, label: '', isFoil: false, pool: [{ rarityId: commonId, weight: 100 }] },
      {
        id: 'slot-3', position: 3, label: 'Rare/Mythic', isFoil: false,
        pool: [
          { rarityId: rareId, weight: 87.5 },
          { rarityId: mythicId, weight: 12.5 },
        ],
      },
    ],
    cards: [],
    slotDividers: [],
    rarityDividers: [],
    noPackDuplicates: false,
    pityTimers: [],
    ...overrides,
  }
}

describe('buildAliasTable', () => {
  it('builds table for single entry', () => {
    const table = buildAliasTable([{ rarityId: 'a', weight: 100 }])
    expect(table.ids).toEqual(['a'])
    expect(table.prob.length).toBe(1)
  })

  it('builds table for two entries', () => {
    const table = buildAliasTable([
      { rarityId: 'a', weight: 75 },
      { rarityId: 'b', weight: 25 },
    ])
    expect(table.ids.length).toBe(2)
    expect(table.prob.length).toBe(2)
    expect(table.alias.length).toBe(2)
  })

  it('handles empty pool', () => {
    const table = buildAliasTable([])
    expect(table.ids.length).toBe(0)
  })
})

describe('runSimulation', () => {
  const baseConfig: SimConfig = {
    numPacks: 100,
    numIterations: 1000,
    unitOfMeasure: 'pack',
    seed: 42,
  }

  it('returns correct structure', () => {
    const set = makeTestSet()
    const result = runSimulation(set, baseConfig)

    expect(result.setId).toBe('test-set')
    expect(result.config).toEqual(baseConfig)
    expect(result.rarityStats.length).toBe(3)
    expect(result.totalPacks).toBe(100)
  })

  it('deterministic slots produce exact counts', () => {
    const set = makeTestSet()
    const result = runSimulation(set, baseConfig)

    // Slots 1 and 2 are 100% common, so common count should always be >= 200
    const commonStat = result.rarityStats.find((s) => s.rarityId === 'common-id')!
    expect(commonStat.p5).toBeGreaterThanOrEqual(200)
    // P(0) should be 0 since commons are guaranteed
    expect(commonStat.pZero).toBe(0)
  })

  it('weighted slot produces expected ratio', () => {
    const set = makeTestSet()
    const result = runSimulation(set, { ...baseConfig, numIterations: 10000 })

    const rareStat = result.rarityStats.find((s) => s.rarityId === 'rare-id')!
    const mythicStat = result.rarityStats.find((s) => s.rarityId === 'mythic-id')!

    // With 87.5/12.5 split over 100 packs, P5-P95 range should bracket the expected values
    expect(rareStat.p5).toBeGreaterThan(70)
    expect(rareStat.p95).toBeLessThan(105)
    expect(mythicStat.p5).toBeGreaterThan(2)
    expect(mythicStat.p95).toBeLessThan(30)

    // Neither should ever be zero in 100 packs
    expect(rareStat.pZero).toBe(0)
    expect(mythicStat.pZero).toBe(0)
  })

  it('seeded runs are deterministic', () => {
    const set = makeTestSet()
    const result1 = runSimulation(set, { ...baseConfig, seed: 123 })
    const result2 = runSimulation(set, { ...baseConfig, seed: 123 })

    for (let i = 0; i < result1.rarityStats.length; i++) {
      expect(result1.rarityStats[i].stdDev).toBe(result2.rarityStats[i].stdDev)
      expect(result1.rarityStats[i].p5).toBe(result2.rarityStats[i].p5)
      expect(result1.rarityStats[i].p95).toBe(result2.rarityStats[i].p95)
      expect(result1.rarityStats[i].distribution).toEqual(result2.rarityStats[i].distribution)
    }
  })

  it('different seeds produce different results', () => {
    const set = makeTestSet()
    const result1 = runSimulation(set, { ...baseConfig, seed: 1 })
    const result2 = runSimulation(set, { ...baseConfig, seed: 2 })

    // At least one stat should differ
    const r1 = result1.rarityStats.find((s) => s.rarityId === 'rare-id')!
    const r2 = result2.rarityStats.find((s) => s.rarityId === 'rare-id')!
    expect(r1.distribution).not.toEqual(r2.distribution)
  })

  it('box mode multiplies pack count correctly', () => {
    const set = makeTestSet({ packsPerBox: 36 })
    const config: SimConfig = {
      numPacks: 1,
      numIterations: 100,
      unitOfMeasure: 'box',
      seed: 42,
    }
    const result = runSimulation(set, config)
    expect(result.totalPacks).toBe(36) // 1 box * 36 packs

    const commonStat = result.rarityStats.find((s) => s.rarityId === 'common-id')!
    // 36 packs * 2 common slots = 72 commons per iteration (deterministic, so p5 == p95 == 72)
    expect(commonStat.p5).toBe(72)
    expect(commonStat.p95).toBe(72)
  })

  it('computes stats correctly', () => {
    const set = makeTestSet()
    const result = runSimulation(set, { ...baseConfig, numIterations: 100, seed: 42 })

    for (const stat of result.rarityStats) {
      expect(stat.p5).toBeLessThanOrEqual(stat.p95)
      expect(stat.stdDev).toBeGreaterThanOrEqual(0)
      expect(stat.pZero).toBeGreaterThanOrEqual(0)
      expect(stat.pZero).toBeLessThanOrEqual(1)
    }
  })

  it('handles rarity with zero weight across all slots', () => {
    const set = makeTestSet({
      rarities: [
        { id: 'common-id', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 100, factionId: null },
        { id: 'rare-id', name: 'Rare', shortCode: 'R', color: '#00f', cardCount: 30, factionId: null },
        { id: 'mythic-id', name: 'Mythic', shortCode: 'M', color: '#f90', cardCount: 10, factionId: null },
        { id: 'ghost-id', name: 'Ghost', shortCode: 'G', color: '#fff', cardCount: 1, factionId: null },
      ],
    })
    const result = runSimulation(set, { numPacks: 10, numIterations: 100, unitOfMeasure: 'pack', seed: 42 })

    // Ghost rarity has no weight in any slot, so distribution is empty => hits the guard clause
    const ghostStat = result.rarityStats.find((s) => s.rarityId === 'ghost-id')!
    expect(ghostStat.stdDev).toBe(0)
    expect(ghostStat.p5).toBe(0)
    expect(ghostStat.p95).toBe(0)
    expect(ghostStat.pZero).toBe(1) // always zero of this rarity
    expect(ghostStat.avgPerBox).toBeNull()
  })

  it('handles pity timer', () => {
    const commonId = 'common-id'
    const rareId = 'rare-id'
    // Set up: only one slot, 99% common, 1% rare. Pity after 5 packs.
    const set: CCGSet = {
      id: 'pity-test',
      name: 'Pity Test',
      game: 'Test',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
      packSize: 1,
      packsPerBox: null,
      packPrice: 4.0,
  
      rarities: [
        { id: commonId, name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 100, factionId: null },
        { id: rareId, name: 'Rare', shortCode: 'R', color: '#00f', cardCount: 10, factionId: null },
      ],
      factions: [],
      slots: [
        { id: 's1', position: 1, label: '', isFoil: false, pool: [{ rarityId: commonId, weight: 99 }, { rarityId: rareId, weight: 1 }] },
      ],
      cards: [],
      slotDividers: [],
      rarityDividers: [],
      noPackDuplicates: false,
      pityTimers: [{ rarityId: rareId, afterNPacks: 5 }],
    }

    const result = runSimulation(set, { numPacks: 100, numIterations: 1000, unitOfMeasure: 'pack', seed: 42 })
    const rareStat = result.rarityStats.find((s) => s.rarityId === rareId)!

    // With pity after 5 packs, P5 should be well above what you'd get without pity (~1%)
    expect(rareStat.p5).toBeGreaterThan(10)
    // Should never get zero rares with pity timer active
    expect(rareStat.pZero).toBe(0)
  })

  it('computes collectibility distributions', () => {
    const set = makeTestSet()
    const result = runSimulation(set, { ...baseConfig, numPacks: 100, numIterations: 500, seed: 42 })

    // Common: 100 cards, 200 draws (2 guaranteed slots) — should collect most
    const commonStat = result.rarityStats.find((s) => s.rarityId === 'common-id')!
    expect(commonStat.collectibility.length).toBeGreaterThan(0)
    // Threshold 1 (>=1 copy): average should be high with 200 draws over 100 cards
    const avg1 = commonStat.collectibility[0].reduce((a, b) => a + b, 0) / commonStat.collectibility[0].length
    expect(avg1).toBeGreaterThan(0.8)

    // Mythic: 10 cards, ~12.5 draws — threshold 1 should be decent
    const mythicStat = result.rarityStats.find((s) => s.rarityId === 'mythic-id')!
    const mythicAvg1 = mythicStat.collectibility[0].reduce((a, b) => a + b, 0) / mythicStat.collectibility[0].length
    expect(mythicAvg1).toBeGreaterThan(0.5)

    // Threshold 2 (>=2 copies) should be lower than threshold 1
    const avg2 = commonStat.collectibility[1].reduce((a, b) => a + b, 0) / commonStat.collectibility[1].length
    expect(avg2).toBeLessThanOrEqual(avg1)

    // Each threshold distribution should have one entry per iteration
    expect(commonStat.collectibility[0].length).toBe(500)
  })
})
