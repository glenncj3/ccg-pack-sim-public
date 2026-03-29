import type { CCGSet, Card, SimConfig, RarityStats, SimResult, CouponCollectorConfig, CouponCollectorResult } from '../types'
import { createRNG } from './random'
import { buildAliasTable, buildCardAliasTables } from './sampling'
import type { AliasTable } from './sampling'
import { computeDistributionStats, percentile } from './stats'
import { resolveCards } from './cardMaps'
import { openSinglePack } from './packEngine'
import type { PackContext, PityState } from './packEngine'

// Re-export for backwards compatibility with existing consumers
export { buildAliasTable } from './sampling'

export interface SimProgress {
  current: number
  total: number
}

export type { SimProgress as Progress }

/**
 * Build pity timer configs from a set's pityTimers, resolving each to its first eligible slot.
 */
function buildPityState(set: CCGSet, slotTables: AliasTable[]): PityState | null {
  const configs = set.pityTimers.map((pt) => ({
    rarityId: pt.rarityId,
    threshold: pt.afterNPacks,
    slotIdx: slotTables.findIndex((_table, idx) =>
      set.slots[idx].pool.some((w) => w.rarityId === pt.rarityId && w.weight > 0)
    ),
  })).filter((pc) => pc.slotIdx >= 0)

  if (configs.length === 0) return null
  return { configs, counts: configs.map(() => 0) }
}

/**
 * Build a PackContext from a CCGSet, reusable across simulation functions.
 */
function buildPackContext(set: CCGSet, cards: ReturnType<typeof resolveCards>): PackContext {
  const slotTables = set.slots.map((slot) => buildAliasTable(slot.pool))
  const cardAliasTables = buildCardAliasTables(cards)
  const pity = buildPityState(set, slotTables)

  return { slotTables, cardAliasTables, noPackDuplicates: set.noPackDuplicates, pity }
}

export function runSimulation(
  set: CCGSet,
  config: SimConfig,
  onProgress?: (progress: SimProgress) => void
): SimResult {
  const rand = createRNG(config.seed)

  const numPacks = config.unitOfMeasure === 'box' && set.packsPerBox
    ? config.numPacks * set.packsPerBox
    : config.numPacks

  const cards = resolveCards(set.cards, set.rarities)
  const ctx = buildPackContext(set, cards)

  // Per-rarity distribution arrays (one value per iteration)
  const rarityDistributions: Map<string, number[]> = new Map()
  for (const r of set.rarities) {
    rarityDistributions.set(r.id, [])
  }

  // Pre-compute cards grouped by rarity (used for collectibility)
  const cardsByRarity = new Map<string, Card[]>()
  for (const r of set.rarities) {
    cardsByRarity.set(r.id, cards.filter((c) => c.rarityId === r.id))
  }

  // Per-rarity collectibility distributions by threshold
  const MAX_THRESHOLD = 8
  const collectibilityDistributions = new Map<string, number[][]>()
  for (const r of set.rarities) {
    const thresholds: number[][] = []
    for (let t = 0; t < MAX_THRESHOLD; t++) thresholds.push([])
    collectibilityDistributions.set(r.id, thresholds)
  }

  for (let iter = 0; iter < config.numIterations; iter++) {
    const rarityCounts: Record<string, number> = {}
    for (const r of set.rarities) rarityCounts[r.id] = 0

    const cardCopies = new Map<string, number>()

    // Reset pity counters for each iteration
    if (ctx.pity) {
      for (let i = 0; i < ctx.pity.counts.length; i++) ctx.pity.counts[i] = 0
    }

    for (let p = 0; p < numPacks; p++) {
      const draws = openSinglePack(ctx, rand)

      for (const draw of draws) {
        rarityCounts[draw.rarityId] = (rarityCounts[draw.rarityId] || 0) + 1
        if (draw.cardId) {
          cardCopies.set(draw.cardId, (cardCopies.get(draw.cardId) ?? 0) + 1)
        }
      }
    }

    // Record per-rarity totals for this iteration
    for (const r of set.rarities) {
      rarityDistributions.get(r.id)!.push(rarityCounts[r.id] || 0)
    }

    // Record collectibility: fraction of cards with >= threshold copies, per rarity
    for (const r of set.rarities) {
      const rarityCards = cardsByRarity.get(r.id)!
      const total = rarityCards.length
      const thresholds = collectibilityDistributions.get(r.id)!
      if (total === 0) {
        for (let t = 0; t < MAX_THRESHOLD; t++) thresholds[t].push(0)
        continue
      }
      // Single pass: count how many cards meet each threshold
      const counts = new Int32Array(MAX_THRESHOLD)
      for (const c of rarityCards) {
        const copies = cardCopies.get(c.id) ?? 0
        const cap = copies < MAX_THRESHOLD ? copies : MAX_THRESHOLD
        for (let t = 0; t < cap; t++) counts[t]++
      }
      for (let t = 0; t < MAX_THRESHOLD; t++) thresholds[t].push(counts[t] / total)
    }

    if (onProgress && iter % 100 === 0) {
      onProgress({ current: iter, total: config.numIterations })
    }
  }

  // Compute statistics
  const rarityStats: RarityStats[] = set.rarities.map((r) => {
    const dist = rarityDistributions.get(r.id)!
    const collectibility = collectibilityDistributions.get(r.id)!
    return computeRarityStats(r.id, dist, numPacks, set.packsPerBox, collectibility)
  })

  return {
    setId: set.id,
    config,
    rarityStats,
    totalPacks: numPacks,
    completedAt: new Date().toISOString(),
  }
}

