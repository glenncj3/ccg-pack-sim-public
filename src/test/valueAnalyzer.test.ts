import { describe, it, expect } from 'vitest'
import { calculateEV } from '../lib/valueAnalyzer'
import type { CCGSet, ValueAnalyzerConfig } from '../types'

function makeTestSet(): CCGSet {
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
      { id: 'c', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 100, factionId: null },
      { id: 'r', name: 'Rare', shortCode: 'R', color: '#00f', cardCount: 30, factionId: null },
      { id: 'm', name: 'Mythic', shortCode: 'M', color: '#f90', cardCount: 10, factionId: null },
    ],
    factions: [],
    slots: [
      { id: 's1', position: 1, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 100 }] },
      { id: 's2', position: 2, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 100 }] },
      { id: 's3', position: 3, label: '', isFoil: false, pool: [{ rarityId: 'r', weight: 87.5 }, { rarityId: 'm', weight: 12.5 }] },
    ],
    cards: [],
    slotDividers: [],
    rarityDividers: [],
    noPackDuplicates: false,
    pityTimers: [],
  }
}

describe('calculateEV', () => {
  it('calculates EV per pack correctly', () => {
    const set = makeTestSet()
    const config: ValueAnalyzerConfig = {
      pricingMode: 'rarity',
      rarityPrices: [
        { rarityId: 'c', avgPrice: 0.05 },
        { rarityId: 'r', avgPrice: 1.00 },
        { rarityId: 'm', avgPrice: 5.00 },
      ],
      cardPrices: [],
    }

    const result = calculateEV(set, config)

    // Common: 2 per pack * $0.05 = $0.10
    const commonContrib = result.rarityContributions.find((c) => c.rarityId === 'c')!
    expect(commonContrib.avgCardsPerPack).toBe(2)
    expect(commonContrib.evPerPack).toBeCloseTo(0.10, 4)

    // Rare: 0.875 per pack * $1.00 = $0.875
    const rareContrib = result.rarityContributions.find((c) => c.rarityId === 'r')!
    expect(rareContrib.avgCardsPerPack).toBeCloseTo(0.875, 3)
    expect(rareContrib.evPerPack).toBeCloseTo(0.875, 3)

    // Mythic: 0.125 per pack * $5.00 = $0.625
    const mythicContrib = result.rarityContributions.find((c) => c.rarityId === 'm')!
    expect(mythicContrib.avgCardsPerPack).toBeCloseTo(0.125, 3)
    expect(mythicContrib.evPerPack).toBeCloseTo(0.625, 3)

    // Total: $0.10 + $0.875 + $0.625 = $1.60
    expect(result.totalEVPerPack).toBeCloseTo(1.60, 2)
  })

  it('calculates breakeven correctly', () => {
    const set = makeTestSet()
    const config: ValueAnalyzerConfig = {
      pricingMode: 'rarity',
      rarityPrices: [
        { rarityId: 'c', avgPrice: 0.05 },
        { rarityId: 'r', avgPrice: 1.00 },
        { rarityId: 'm', avgPrice: 5.00 },
      ],
      cardPrices: [],
    }

    const result = calculateEV(set, config)

    // EV is $1.60 per pack, pack costs $4.00
    // Breakeven means 4.0 / 1.60 = 2.5 packs
    expect(result.packsToBreakeven).toBeCloseTo(2.5, 1)
  })

  it('returns null breakeven when EV >= pack price', () => {
    const set = { ...makeTestSet(), packPrice: 1.0 }
    const config: ValueAnalyzerConfig = {
      pricingMode: 'rarity',
      rarityPrices: [
        { rarityId: 'c', avgPrice: 0.05 },
        { rarityId: 'r', avgPrice: 1.00 },
        { rarityId: 'm', avgPrice: 5.00 },
      ],
      cardPrices: [],
    }

    const result = calculateEV(set, config)
    // EV ($1.60) > pack price ($1.00), so always profitable
    expect(result.packsToBreakeven).toBeNull()
  })

  it('handles zero prices gracefully', () => {
    const set = makeTestSet()
    const config: ValueAnalyzerConfig = {
      pricingMode: 'rarity',
      rarityPrices: [
        { rarityId: 'c', avgPrice: 0 },
        { rarityId: 'r', avgPrice: 0 },
        { rarityId: 'm', avgPrice: 0 },
      ],
      cardPrices: [],
    }

    const result = calculateEV(set, config)
    expect(result.totalEVPerPack).toBe(0)
    expect(result.packsToBreakeven).toBeNull() // 0/0 edge case
  })

  it('produces pack EV distribution', () => {
    const set = makeTestSet()
    const config: ValueAnalyzerConfig = {
      pricingMode: 'rarity',
      rarityPrices: [
        { rarityId: 'c', avgPrice: 0.05 },
        { rarityId: 'r', avgPrice: 1.00 },
        { rarityId: 'm', avgPrice: 5.00 },
      ],
      cardPrices: [],
    }

    const result = calculateEV(set, config)
    expect(result.packEVDistribution.length).toBe(10000)
    // All values should be positive since all prices are positive
    expect(result.packEVDistribution.every((v) => v >= 0)).toBe(true)
  })

  it('calculates EV using card-level pricing', () => {
    const set: CCGSet = {
      ...makeTestSet(),
      cards: [
        { id: 'c1', name: 'Common 1', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1, value: 0.10 },
        { id: 'c2', name: 'Common 2', rarityId: 'c', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1, value: 0.20 },
        { id: 'r1', name: 'Rare 1', rarityId: 'r', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1, value: 2.00 },
        { id: 'm1', name: 'Mythic 1', rarityId: 'm', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1, value: 10.00 },
      ],
    }

    const config: ValueAnalyzerConfig = {
      pricingMode: 'card',
      rarityPrices: [],
      cardPrices: [
        { cardId: 'c1', price: 0.10 },
        { cardId: 'c2', price: 0.20 },
        { cardId: 'r1', price: 2.00 },
        { cardId: 'm1', price: 10.00 },
      ],
    }

    const result = calculateEV(set, config)

    // Common avg price: (0.10 + 0.20) / 2 = 0.15
    const commonContrib = result.rarityContributions.find((c) => c.rarityId === 'c')!
    expect(commonContrib.avgPrice).toBeCloseTo(0.15, 4)

    // Rare avg price: 2.00 / 1 = 2.00
    const rareContrib = result.rarityContributions.find((c) => c.rarityId === 'r')!
    expect(rareContrib.avgPrice).toBeCloseTo(2.00, 4)

    // Mythic avg price: 10.00 / 1 = 10.00
    const mythicContrib = result.rarityContributions.find((c) => c.rarityId === 'm')!
    expect(mythicContrib.avgPrice).toBeCloseTo(10.00, 4)

    // Total EV: 2*0.15 + 0.875*2.00 + 0.125*10.00 = 0.30 + 1.75 + 1.25 = 3.30
    expect(result.totalEVPerPack).toBeCloseTo(3.30, 1)
  })
})
