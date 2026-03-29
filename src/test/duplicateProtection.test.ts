import { describe, it, expect } from 'vitest'
import { openPacks } from '../lib/simulation'
import type { CCGSet, Card } from '../types'

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

function makeSet(overrides?: Partial<CCGSet>): CCGSet {
  return {
    id: 'test-set',
    name: 'Test',
    game: 'Test',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    packSize: 3,
    packsPerBox: 5,
    packPrice: 4.0,

    rarities: [
      { id: 'c', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 20, factionId: null },
    ],
    factions: [],
    slots: [
      { id: 's1', position: 1, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 100 }] },
      { id: 's2', position: 2, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 100 }] },
      { id: 's3', position: 3, label: '', isFoil: false, pool: [{ rarityId: 'c', weight: 100 }] },
    ],
    cards: makeCards('c', 20),
    slotDividers: [],
    rarityDividers: [],
    noPackDuplicates: true,
    pityTimers: [],
    ...overrides,
  }
}

describe('noPackDuplicates', () => {
  it('every pack contains unique card IDs', () => {
    const set = makeSet()
    const packs = openPacks(set, 200, 42)

    for (let i = 0; i < packs.length; i++) {
      const cardIds = packs[i].map((draw) => draw.cardId)
      const unique = new Set(cardIds)
      expect(unique.size, `Pack ${i + 1} has duplicates: [${cardIds.join(', ')}]`).toBe(cardIds.length)
    }
  })

  it('works with synthesized cards (no CSV)', () => {
    const set = makeSet({ cards: [] }) // will synthesize from cardCount=20
    const packs = openPacks(set, 100, 42)

    for (let i = 0; i < packs.length; i++) {
      const cardIds = packs[i].map((d) => d.cardId)
      const unique = new Set(cardIds)
      expect(unique.size, `Pack ${i + 1} has duplicates: [${cardIds.join(', ')}]`).toBe(cardIds.length)
    }
  })

  it('gracefully falls back when card pool is smaller than slot count', () => {
    // 2 cards but 3 slots — can't avoid all dupes, but must not crash
    const set = makeSet({
      cards: makeCards('c', 2),
      rarities: [{ id: 'c', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 2, factionId: null }],
    })
    const packs = openPacks(set, 50, 42)

    // Should produce packs without crashing
    expect(packs.length).toBe(50)
    // Each pack has 3 draws
    expect(packs[0].length).toBe(3)

    // At most 2 unique per pack (pool is only 2 cards)
    // Some packs WILL have a duplicate — that's expected pool exhaustion
    let dupePackCount = 0
    for (const pack of packs) {
      const unique = new Set(pack.map((d) => d.cardId))
      if (unique.size < pack.length) dupePackCount++
    }
    // With only 2 cards and 3 slots, every pack must have at least 1 dupe
    expect(dupePackCount).toBe(50)
  })

  it('without protection enabled, packs CAN contain duplicates', () => {
    const set = makeSet({
      cards: makeCards('c', 5), // small pool to make dupes likely
      rarities: [{ id: 'c', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 5, factionId: null }],
      noPackDuplicates: false,
      pityTimers: [],
    })
    const packs = openPacks(set, 500, 42)

    // With 5 cards and 3 slots per pack and NO protection, some packs should have dupes
    let hasDupe = false
    for (const pack of packs) {
      const unique = new Set(pack.map((d) => d.cardId))
      if (unique.size < pack.length) { hasDupe = true; break }
    }
    expect(hasDupe).toBe(true)
  })
})

