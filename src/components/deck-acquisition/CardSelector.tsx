import { useState, useMemo } from 'react'
import type { CCGSet, DeckTarget } from '../../types'
import { RequiredNumberInput } from '../shared/RequiredNumberInput'
import { DeleteIcon } from '../shared/Icons'

interface CardGroup {
  name: string
  variantCount: number
  firstRarityId: string
}

interface Props {
  set: CCGSet
  targets: DeckTarget[]
  onChange: (targets: DeckTarget[]) => void
}

export function CardSelector({ set, targets, onChange }: Props) {
  const [search, setSearch] = useState('')

  // Deduplicate cards by name, tracking variant count and first rarity for display
  const cardGroups = useMemo(() => {
    const groupMap = new Map<string, { count: number; firstRarityId: string }>()
    for (const card of set.cards) {
      const existing = groupMap.get(card.name)
      if (existing) {
        existing.count++
      } else {
        groupMap.set(card.name, { count: 1, firstRarityId: card.rarityId })
      }
    }
    const groups: CardGroup[] = []
    for (const [name, { count, firstRarityId }] of groupMap) {
      groups.push({ name, variantCount: count, firstRarityId })
    }
    groups.sort((a, b) => a.name.localeCompare(b.name))
    return groups
  }, [set.cards])

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return cardGroups
    const q = search.toLowerCase()
    return cardGroups.filter((g) => g.name.toLowerCase().includes(q))
  }, [cardGroups, search])

  const targetMap = useMemo(
    () => new Map(targets.map((t) => [t.cardName, t.copies])),
    [targets]
  )

  function toggleCard(cardName: string) {
    if (targetMap.has(cardName)) {
      onChange(targets.filter((t) => t.cardName !== cardName))
    } else {
      onChange([...targets, { cardName, copies: 1 }])
    }
  }

  function setCopies(cardName: string, copies: number) {
    onChange(
      targets.map((t) => (t.cardName === cardName ? { ...t, copies: Math.max(1, copies) } : t))
    )
  }

  if (set.cards.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-lg border border-border p-4">
        <h3 className="text-lg font-semibold mb-2 text-center">Card Selector</h3>
        <p className="text-text-secondary text-sm">
          Upload a CSV with named cards in the Set Composer to use the Deck Collector simulator.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <h3 className="text-lg font-semibold mb-4 text-center">Target Deck ({targets.length} cards selected)</h3>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search cards..."
        className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded border border-border mb-3"
      />

      {targets.length > 0 && (
        <div className="mb-4 p-3 bg-bg-tertiary rounded border border-border">
          <h4 className="text-sm font-medium text-text-secondary mb-2">Selected Cards</h4>
          <div className="space-y-1">
            {targets.map((t) => {
              const group = cardGroups.find((g) => g.name === t.cardName)
              const rarity = set.rarities.find((r) => r.id === group?.firstRarityId)
              return (
                <div key={t.cardName} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCard(t.cardName)}
                    className="text-xs text-danger hover:text-danger/80"
                  >
                    <DeleteIcon />
                  </button>
                  <RequiredNumberInput
                    min={1}
                    max={99}
                    value={t.copies}
                    onChange={(v) => setCopies(t.cardName, v)}
                    className="bg-bg-primary text-text-primary px-2 py-0.5 rounded border border-border w-14 text-sm text-center"
                  />
                  <span className="text-sm" style={{ color: rarity?.color }}>
                    {t.cardName}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-0.5">
        {filteredGroups.map((group) => {
          const rarity = set.rarities.find((r) => r.id === group.firstRarityId)
          const isSelected = targetMap.has(group.name)
          return (
            <div
              key={group.name}
              onClick={() => toggleCard(group.name)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-accent-gold-muted border border-accent-gold/30'
                  : 'hover:bg-bg-tertiary'
              }`}
            >
              <div className="w-3 h-3 rounded" style={{ backgroundColor: rarity?.color ?? '#666' }} />
              <span className="text-sm flex-1">{group.name}</span>
              {group.variantCount > 1 && (
                <span className="text-xs text-text-secondary">&times;{group.variantCount}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