/**
 * Open packs and return per-pack card IDs. Testable entry point for duplicate protection.
 * Returns array of packs, each pack is an array of { slotPosition, rarityId, cardId }.
 */
export function openPacks(
  set: CCGSet,
  numPacks: number,
  seed: number | null
): { slotPosition: number; rarityId: string; cardId: string }[][] {
  const rand = createRNG(seed)
  const cards = resolveCards(set.cards, set.rarities)
  const slotTables = set.slots.map((slot) => buildAliasTable(slot.pool))
  const cardAliasTables = buildCardAliasTables(cards)

  const ctx: PackContext = { slotTables, cardAliasTables, noPackDuplicates: set.noPackDuplicates, pity: null }

  const packs: { slotPosition: number; rarityId: string; cardId: string }[][] = []

  for (let p = 0; p < numPacks; p++) {
    const draws = openSinglePack(ctx, rand)
    const pack = draws
      .filter((d) => d.cardId !== null)
      .map((d, i) => ({
        slotPosition: set.slots[i]?.position ?? i + 1,
        rarityId: d.rarityId,
        cardId: d.cardId!,
      }))
    packs.push(pack)
  }

  return packs
}

const MAX_PACKS_PER_TRIAL = 100000

export function runCouponCollector(
  set: CCGSet,
  config: CouponCollectorConfig,
  onProgress?: (progress: SimProgress) => void
): CouponCollectorResult {
  const rand = createRNG(config.seed)

  const cards = resolveCards(set.cards, set.rarities)

  // byName mode: target every unique card name; otherwise target by rarity
  const byName = config.byName ?? false
  let targetCards: Card[]
  let targetNames: Set<string> | null = null

  if (byName) {
    targetCards = cards // all cards participate
    targetNames = new Set(cards.map((c) => c.name))
    if (targetNames.size === 0) {
      throw new Error('No cards found in the set')
    }
  } else {
    const targetRaritySet = new Set(config.targetRarityIds)
    targetCards = cards.filter((c) => targetRaritySet.has(c.rarityId))
    if (targetCards.length === 0) {
      throw new Error('No cards found for the selected rarity')
    }
  }

  const ctx = buildPackContext(set, cards)

  // Build cardId -> name lookup for byName tracking
  const cardIdToName = byName ? new Map(cards.map((c) => [c.id, c.name])) : new Map<string, string>()

  // Set of target card IDs for fast membership check in non-byName mode
  const targetCardIds = byName ? new Set<string>() : new Set(targetCards.map((c) => c.id))

  // Pre-compute cards grouped by rarity (used for collectibility)
  const cardsByRarity = new Map<string, Card[]>()
  for (const r of set.rarities) {
    cardsByRarity.set(r.id, cards.filter((c) => c.rarityId === r.id))
  }

  // Per-trial results
  const packsDistribution: number[] = []
  const rarityDistributions: Map<string, number[]> = new Map()
  for (const r of set.rarities) {
    rarityDistributions.set(r.id, [])
  }

  // Collectibility tracking
  const MAX_THRESHOLD = 8
  const collectibilityDistributions = new Map<string, number[][]>()
  for (const r of set.rarities) {
    const thresholds: number[][] = []
    for (let t = 0; t < MAX_THRESHOLD; t++) thresholds.push([])
    collectibilityDistributions.set(r.id, thresholds)
  }

  for (let iter = 0; iter < config.numIterations; iter++) {
    const rarityCounts: Record<string, number> = {}
    for (const r of set.rarities) rarityCounts[r.id] = 0

    const cardCopies = new Map<string, number>()
    const nameCopies = byName ? new Map<string, number>() : null

    // Reset pity counters for each iteration
    if (ctx.pity) {
      for (let i = 0; i < ctx.pity.counts.length; i++) ctx.pity.counts[i] = 0
    }

    let packsOpened = 0
    // Remaining-count: tracks how many targets still need to reach targetCopies
    let remaining = byName ? targetNames!.size : targetCards.length

    while (remaining > 0 && packsOpened < MAX_PACKS_PER_TRIAL) {
      packsOpened++
      const draws = openSinglePack(ctx, rand)

      for (const draw of draws) {
        rarityCounts[draw.rarityId] = (rarityCounts[draw.rarityId] || 0) + 1
        if (draw.cardId) {
          const newCount = (cardCopies.get(draw.cardId) ?? 0) + 1
          cardCopies.set(draw.cardId, newCount)
          if (nameCopies) {
            const name = cardIdToName.get(draw.cardId)
            if (name) {
              const newNameCount = (nameCopies.get(name) ?? 0) + 1
              nameCopies.set(name, newNameCount)
              if (newNameCount === config.targetCopies) remaining--
            }
          } else {
            if (newCount === config.targetCopies && targetCardIds.has(draw.cardId)) remaining--
          }
        }
      }
    }

    packsDistribution.push(packsOpened)

    for (const r of set.rarities) {
      rarityDistributions.get(r.id)!.push(rarityCounts[r.id] || 0)
    }

    // Collectibility
    for (const r of set.rarities) {
      const rarityCards = cardsByRarity.get(r.id)!
      const total = rarityCards.length
      const thresholds = collectibilityDistributions.get(r.id)!
      if (total === 0) {
        for (let t = 0; t < MAX_THRESHOLD; t++) thresholds[t].push(0)
        continue
      }
      // Single pass: count how many cards meet each threshold
      const counts = new Int32Array(MAX_THRESHOLD)
      for (const c of rarityCards) {
        const copies = cardCopies.get(c.id) ?? 0
        const cap = copies < MAX_THRESHOLD ? copies : MAX_THRESHOLD
        for (let t = 0; t < cap; t++) counts[t]++
      }
      for (let t = 0; t < MAX_THRESHOLD; t++) thresholds[t].push(counts[t] / total)
    }

    if (onProgress && iter % 100 === 0) {
      onProgress({ current: iter, total: config.numIterations })
    }
  }

  // Compute packs-to-complete stats
  const { mean: packsMean, stdDev: packsStdDev, sorted: packsSorted } = computeDistributionStats(packsDistribution)
  const packsMedian = packsSorted.length % 2 === 0
    ? (packsSorted[packsSorted.length / 2 - 1] + packsSorted[packsSorted.length / 2]) / 2
    : packsSorted[Math.floor(packsSorted.length / 2)]

  // Compute per-rarity stats (no packsPerBox since pack count varies)
  const rarityStats: RarityStats[] = set.rarities.map((r) => {
    const dist = rarityDistributions.get(r.id)!
    const collectibility = collectibilityDistributions.get(r.id)!
    return computeRarityStats(r.id, dist, 1, null, collectibility)
  })

  return {
    setId: set.id,
    config,
    rarityStats,
    packsToComplete: {
      mean: packsMean,
      median: packsMedian,
      stdDev: packsStdDev,
      p5: percentile(packsSorted, 0.05),
      p95: percentile(packsSorted, 0.95),
      min: packsSorted[0],
      max: packsSorted[packsSorted.length - 1],
      distribution: packsDistribution,
    },
    completedAt: new Date().toISOString(),
  }
}

function computeRarityStats(
  rarityId: string,
  distribution: number[],
  totalPacks: number,
  packsPerBox: number | null,
  collectibility: number[][]
): RarityStats {
  const { mean, stdDev, sorted } = computeDistributionStats(distribution)

  if (distribution.length === 0) {
    return {
      rarityId, mean: 0, median: 0, stdDev: 0,
      avgPerBox: null, p5: 0, p95: 0, pZero: 1, distribution: [], collectibility: [],
    }
  }

  const avgPerPack = mean / totalPacks
  const avgPerBox = packsPerBox ? avgPerPack * packsPerBox : null
  const p5 = percentile(sorted, 0.05)
  const p95 = percentile(sorted, 0.95)
  const pZero = distribution.filter((v) => v === 0).length / distribution.length

  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]

  return { rarityId, mean, median, stdDev, avgPerBox, p5, p95, pZero, distribution, collectibility }
}
