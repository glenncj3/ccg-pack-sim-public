import type { Card, Rarity } from '../types'

/**
 * Build a map from rarityId to an array of card IDs of that rarity.
 */
export function buildRarityCardMap(cards: Card[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const card of cards) {
    const list = map.get(card.rarityId) ?? []
    list.push(card.id)
    map.set(card.rarityId, list)
  }
  return map
}

/**
 * Generate anonymous cards from rarity.cardCount when set.cards is empty.
 * Enables duplicate protection and card-level tracking without a CSV upload.
 */
export function synthesizeCards(rarities: Rarity[]): Card[] {
  const cards: Card[] = []
  for (const rarity of rarities) {
    for (let i = 1; i <= rarity.cardCount; i++) {
      cards.push({
        id: `synth_${rarity.id}_${i}`,
        name: `${rarity.name} #${i}`,
        rarityId: rarity.id,
        factionId: null,
        setNumber: null,
        isFoilVariant: false,
        notes: null,
        relativeWeight: 1,
      })
    }
  }
  return cards
}

/**
 * Returns set.cards if populated, otherwise synthesizes cards from rarities.
 */
export function resolveCards(cards: Card[], rarities: Rarity[]): Card[] {
  return cards.length > 0 ? cards : synthesizeCards(rarities)
}

