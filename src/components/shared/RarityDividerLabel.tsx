import type { SlotDivider } from '../../types'

interface Props {
  label: string
}

export function RarityDividerLabel({ label }: Props) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 border-t border-accent-gold/40" />
      <span className="text-xs text-accent-gold font-medium px-2">{label}</span>
      <div className="flex-1 border-t border-accent-gold/40" />
    </div>
  )
}

/** Build a Map from 1-indexed rarity position to divider */
export function buildDividerMap(dividers: SlotDivider[]): Map<number, SlotDivider> {
  return new Map(dividers.map((d) => [d.beforePosition, d]))
}

/** Get the 1-indexed position of a rarity by its ID in the rarities array */
export function getRarityPosition(rarityId: string, rarities: { id: string }[]): number {
  return rarities.findIndex((r) => r.id === rarityId) + 1
}
