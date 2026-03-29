import React, { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useStore } from '../../store'
import type { CCGSet, Rarity, Faction } from '../../types'
import { DEFAULT_RARITY_COLORS } from '../../types'
import { RequiredNumberInput } from '../shared/RequiredNumberInput'
import { EditIcon, DoneIcon, DeleteIcon } from '../shared/Icons'
import { ChevronUp, ChevronDown, Plus, GripVertical } from 'lucide-react'

interface Props {
  set: CCGSet
}

export function RarityEditor({ set }: Props) {
  const { addRarity, updateRarity, deleteRarity, reorderRarities, updateSet } = useStore()
  const [editingId, setEditingId] = useState<string | null>(null)

  // ── Divider state ──────────────────────────────────────────
  const dividers = set.rarityDividers ?? []
  const [draggingDividerPos, setDraggingDividerPos] = useState<number | null>(null)
  const [dividerDropTarget, setDividerDropTarget] = useState<number | null>(null)

  const dividerMap = new Map(dividers.map((d) => [d.beforePosition, d]))
  // Valid positions: before any rarity at 1-indexed positions 1..N
  const hasAvailableGap = set.rarities.length > 0 &&
    set.rarities.some((_, i) => !dividerMap.has(i + 1))

  function addDivider() {
    const usedPositions = new Set(dividers.map((d) => d.beforePosition))
    // Find first gap: positions 1..N (1-indexed)
    let validPos: number | null = null
    for (let i = 1; i <= set.rarities.length; i++) {
      if (!usedPositions.has(i)) { validPos = i; break }
    }
    if (!validPos) return
    const label = prompt('Section label:')
    if (!label) return
    updateSet(set.id, { rarityDividers: [...dividers, { beforePosition: validPos, label }] })
  }

  function removeDivider(beforePosition: number) {
    updateSet(set.id, { rarityDividers: dividers.filter((d) => d.beforePosition !== beforePosition) })
  }

  function renameDivider(beforePosition: number) {
    const existing = dividers.find((d) => d.beforePosition === beforePosition)
    if (!existing) return
    const label = prompt('Section label:', existing.label)
    if (!label) return
    updateSet(set.id, { rarityDividers: dividers.map((d) => d.beforePosition === beforePosition ? { ...d, label } : d) })
  }

  function handleDividerDragStart(e: React.DragEvent, beforePosition: number) {
    setDraggingDividerPos(beforePosition)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `divider-${beforePosition}`)
  }

  function handleDividerDragEnd() {
    if (draggingDividerPos !== null && dividerDropTarget !== null && draggingDividerPos !== dividerDropTarget) {
      updateSet(set.id, {
        rarityDividers: dividers.map((d) =>
          d.beforePosition === draggingDividerPos ? { ...d, beforePosition: dividerDropTarget } : d
        ),
      })
    }
    setDraggingDividerPos(null)
    setDividerDropTarget(null)
  }

  const handleDividerDragOver = useCallback((e: React.DragEvent, targetPos: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDividerDropTarget(targetPos)
  }, [])

  function handleAdd() {
    const idx = set.rarities.length
    const defaultNames = ['Common', 'Uncommon', 'Rare', 'Mythic Rare', 'Special', 'Foil']
    const name = defaultNames[idx] ?? `Rarity ${idx + 1}`
    const shortCode = name.split(' ').map((w) => w[0]).join('').slice(0, 4)
    const color = DEFAULT_RARITY_COLORS[name] ?? '#94a3b8'

    addRarity(set.id, {
      id: uuidv4(),
      name,
      shortCode,
      color,
      cardCount: 0,
      factionId: null,
    })
  }

  function handleMoveUp(index: number) {
    if (index === 0) return
    const reordered = [...set.rarities]
    ;[reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]]
    reorderRarities(set.id, reordered)
  }

  function handleMoveDown(index: number) {
    if (index === set.rarities.length - 1) return
    const reordered = [...set.rarities]
    ;[reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]]
    reorderRarities(set.id, reordered)
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="w-24" />
        <h3 className="text-lg font-semibold text-center">Rarities</h3>
        <div className="flex gap-2 justify-end">
          {hasAvailableGap && (
            <button
              onClick={addDivider}
              className="px-3 py-1.5 text-sm bg-bg-tertiary text-text-secondary font-medium rounded hover:text-text-primary transition-colors border border-border flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus size={14} /> Divider
            </button>
          )}
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 text-sm bg-accent-gold text-bg-primary font-medium rounded hover:opacity-90 transition-opacity flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={14} /> Rarity
          </button>
        </div>
      </div>

      {set.rarities.length === 0 ? (
        <p className="text-text-secondary text-sm">No rarities defined. Add one to get started.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-text-secondary text-center border-b border-border">
                <th className="pb-2 pr-2 w-8"></th>
                <th className="pb-2 pr-2 w-10">Color</th>
                <th className="pb-2 pr-2 w-48 text-left">Name</th>
                <th className="pb-2 pr-2 w-20">Code</th>
                <th className="pb-2 pr-2 w-24">Cards</th>
                <th className="pb-2 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {set.rarities.map((rarity, index) => {
                const pos = index + 1 // 1-indexed position
                const divider = dividerMap.get(pos)
                const showDropZone = !divider && draggingDividerPos !== null

                return (
                  <React.Fragment key={rarity.id}>
                    {divider && (
                      <tr>
                        <td colSpan={6} className="py-1">
                          <div
                            draggable
                            onDragStart={(e) => handleDividerDragStart(e, pos)}
                            onDragEnd={handleDividerDragEnd}
                            className={`flex items-center gap-2 cursor-grab active:cursor-grabbing ${draggingDividerPos === pos ? 'opacity-40' : ''}`}
                          >
                            <GripVertical size={12} className="text-text-secondary/40 shrink-0" />
                            <div className="flex-1 border-t border-accent-gold/40" />
                            <span
                              className="text-xs text-accent-gold font-medium px-2 cursor-pointer hover:underline"
                              onClick={() => renameDivider(pos)}
                              title="Click to rename"
                            >
                              {divider.label}
                            </span>
                            <div className="flex-1 border-t border-accent-gold/40" />
                            <button
                              onClick={() => removeDivider(pos)}
                              className="text-xs text-text-secondary hover:text-danger"
                              title="Remove divider"
                            >
                              <DeleteIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {showDropZone && (
                      <tr>
                        <td colSpan={6} className="py-0">
                          <div
                            onDragOver={(e) => handleDividerDragOver(e, pos)}
                            onDragLeave={() => setDividerDropTarget(null)}
                            onDrop={(e) => { e.preventDefault(); handleDividerDragEnd() }}
                            className={`h-4 rounded transition-colors ${dividerDropTarget === pos ? 'bg-accent-gold/20 border border-dashed border-accent-gold/40' : ''}`}
                          />
                        </td>
                      </tr>
                    )}
                    <RarityRow
                      rarity={rarity}
                      setId={set.id}
                      index={index}
                      total={set.rarities.length}
                      factions={set.factions}
                      isEditing={editingId === rarity.id}
                      onEdit={() => setEditingId(editingId === rarity.id ? null : rarity.id)}
                      onMoveUp={() => handleMoveUp(index)}
                      onMoveDown={() => handleMoveDown(index)}
                      onUpdate={(updates) => updateRarity(set.id, rarity.id, updates)}
                      onDelete={() => deleteRarity(set.id, rarity.id)}
                    />
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

interface RarityRowProps {
  rarity: Rarity
  setId: string
  index: number
  total: number
  factions: Faction[]
  isEditing: boolean
  onEdit: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onUpdate: (updates: Partial<Rarity>) => void
  onDelete: () => void
}

function RarityRow({ rarity, index, total, factions, isEditing, onEdit, onMoveUp, onMoveDown, onUpdate, onDelete }: RarityRowProps) {
  return (
    <>
    <tr className="border-b border-border/50 hover:bg-bg-tertiary/50">
      <td className="py-2 pr-2">
        <div className="flex flex-col gap-0.5">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="text-text-secondary hover:text-text-primary disabled:opacity-30 text-xs"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="text-text-secondary hover:text-text-primary disabled:opacity-30 text-xs"
          >
            <ChevronDown size={12} />
          </button>
        </div>
      </td>
      <td className="py-2 pr-2 text-center">
        <input
          type="color"
          value={rarity.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="w-8 h-8 rounded cursor-pointer border border-border bg-transparent"
        />
      </td>
      <td className="py-2 pr-2">
        {isEditing ? (
          <input
            type="text"
            value={rarity.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="bg-bg-tertiary text-text-primary px-2 py-1 rounded border border-border w-full"
            autoFocus
          />
        ) : (
          <span
            className="cursor-pointer hover:text-accent-gold"
            style={{ color: rarity.color }}
            onClick={onEdit}
          >
            {rarity.name}
          </span>
        )}
      </td>
      <td className="py-2 pr-2 text-center">
        {isEditing ? (
          <input
            type="text"
            value={rarity.shortCode}
            onChange={(e) => onUpdate({ shortCode: e.target.value.slice(0, 4) })}
            maxLength={4}
            className="bg-bg-tertiary text-text-primary px-2 py-1 rounded border border-border w-full text-center"
          />
        ) : (
          <span className="text-text-secondary">{rarity.shortCode}</span>
        )}
      </td>
      <td className="py-2 pr-2 text-center">
        <RequiredNumberInput
          min={0}
          value={rarity.cardCount}
          onChange={(v) => onUpdate({ cardCount: v })}
          className="bg-bg-tertiary text-text-primary px-2 py-1 rounded border border-border w-20"
        />
      </td>
      <td className="py-2 text-center">
        <div className="flex gap-2 justify-center">
          <button
            onClick={onEdit}
            className="px-2 py-1 text-base text-text-secondary hover:text-accent-gold transition-colors"
          >
            {isEditing ? <DoneIcon /> : <EditIcon />}
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 text-base text-text-secondary hover:text-danger transition-colors"
          >
            <DeleteIcon />
          </button>
        </div>
      </td>
    </tr>
    {isEditing && factions.length > 0 && (
      <tr className="border-b border-border/50 bg-bg-tertiary/30">
        <td colSpan={6} className="py-2 px-4">
          <div className="flex gap-4 text-xs">
            <label className="flex items-center gap-2 text-text-secondary">
              Faction:
              <select
                value={rarity.factionId ?? ''}
                onChange={(e) => onUpdate({ factionId: e.target.value || null })}
                className="bg-bg-tertiary text-text-primary px-2 py-1 rounded border border-border"
              >
                <option value="">None</option>
                {factions.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </label>
          </div>
        </td>
      </tr>
    )}
    </>
  )
}
