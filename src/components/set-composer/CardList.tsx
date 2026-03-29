import { useState } from 'react'
import { useStore } from '../../store'
import type { CCGSet } from '../../types'

interface Props {
  set: CCGSet
}

export function CardList({ set }: Props) {
  const { setCards } = useStore()
  const [filter, setFilter] = useState('')

  if (set.cards.length === 0) return null

  const rarityMap = new Map(set.rarities.map((r) => [r.id, r]))

  const filtered = filter
    ? set.cards.filter((c) =>
        c.name.toLowerCase().includes(filter.toLowerCase()) ||
        (rarityMap.get(c.rarityId)?.name ?? '').toLowerCase().includes(filter.toLowerCase())
      )
    : set.cards

  function updateRelativeWeight(cardId: string, weight: number) {
    const updated = set.cards.map((c) =>
      c.id === cardId ? { ...c, relativeWeight: weight } : c
    )
    setCards(set.id, updated)
  }

  const hasNonDefaultWeights = set.cards.some((c) => (c.relativeWeight ?? 1) !== 1)

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-center flex-1">
          Card List
          {hasNonDefaultWeights && (
            <span className="ml-2 text-xs text-accent-gold font-normal">
              (custom weights active)
            </span>
          )}
        </h3>
        <input
          type="text"
          placeholder="Filter cards..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-bg-tertiary text-text-primary text-sm px-2 py-1 rounded border border-border w-32 md:w-48"
        />
      </div>

      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-bg-secondary">
            <tr className="text-text-secondary text-left border-b border-border">
              <th className="pb-2 pr-2">Name</th>
              <th className="pb-2 pr-2 w-28 text-center">Rarity</th>
              <th className="pb-2 pr-2 w-24">Rel. Weight</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((card) => {
              const rarity = rarityMap.get(card.rarityId)
              return (
                <tr key={card.id} className="border-b border-border/30 hover:bg-bg-tertiary/50">
                  <td className="py-1.5 pr-2 text-text-primary">{card.name}</td>
                  <td className="py-1.5 pr-2 text-center" style={{ color: rarity?.color }}>
                    {rarity?.shortCode ?? '?'}
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      min={0.001}
                      step={0.1}
                      value={card.relativeWeight ?? 1}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val) && val > 0) updateRelativeWeight(card.id, val)
                      }}
                      className="bg-bg-tertiary text-text-primary px-2 py-0.5 rounded border border-border w-20 text-right"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {filtered.length < set.cards.length && (
        <p className="text-xs text-text-secondary mt-2">
          Showing {filtered.length} of {set.cards.length} cards
        </p>
      )}
    </div>
  )
}
