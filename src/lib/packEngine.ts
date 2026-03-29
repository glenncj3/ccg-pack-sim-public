import { sampleAlias } from './sampling'
import type { AliasTable } from './sampling'

export interface PityConfig {
  rarityId: string
  threshold: number
  slotIdx: number
}

export interface PityState {
  configs: PityConfig[]
  counts: number[]  // mutable — one per config entry, updated in-place each pack
}

export interface PackContext {
  slotTables: AliasTable[]
  cardAliasTables: Map<string, AliasTable>
  noPackDuplicates: boolean
  pity: PityState | null
}

export interface PackDraw {
  rarityId: string
  cardId: string | null
}

/**
 * Open a single pack: for each slot, sample a rarity then a card.
 * Handles pity timers (mutates pity.counts) and duplicate protection.
 */
export function openSinglePack(ctx: PackContext, rand: () => number): PackDraw[] {
  const draws: PackDraw[] = []
  const pityFiredThisPack = ctx.pity ? new Set<string>() : null
  const packCardsSeen = ctx.noPackDuplicates ? new Set<string>() : null

  for (let s = 0; s < ctx.slotTables.length; s++) {
    const table = ctx.slotTables[s]
    if (table.ids.length === 0) continue

    // Pity timer: first eligible timer wins for this slot
    let rarityId: string | undefined
    if (ctx.pity) {
      for (let pi = 0; pi < ctx.pity.configs.length; pi++) {
        const pc = ctx.pity.configs[pi]
        if (pc.slotIdx === s && ctx.pity.counts[pi] >= pc.threshold && !pityFiredThisPack!.has(pc.rarityId)) {
          rarityId = pc.rarityId
          break
        }
      }
    }
    if (rarityId === undefined) {
      rarityId = sampleAlias(table, rand)
    }

    // Track which pity rarities appeared (naturally or forced)
    if (pityFiredThisPack) {
      for (let pi = 0; pi < ctx.pity!.configs.length; pi++) {
        if (rarityId === ctx.pity!.configs[pi].rarityId) pityFiredThisPack.add(rarityId)
      }
    }

    // Resolve to a specific card
    const cardTable = ctx.cardAliasTables.get(rarityId)
    if (!cardTable || cardTable.ids.length === 0) {
      draws.push({ rarityId, cardId: null })
      continue
    }

    let cardId = sampleAlias(cardTable, rand)

    // Duplicate protection: re-sample if card already seen in this pack
    if (packCardsSeen) {
      if (packCardsSeen.has(cardId)) {
        const maxRetries = cardTable.ids.length * 2
        for (let retry = 0; retry < maxRetries; retry++) {
          cardId = sampleAlias(cardTable, rand)
          if (!packCardsSeen.has(cardId)) break
        }
      }
      packCardsSeen.add(cardId)
    }

    draws.push({ rarityId, cardId })
  }

  // Update pity counters after the full pack
  if (ctx.pity && pityFiredThisPack) {
    for (let pi = 0; pi < ctx.pity.configs.length; pi++) {
      if (pityFiredThisPack.has(ctx.pity.configs[pi].rarityId)) {
        ctx.pity.counts[pi] = 0
      } else {
        ctx.pity.counts[pi]++
      }
    }
  }

  return draws
}
