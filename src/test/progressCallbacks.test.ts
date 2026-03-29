import { describe, it, expect } from 'vitest'
import { runSimulation } from '../lib/simulation'
import { runDeckAcquisitionSim } from '../lib/deckAcquisition'
import type { CCGSet } from '../types'

function makeTestSet(): CCGSet {
  return {
    id: 'test-set',
    name: 'Test Set',
    game: 'Test',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    packSize: 1,
    packsPerBox: null,
    packPrice: 4.0,

    rarities: [
      { id: 'c', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 5, factionId: null },
    ],
    factions: [],
    slots: [
      { id: 's1', position: 1, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 100 }] },
    ],
    cards: [
      { id: 'c1', name: 'Card 1', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'c2', name: 'Card 2', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
      { id: 'c3', name: 'Card 3', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
    ],
    slotDividers: [],
    rarityDividers: [],
    noPackDuplicates: false,
    pityTimers: [],
  }
}

describe('Progress callback normalization', () => {
  it('runSimulation uses { current, total } object form', () => {
    const progressCalls: { current: number; total: number }[] = []

    runSimulation(
      makeTestSet(),
      { numPacks: 10, numIterations: 500, unitOfMeasure: 'pack', seed: 42 },
      (progress) => { progressCalls.push(progress) }
    )

    expect(progressCalls.length).toBeGreaterThan(0)
    for (const p of progressCalls) {
      expect(typeof p.current).toBe('number')
      expect(typeof p.total).toBe('number')
      expect(p.total).toBe(500)
      expect(p.current).toBeLessThanOrEqual(p.total)
    }
  })

  it('runDeckAcquisitionSim uses { current, total } object form', () => {
    const progressCalls: { current: number; total: number }[] = []

    runDeckAcquisitionSim(
      makeTestSet(),
      { targets: [{ cardName: 'Card 1', copies: 1 }], numIterations: 500, seed: 42 },
      (progress) => { progressCalls.push(progress) }
    )

    expect(progressCalls.length).toBeGreaterThan(0)
    for (const p of progressCalls) {
      expect(typeof p.current).toBe('number')
      expect(typeof p.total).toBe('number')
      expect(p.total).toBe(500)
      expect(p.current).toBeLessThanOrEqual(p.total)
    }
  })

  it('both modules have identical callback shape', () => {
    const simCalls: unknown[] = []
    const deckCalls: unknown[] = []

    const set = makeTestSet()

    runSimulation(set,
      { numPacks: 10, numIterations: 200, unitOfMeasure: 'pack', seed: 42 },
      (p) => simCalls.push(p)
    )

    runDeckAcquisitionSim(set,
      { targets: [{ cardName: 'Card 1', copies: 1 }], numIterations: 200, seed: 42 },
      (p) => deckCalls.push(p)
    )

    // All should have the same keys
    const simKeys = Object.keys(simCalls[0] as object).sort()
    const deckKeys = Object.keys(deckCalls[0] as object).sort()

    expect(simKeys).toEqual(['current', 'total'])
    expect(deckKeys).toEqual(['current', 'total'])
  })
})
