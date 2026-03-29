import { describe, it, expect } from 'vitest'
import { buildAliasTable, sampleAlias, buildCardAliasTables } from '../lib/sampling'
import { xoshiro128ss } from '../lib/random'
import type { Card } from '../types'

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

  it('handles many entries', () => {
    const pool = Array.from({ length: 20 }, (_, i) => ({
      rarityId: `r${i}`,
      weight: Math.random() * 100,
    }))
    const table = buildAliasTable(pool)
    expect(table.ids.length).toBe(20)
  })
})

describe('sampleAlias', () => {
  it('returns empty string for empty table', () => {
    const table = buildAliasTable([])
    const rand = xoshiro128ss(42)
    expect(sampleAlias(table, rand)).toBe('')
  })

  it('always returns the only id for single-entry table', () => {
    const table = buildAliasTable([{ rarityId: 'only', weight: 100 }])
    const rand = xoshiro128ss(42)
    for (let i = 0; i < 100; i++) {
      expect(sampleAlias(table, rand)).toBe('only')
    }
  })

  it('respects weights over many samples', () => {
    const table = buildAliasTable([
      { rarityId: 'a', weight: 80 },
      { rarityId: 'b', weight: 20 },
    ])
    const rand = xoshiro128ss(42)
    const counts: Record<string, number> = { a: 0, b: 0 }
    const n = 10000
    for (let i = 0; i < n; i++) {
      counts[sampleAlias(table, rand)]++
    }
    // Expect roughly 80/20 split
    expect(counts.a / n).toBeGreaterThan(0.75)
    expect(counts.a / n).toBeLessThan(0.85)
    expect(counts.b / n).toBeGreaterThan(0.15)
    expect(counts.b / n).toBeLessThan(0.25)
  })

  it('is deterministic with seeded PRNG', () => {
    const table = buildAliasTable([
      { rarityId: 'a', weight: 50 },
      { rarityId: 'b', weight: 50 },
    ])
    const r1 = xoshiro128ss(99)
    const r2 = xoshiro128ss(99)
    for (let i = 0; i < 100; i++) {
      expect(sampleAlias(table, r1)).toBe(sampleAlias(table, r2))
    }
  })
})

function makeCard(id: string, rarityId: string, relativeWeight = 1): Card {
  return { id, name: id, rarityId, factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight }
}

describe('buildCardAliasTables', () => {
  it('creates one table per rarity', () => {
    const cards = [makeCard('c1', 'common'), makeCard('c2', 'common'), makeCard('r1', 'rare')]
    const tables = buildCardAliasTables(cards)
    expect(tables.size).toBe(2)
    expect(tables.get('common')!.ids.length).toBe(2)
    expect(tables.get('rare')!.ids.length).toBe(1)
  })

  it('respects relativeWeight in sampling', () => {
    // Card A has weight 9, Card B has weight 1 → A should appear ~90%
    const cards = [makeCard('a', 'r', 9), makeCard('b', 'r', 1)]
    const tables = buildCardAliasTables(cards)
    const table = tables.get('r')!
    const rand = xoshiro128ss(42)
    const counts: Record<string, number> = { a: 0, b: 0 }
    const n = 10000
    for (let i = 0; i < n; i++) {
      counts[sampleAlias(table, rand)]++
    }
    expect(counts.a / n).toBeGreaterThan(0.85)
    expect(counts.b / n).toBeLessThan(0.15)
  })

  it('uniform weights produce uniform sampling', () => {
    const cards = [makeCard('a', 'r', 1), makeCard('b', 'r', 1), makeCard('c', 'r', 1)]
    const tables = buildCardAliasTables(cards)
    const table = tables.get('r')!
    const rand = xoshiro128ss(42)
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 }
    const n = 9000
    for (let i = 0; i < n; i++) {
      counts[sampleAlias(table, rand)]++
    }
    // Each should be ~33%
    for (const key of ['a', 'b', 'c']) {
      expect(counts[key] / n).toBeGreaterThan(0.28)
      expect(counts[key] / n).toBeLessThan(0.38)
    }
  })
})
