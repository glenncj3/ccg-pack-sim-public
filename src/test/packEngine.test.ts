import { describe, it, expect } from 'vitest'
import { openSinglePack } from '../lib/packEngine'
import type { PackContext } from '../lib/packEngine'
import { buildAliasTable, buildCardAliasTables } from '../lib/sampling'
import { createRNG } from '../lib/random'
import { runSimulation, runCouponCollector, openPacks } from '../lib/simulation'
import { runDeckAcquisitionSim } from '../lib/deckAcquisition'
import type { CCGSet, SimConfig, CouponCollectorConfig, Card } from '../types'

// ── Shared test fixtures ────────────────────────────────────────

function makeCards(rarityId: string, count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${rarityId}_${i + 1}`,
    name: `${rarityId} Card ${i + 1}`,
    rarityId,
    factionId: null,
    setNumber: null,
    isFoilVariant: false,
    notes: null,
    relativeWeight: 1,
  }))
}

function makeTestSet(overrides?: Partial<CCGSet>): CCGSet {
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
      { id: 'c', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 10, factionId: null },
      { id: 'r', name: 'Rare', shortCode: 'R', color: '#00f', cardCount: 5, factionId: null },
    ],
    factions: [],
    slots: [
      { id: 's1', position: 1, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 100 }] },
      { id: 's2', position: 2, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 80 }, { rarityId: 'r', weight: 20 }] },
      { id: 's3', position: 3, label: '', isFoil: false, pool: [{ rarityId: 'r', weight: 100 }] },
    ],
    cards: [...makeCards('c', 10), ...makeCards('r', 5)],
    slotDividers: [],
    rarityDividers: [],
    noPackDuplicates: false,
    pityTimers: [],
    ...overrides,
  }
}

// ── openSinglePack unit tests ───────────────────────────────────

describe('openSinglePack', () => {
  it('returns one draw per slot', () => {
    const set = makeTestSet()
    const slotTables = set.slots.map((s) => buildAliasTable(s.pool))
    const cardAliasTables = buildCardAliasTables(set.cards)
    const rand = createRNG(42)

    const ctx: PackContext = { slotTables, cardAliasTables, noPackDuplicates: false, pity: null }
    const draws = openSinglePack(ctx, rand)

    expect(draws.length).toBe(3)
    for (const d of draws) {
      expect(d.rarityId).toBeTruthy()
      expect(d.cardId).toBeTruthy()
    }
  })

  it('deterministic with same seed', () => {
    const set = makeTestSet()
    const slotTables = set.slots.map((s) => buildAliasTable(s.pool))
    const cardAliasTables = buildCardAliasTables(set.cards)

    const ctx: PackContext = { slotTables, cardAliasTables, noPackDuplicates: false, pity: null }

    const rand1 = createRNG(99)
    const draws1 = openSinglePack(ctx, rand1)

    const rand2 = createRNG(99)
    const draws2 = openSinglePack(ctx, rand2)

    expect(draws1).toEqual(draws2)
  })

  it('enforces dupe protection within a pack', () => {
    // 3 slots all drawing from same 10-card common pool — should get 3 unique cards
    const set = makeTestSet({
      slots: [
        { id: 's1', position: 1, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 100 }] },
        { id: 's2', position: 2, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 100 }] },
        { id: 's3', position: 3, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 100 }] },
      ],
    })
    const slotTables = set.slots.map((s) => buildAliasTable(s.pool))
    const cardAliasTables = buildCardAliasTables(set.cards)
    const ctx: PackContext = { slotTables, cardAliasTables, noPackDuplicates: true, pity: null }

    // Open many packs — every pack should have unique cards
    for (let i = 0; i < 200; i++) {
      const rand = createRNG(i)
      const draws = openSinglePack(ctx, rand)
      const cardIds = draws.map((d) => d.cardId).filter(Boolean)
      expect(new Set(cardIds).size).toBe(cardIds.length)
    }
  })

  it('applies pity timer and updates counts', () => {
    // Single slot: 99% common, 1% rare. Pity after 3 packs.
    const set = makeTestSet({
      slots: [
        { id: 's1', position: 1, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 99 }, { rarityId: 'r', weight: 1 }] },
      ],
    })
    const slotTables = set.slots.map((s) => buildAliasTable(s.pool))
    const cardAliasTables = buildCardAliasTables(set.cards)
    const pity = {
      configs: [{ rarityId: 'r', threshold: 3, slotIdx: 0 }],
      counts: [0],
    }
    const ctx: PackContext = { slotTables, cardAliasTables, noPackDuplicates: false, pity }
    const rand = createRNG(42)

    // Open packs — after 3 consecutive misses, pity should force rare
    let rareHits = 0
    for (let i = 0; i < 20; i++) {
      const draws = openSinglePack(ctx, rand)
      if (draws[0].rarityId === 'r') rareHits++
    }

    // With pity at 3, we should get significantly more rares than the 1% base rate
    expect(rareHits).toBeGreaterThan(2)
  })
})

// ── Regression: seeded snapshot tests for all consumers ─────────

describe('regression: runSimulation output unchanged', () => {
  it('exact seeded distribution matches snapshot', () => {
    const set = makeTestSet()
    const config: SimConfig = { numPacks: 50, numIterations: 100, unitOfMeasure: 'pack', seed: 42 }
    const result = runSimulation(set, config)

    const commonStat = result.rarityStats.find((s) => s.rarityId === 'c')!
    const rareStat = result.rarityStats.find((s) => s.rarityId === 'r')!

    // Lock in exact values — any drift means behavioral change
    expect(commonStat.mean).toMatchSnapshot()
    expect(commonStat.stdDev).toMatchSnapshot()
    expect(rareStat.mean).toMatchSnapshot()
    expect(rareStat.stdDev).toMatchSnapshot()
    expect(commonStat.distribution.slice(0, 10)).toMatchSnapshot()
    expect(rareStat.distribution.slice(0, 10)).toMatchSnapshot()
  })
})

describe('regression: runCouponCollector output unchanged', () => {
  it('exact seeded packs-to-complete matches snapshot', () => {
    const set = makeTestSet()
    const config: CouponCollectorConfig = {
      targetRarityIds: ['r'],
      targetCopies: 1,
      numIterations: 100,
      seed: 42,
      byName: false,
    }
    const result = runCouponCollector(set, config)

    expect(result.packsToComplete.mean).toMatchSnapshot()
    expect(result.packsToComplete.stdDev).toMatchSnapshot()
    expect(result.packsToComplete.distribution.slice(0, 10)).toMatchSnapshot()
  })

  it('exact seeded byName packs-to-complete matches snapshot', () => {
    const set = makeTestSet()
    const config: CouponCollectorConfig = {
      targetRarityIds: [],
      targetCopies: 1,
      numIterations: 100,
      seed: 42,
      byName: true,
    }
    const result = runCouponCollector(set, config)

    expect(result.packsToComplete.mean).toMatchSnapshot()
    expect(result.packsToComplete.stdDev).toMatchSnapshot()
    expect(result.packsToComplete.distribution.slice(0, 10)).toMatchSnapshot()
  })
})

describe('regression: openPacks output unchanged', () => {
  it('exact seeded pack contents match snapshot', () => {
    const set = makeTestSet()
    const packs = openPacks(set, 5, 42)

    expect(packs.map((p) => p.map((d) => ({ r: d.rarityId, c: d.cardId })))).toMatchSnapshot()
  })
})

describe('regression: runDeckAcquisitionSim output unchanged', () => {
  it('exact seeded distribution matches snapshot', () => {
    const set = makeTestSet()
    const result = runDeckAcquisitionSim(set, {
      targets: [{ cardName: 'r Card 1', copies: 1 }],
      numIterations: 100,
      seed: 42,
    })

    expect(result.mean).toMatchSnapshot()
    expect(result.stdDev).toMatchSnapshot()
    expect(result.distribution.slice(0, 10)).toMatchSnapshot()
  })
})
