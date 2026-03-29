import { useStore } from '../../store'
import type { CCGSet } from '../../types'
import { RequiredNumberInput } from '../shared/RequiredNumberInput'
import { DeleteIcon } from '../shared/Icons'

interface Props {
  set: CCGSet
}

export function SetMetadata({ set }: Props) {
  const updateSet = useStore((s) => s.updateSet)

  function addPityTimer() {
    const usedRarities = new Set(set.pityTimers.map((pt) => pt.rarityId))
    const nextRarity = set.rarities.find((r) => !usedRarities.has(r.id))
    if (!nextRarity) return
    updateSet(set.id, {
      pityTimers: [...set.pityTimers, { rarityId: nextRarity.id, afterNPacks: 10 }],
    })
  }

  function updatePityTimer(index: number, updates: Partial<{ rarityId: string; afterNPacks: number }>) {
    const updated = set.pityTimers.map((pt, i) => (i === index ? { ...pt, ...updates } : pt))
    updateSet(set.id, { pityTimers: updated })
  }

  function removePityTimer(index: number) {
    updateSet(set.id, { pityTimers: set.pityTimers.filter((_, i) => i !== index) })
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Set Name</label>
          <input
            type="text"
            value={set.name}
            onChange={(e) => updateSet(set.id, { name: e.target.value })}
            className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded border border-border"
            placeholder="e.g., Foundations"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Game</label>
          <input
            type="text"
            value={set.game}
            onChange={(e) => updateSet(set.id, { game: e.target.value })}
            className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded border border-border"
            placeholder="e.g., Magic: The Gathering"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Pack Size</label>
          <RequiredNumberInput
            min={1}
            value={set.packSize}
            onChange={(v) => updateSet(set.id, { packSize: v })}
            className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded border border-border"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Packs Per Box</label>
          <input
            type="number"
            min={0}
            value={set.packsPerBox ?? ''}
            onChange={(e) => {
              const val = parseInt(e.target.value)
              updateSet(set.id, { packsPerBox: isNaN(val) || val === 0 ? null : val })
            }}
            className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded border border-border"
            placeholder="N/A"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Pack Price ($)</label>
          <RequiredNumberInput
            min={0}
            step={0.01}
            value={set.packPrice}
            onChange={(v) => updateSet(set.id, { packPrice: v })}
            className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded border border-border"
          />
        </div>
        <div className="flex items-center justify-center pt-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={set.noPackDuplicates}
              onChange={(e) => updateSet(set.id, { noPackDuplicates: e.target.checked })}
              className="accent-accent-gold"
            />
            <span className="text-sm font-medium">No duplicates</span>
          </label>
        </div>
      </div>

      {/* Pity Timers */}
      <div className="mt-4 space-y-2">
        {set.pityTimers.map((pt, i) => (
          <div key={i} className="flex items-center gap-2 flex-wrap">
            <span className="text-text-secondary text-sm">Guarantee</span>
            <select
              value={pt.rarityId}
              onChange={(e) => updatePityTimer(i, { rarityId: e.target.value })}
              className="bg-bg-tertiary text-text-primary px-2 py-1 rounded border border-border text-sm"
            >
              {set.rarities.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <span className="text-text-secondary text-sm">after</span>
            <RequiredNumberInput
              min={1}
              value={pt.afterNPacks}
              onChange={(v) => updatePityTimer(i, { afterNPacks: v })}
              className="bg-bg-tertiary text-text-primary px-2 py-1 rounded border border-border w-16 text-sm"
            />
            <span className="text-text-secondary text-sm">packs</span>
            <button
              onClick={() => removePityTimer(i)}
              className="text-text-secondary hover:text-danger text-sm ml-1"
            >
              <DeleteIcon />
            </button>
          </div>
        ))}
        {set.rarities.length > set.pityTimers.length && (
          <button
            onClick={addPityTimer}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            + Add pity timer
          </button>
        )}
      </div>
    </div>
  )
}
