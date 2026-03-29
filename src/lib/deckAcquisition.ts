import type { CCGSet, DeckAcquisitionConfig, DeckAcquisitionResult } from '../types'
import type { SimProgress } from './simulation'
import { createRNG } from './random'
import { buildAliasTable, buildCardAliasTables } from './sampling'
import { computeDistributionStats, percentile } from './stats'
import { resolveCards } from './cardMaps'
import { openSinglePack } from './packEngine'
import type { PackContext } from './packEngine'

/**
 * Simulate how many packs it takes to pull all required card copies.
 *
 * For each iteration:
 * 1. Open packs one at a time
 * 2. Each slot resolves to a rarity via weighted random
 * 3. From that rarity's card pool, pick a card uniformly at random
 * 4. Track collected copies per target card
 * 5. Stop when all targets are met
 */
export function runDeckAcquisitionSim(
  set: CCGSet,
  config: DeckAcquisitionConfig,
  onProgress?: (progress: SimProgress) => void
): DeckAcquisitionResult {
  if (config.targets.length === 0) {
    return {
      mean: 0, median: 0, stdDev: 0, min: 0, max: 0,
      percentiles: { p5: 0, p95: 0 },
      distribution: [], meanBoxes: null,
    }
  }

  const cards = resolveCards(set.cards, set.rarities)
  const slotTables = set.slots.map((slot) => buildAliasTable(slot.pool))
  const cardAliasTables = buildCardAliasTables(cards)

  // Build cardId → name lookup for name-based matching
  const cardIdToName = new Map(cards.map((c) => [c.id, c.name]))

  // Target set: which card names and how many copies needed
  const targetMap = new Map<string, number>()
  for (const t of config.targets) {
    targetMap.set(t.cardName, t.copies)
  }

  const rand = createRNG(config.seed ?? null)

  const ctx: PackContext = { slotTables, cardAliasTables, noPackDuplicates: set.noPackDuplicates, pity: null }

  const packsNeeded: number[] = []

  for (let iter = 0; iter < config.numIterations; iter++) {
    const collected = new Map<string, number>()
    for (const t of config.targets) {
      collected.set(t.cardName, 0)
    }

    let packs = 0
    let allMet = false
    const maxPacks = 100000 // Safety limit

    while (!allMet && packs < maxPacks) {
      packs++
      const draws = openSinglePack(ctx, rand)

      for (const draw of draws) {
        if (draw.cardId) {
          const name = cardIdToName.get(draw.cardId)
          if (name && collected.has(name)) {
            collected.set(name, collected.get(name)! + 1)
          }
        }
      }

      // Check if all targets met
      allMet = true
      for (const [cardName, needed] of targetMap) {
        if ((collected.get(cardName) ?? 0) < needed) {
          allMet = false
          break
        }
      }
    }

    packsNeeded.push(packs)

    if (onProgress && iter % 100 === 0) {
      onProgress({ current: iter, total: config.numIterations })
    }
  }

  return buildResult(packsNeeded, set.packsPerBox)
}

function buildResult(distribution: number[], packsPerBox: number | null): DeckAcquisitionResult {
  const n = distribution.length
  if (n === 0) {
    return {
      mean: 0, median: 0, stdDev: 0, min: 0, max: 0,
      percentiles: { p5: 0, p95: 0 },
      distribution: [], meanBoxes: null,
    }
  }

  const { mean, median, stdDev, min, max, sorted } = computeDistributionStats(distribution)

  return {
    mean, median, stdDev, min, max,
    percentiles: { p5: percentile(sorted, 0.05), p95: percentile(sorted, 0.95) },
    distribution,
    meanBoxes: packsPerBox ? mean / packsPerBox : null,
  }
}
