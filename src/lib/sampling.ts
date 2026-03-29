import type { Card, SlotRarityWeight } from '../types'

export interface AliasTable {
  prob: Float64Array
  alias: Int32Array
  ids: string[]
}

export function buildAliasTable(pool: SlotRarityWeight[]): AliasTable {
  const n = pool.length
  if (n === 0) return { prob: new Float64Array(0), alias: new Int32Array(0), ids: [] }

  const ids = pool.map((w) => w.rarityId)
  const totalWeight = pool.reduce((s, w) => s + w.weight, 0)
  const prob = new Float64Array(n)
  const alias = new Int32Array(n)

  const scaled = pool.map((w) => (w.weight / totalWeight) * n)
  const small: number[] = []
  const large: number[] = []

  for (let i = 0; i < n; i++) {
    if (scaled[i] < 1) small.push(i)
    else large.push(i)
  }

  while (small.length > 0 && large.length > 0) {
    const s = small.pop()!
    const l = large.pop()!
    prob[s] = scaled[s]
    alias[s] = l
    scaled[l] = scaled[l] + scaled[s] - 1
    if (scaled[l] < 1) small.push(l)
    else large.push(l)
  }

  while (large.length > 0) prob[large.pop()!] = 1
  while (small.length > 0) prob[small.pop()!] = 1

  return { prob, alias, ids }
}

export function sampleAlias(table: AliasTable, rand: () => number): string {
  const n = table.ids.length
  if (n === 0) return ''
  const i = (rand() * n) | 0
  return rand() < table.prob[i] ? table.ids[i] : table.ids[table.alias[i]]
}

/**
 * Build alias tables for weighted card sampling within each rarity.
 * Returns a map: rarityId -> AliasTable of card IDs weighted by relativeWeight.
 */
export function buildCardAliasTables(cards: Card[]): Map<string, AliasTable> {
  const byRarity = new Map<string, Card[]>()
  for (const card of cards) {
    const list = byRarity.get(card.rarityId) ?? []
    list.push(card)
    byRarity.set(card.rarityId, list)
  }

  const tables = new Map<string, AliasTable>()
  for (const [rarityId, rarityCards] of byRarity) {
    const pool = rarityCards.map((c) => ({ rarityId: c.id, weight: c.relativeWeight ?? 1 }))
    tables.set(rarityId, buildAliasTable(pool))
  }
  return tables
}

