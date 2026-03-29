import { describe, it, expect } from 'vitest'
import { runDeckAcquisitionSim } from '../lib/deckAcquisition'
import type { CCGSet, DeckAcquisitionConfig } from '../types'

function makeTestSet(): CCGSet {
  return {
    id: 'test-set',
    name: 'Test Set',
    game: 'Test Game',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    packSize: 1,
    packsPerBox: 10,
    packPrice: 4.0,

    rarities: [
      { id: 'c', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 10, factionId: null },
      { id: 'r', name: 'Rare', shortCode: 'R', color: '#00f', cardCount: 5, factionId: null },
    ],
    factions: [],
    slots: [
      { id: 's1', position: 1, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 80 }, { rarityId: 'r', weight: 20 }] },
    ],
    cards: [
      { id: 'c1', name: 'Common 1', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'c2', name: 'Common 2', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'c3', name: 'Common 3', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'c4', name: 'Common 4', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'c5', name: 'Common 5', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'c6', name: 'Common 6', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'c7', name: 'Common 7', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'c8', name: 'Common 8', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'c9', name: 'Common 9', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'c10', name: 'Common 10', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'r1', name: 'Rare 1', rarityId: 'r', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'r2', name: 'Rare 2', rarityId: 'r', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'r3', name: 'Rare 3', rarityId: 'r', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'r4', name: 'Rare 4', rarityId: 'r', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'r5', name: 'Rare 5', rarityId: 'r', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
    ],
    slotDividers: [],
    rarityDividers: [],
    noPackDuplicates: false,
    pityTimers: [],
  }
}

describe('runDeckAcquisitionSim', () => {
  it('returns zero for empty targets', () => {
    const set = makeTestSet()
    const result = runDeckAcquisitionSim(set, { targets: [], numIterations: 100, seed: 42 })
    expect(result.mean).toBe(0)
    expect(result.distribution.length).toBe(0)
  })

  it('simulates pulling a single common card', () => {
    const set = makeTestSet()
    const config: DeckAcquisitionConfig = {
      targets: [{ cardName: 'Common 1', copies: 1 }],
      numIterations: 1000,
      seed: 42,
    }

    const result = runDeckAcquisitionSim(set, config)

    // 1 slot, 80% chance of Common, 10 commons → 8% chance per pack of getting c1
    // Expected ~12.5 packs for 1 copy
    expect(result.mean).toBeGreaterThan(5)
    expect(result.mean).toBeLessThan(25)
    expect(result.min).toBeGreaterThanOrEqual(1)
    expect(result.distribution.length).toBe(1000)
  })

  it('simulates pulling a rare card', () => {
    const set = makeTestSet()
    const config: DeckAcquisitionConfig = {
      targets: [{ cardName: 'Rare 1', copies: 1 }],
      numIterations: 1000,
      seed: 42,
    }

    const result = runDeckAcquisitionSim(set, config)

    // 20% chance of Rare, 5 rares → 4% chance per pack
    // Expected ~25 packs for 1 copy
    expect(result.mean).toBeGreaterThan(10)
    expect(result.mean).toBeLessThan(50)
  })

  it('percentiles are in ascending order', () => {
    const set = makeTestSet()
    const config: DeckAcquisitionConfig = {
      targets: [{ cardName: 'Common 1', copies: 2 }],
      numIterations: 1000,
      seed: 42,
    }

    const result = runDeckAcquisitionSim(set, config)
    const p = result.percentiles
    expect(p.p5).toBeLessThanOrEqual(result.median)
    expect(result.median).toBeLessThanOrEqual(p.p95)
  })

  it('is deterministic with seed', () => {
    const set = makeTestSet()
    const config: DeckAcquisitionConfig = {
      targets: [{ cardName: 'Rare 1', copies: 1 }],
      numIterations: 500,
      seed: 123,
    }

    const result1 = runDeckAcquisitionSim(set, config)
    const result2 = runDeckAcquisitionSim(set, config)

    expect(result1.mean).toBe(result2.mean)
    expect(result1.distribution).toEqual(result2.distribution)
  })

  it('computes box count correctly', () => {
    const set = makeTestSet() // packsPerBox = 10
    const config: DeckAcquisitionConfig = {
      targets: [{ cardName: 'Common 1', copies: 1 }],
      numIterations: 1000,
      seed: 42,
    }

    const result = runDeckAcquisitionSim(set, config)
    expect(result.meanBoxes).not.toBeNull()
    expect(result.meanBoxes).toBeCloseTo(result.mean / 10, 1)
  })

  it('multiple targets require more packs', () => {
    const set = makeTestSet()
    const single = runDeckAcquisitionSim(set, {
      targets: [{ cardName: 'Common 1', copies: 1 }],
      numIterations: 1000,
      seed: 42,
    })
    const multi = runDeckAcquisitionSim(set, {
      targets: [
        { cardName: 'Common 1', copies: 1 },
        { cardName: 'Rare 1', copies: 1 },
      ],
      numIterations: 1000,
      seed: 42,
    })

    expect(multi.mean).toBeGreaterThan(single.mean)
  })
})
