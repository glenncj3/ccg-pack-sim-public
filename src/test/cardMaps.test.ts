import { describe, it, expect } from 'vitest'
import { buildRarityCardMap, synthesizeCards, resolveCards } from '../lib/cardMaps'
import type { Card, Rarity } from '../types'

function makeCard(id: string, rarityId: string): Card {
  return { id, name: id, rarityId, factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 }
}

describe('buildRarityCardMap', () => {
  it('returns empty map for no cards', () => {
    const map = buildRarityCardMap([])
    expect(map.size).toBe(0)
  })

  it('groups cards by rarity', () => {
    const cards = [
      makeCard('c1', 'common'),
      makeCard('c2', 'common'),
      makeCard('r1', 'rare'),
    ]
    const map = buildRarityCardMap(cards)
    expect(map.get('common')).toEqual(['c1', 'c2'])
    expect(map.get('rare')).toEqual(['r1'])
  })

  it('handles single rarity', () => {
    const cards = [makeCard('a', 'x'), makeCard('b', 'x'), makeCard('c', 'x')]
    const map = buildRarityCardMap(cards)
    expect(map.size).toBe(1)
    expect(map.get('x')!.length).toBe(3)
  })
})

const testRarities: Rarity[] = [
  { id: 'c', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 3, factionId: null },
  { id: 'r', name: 'Rare', shortCode: 'R', color: '#00f', cardCount: 2, factionId: null },
]

describe('synthesizeCards', () => {
  it('generates correct number of cards per rarity', () => {
    const cards = synthesizeCards(testRarities)
    expect(cards.length).toBe(5) // 3 common + 2 rare
    expect(cards.filter((c) => c.rarityId === 'c').length).toBe(3)
    expect(cards.filter((c) => c.rarityId === 'r').length).toBe(2)
  })

  it('generates unique IDs', () => {
    const cards = synthesizeCards(testRarities)
    const ids = new Set(cards.map((c) => c.id))
    expect(ids.size).toBe(5)
  })

  it('all cards have relativeWeight 1', () => {
    const cards = synthesizeCards(testRarities)
    expect(cards.every((c) => c.relativeWeight === 1)).toBe(true)
  })

  it('handles rarity with zero cardCount', () => {
    const rarities: Rarity[] = [
      { id: 'x', name: 'Empty', shortCode: 'X', color: '#000', cardCount: 0, factionId: null },
    ]
    const cards = synthesizeCards(rarities)
    expect(cards.length).toBe(0)
  })
})

describe('resolveCards', () => {
  it('returns existing cards when populated', () => {
    const existing = [makeCard('c1', 'c')]
    const resolved = resolveCards(existing, testRarities)
    expect(resolved).toBe(existing) // same reference
  })

  it('synthesizes when cards array is empty', () => {
    const resolved = resolveCards([], testRarities)
    expect(resolved.length).toBe(5)
    expect(resolved[0].id).toMatch(/^synth_/)
  })
})

