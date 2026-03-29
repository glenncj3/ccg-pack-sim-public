import type { CCGSet, ValueAnalyzerConfig, EVResult } from '../types'
import { createRNG } from './random'
import { buildAliasTable, buildCardAliasTables, sampleAlias } from './sampling'

/**
 * Calculate expected value per pack based on slot weights and pricing.
 *
 * For each slot, we compute the probability of drawing each rarity,
 * then multiply by the average price for that rarity. The sum across
 * all slots gives the total EV per pack.
 */
export function calculateEV(set: CCGSet, config: ValueAnalyzerConfig, seed?: number | null): EVResult {
  // Build a map of rarity -> average price
  const rarityPriceMap = new Map<string, number>()
  const hasCSVValues = set.cards.some((c) => c.value != null)

  if (hasCSVValues) {
    // Derive weighted average price per rarity from individual card values
    const rarityTotals = new Map<string, { weightedSum: number; totalWeight: number }>()

    for (const card of set.cards) {
      const price = card.value ?? 0
      const existing = rarityTotals.get(card.rarityId) ?? { weightedSum: 0, totalWeight: 0 }
      const w = card.relativeWeight ?? 1
      existing.weightedSum += price * w
      existing.totalWeight += w
      rarityTotals.set(card.rarityId, existing)
    }

    for (const [rarityId, totals] of rarityTotals) {
      rarityPriceMap.set(rarityId, totals.totalWeight > 0 ? totals.weightedSum / totals.totalWeight : 0)
    }
  } else {
    // Use manually-entered rarity-level pricing
    for (const rp of config.rarityPrices) {
      rarityPriceMap.set(rp.rarityId, rp.avgPrice)
    }
  }

  // Calculate per-rarity EV contribution across all slots
  const rarityEVAccum = new Map<string, { totalWeight: number }>()
  for (const r of set.rarities) {
    rarityEVAccum.set(r.id, { totalWeight: 0 })
  }

  for (const slot of set.slots) {
    const totalWeight = slot.pool.reduce((s, w) => s + w.weight, 0)
    if (totalWeight === 0) continue

    for (const w of slot.pool) {
      const accum = rarityEVAccum.get(w.rarityId)
      if (accum) {
        accum.totalWeight += w.weight / totalWeight
      }
    }
  }

  const rarityContributions = set.rarities.map((r) => {
    const accum = rarityEVAccum.get(r.id)!
    const avgCardsPerPack = accum.totalWeight
    const avgPrice = rarityPriceMap.get(r.id) ?? 0
    const evPerPack = avgCardsPerPack * avgPrice

    return {
      rarityId: r.id,
      evPerPack,
      avgCardsPerPack,
      avgPrice,
    }
  })

  const totalEVPerPack = rarityContributions.reduce((s, c) => s + c.evPerPack, 0)
  const packsToBreakeven = totalEVPerPack > 0 && totalEVPerPack < set.packPrice
    ? set.packPrice / totalEVPerPack
    : totalEVPerPack >= set.packPrice
      ? null // Always profitable
      : Infinity

  // Build per-card price map for Monte Carlo simulation
  const cardPriceMap = new Map<string, number>()
  if (hasCSVValues) {
    for (const card of set.cards) {
      const v = card.value
      if (v != null && v >= 0) {
        cardPriceMap.set(card.id, v)
      }
    }
  }

  // Simulate pack EV distribution using Monte Carlo
  const packEVDistribution = simulatePackEVDistribution(set, rarityPriceMap, cardPriceMap, 10000, seed ?? null)

  return {
    totalEVPerPack,
    rarityContributions,
    packsToBreakeven: packsToBreakeven === Infinity ? null : packsToBreakeven,
    packEVDistribution,
  }
}

function simulatePackEVDistribution(
  set: CCGSet,
  rarityPriceMap: Map<string, number>,
  cardPriceMap: Map<string, number>,
  numSamples: number,
  seed: number | null
): number[] {
  const rand = createRNG(seed)
  const slotTables = set.slots.map((slot) => buildAliasTable(slot.pool))

  // Build per-rarity card alias tables for sampling individual cards
  const cardTables = cardPriceMap.size > 0 ? buildCardAliasTables(set.cards) : null

  const distribution: number[] = []

  for (let i = 0; i < numSamples; i++) {
    let packEV = 0
    for (const table of slotTables) {
      if (table.ids.length === 0) continue
      const rarityId = sampleAlias(table, rand)

      // If we have per-card prices and cards for this rarity, sample a card
      const cardTable = cardTables?.get(rarityId)
      if (cardTable && cardTable.ids.length > 0) {
        const cardId = sampleAlias(cardTable, rand)
        packEV += cardPriceMap.get(cardId) ?? rarityPriceMap.get(rarityId) ?? 0
      } else {
        packEV += rarityPriceMap.get(rarityId) ?? 0
      }
    }
    distribution.push(packEV)
  }

  return distribution
}
