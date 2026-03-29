import { useState, useMemo, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useStore } from '../../store'
import type { CCGSet, Slot, SlotRarityWeight } from '../../types'
import { EditIcon, DeleteIcon, CollapseIcon, DoneIcon } from '../shared/Icons'
import { Plus, GripVertical } from 'lucide-react'
import { RequiredNumberInput } from '../shared/RequiredNumberInput'

interface Props {
  set: CCGSet
}

interface SlotGroup {
  slots: Slot[]
  startPos: number
  endPos: number
}

function slotsAreIdentical(a: Slot, b: Slot): boolean {
  if (a.pool.length !== b.pool.length) return false
  const aPool = [...a.pool].sort((x, y) => x.rarityId.localeCompare(y.rarityId))
  const bPool = [...b.pool].sort((x, y) => x.rarityId.localeCompare(y.rarityId))
  return aPool.every((w, i) => w.rarityId === bPool[i].rarityId && w.weight === bPool[i].weight)
}

function groupConsecutiveSlots(slots: Slot[]): SlotGroup[] {
  if (slots.length === 0) return []
  const sorted = [...slots].sort((a, b) => a.position - b.position)
  const groups: SlotGroup[] = []
  let current: SlotGroup = { slots: [sorted[0]], startPos: sorted[0].position, endPos: sorted[0].position }

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].position === current.endPos + 1 && slotsAreIdentical(sorted[i], current.slots[0])) {
      current.slots.push(sorted[i])
      current.endPos = sorted[i].position
    } else {
      groups.push(current)
      current = { slots: [sorted[i]], startPos: sorted[i].position, endPos: sorted[i].position }
    }
  }
  groups.push(current)
  return groups
}

export function SlotEditor({ set }: Props) {
  const { addSlot, updateSlot, deleteSlot, updateSet } = useStore()
  const [openSlotId, setOpenSlotId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [pendingWeights, setPendingWeights] = useState<SlotRarityWeight[] | null>(null)

  const groups = useMemo(() => groupConsecutiveSlots(set.slots), [set.slots])

  function handleAddSlot() {
    const position = set.slots.length + 1
    const pool: SlotRarityWeight[] = set.rarities.length > 0
      ? [{ rarityId: set.rarities[0].id, weight: 100 }]
      : []
    addSlot(set.id, {
      id: uuidv4(),
      position,
      label: '',
      isFoil: false,
      pool,
    })
  }

  function handleAutoGenerate() {
    if (set.slots.length > 0) return
    for (let i = 1; i <= set.packSize; i++) {
      const pool: SlotRarityWeight[] = set.rarities.length > 0
        ? [{ rarityId: set.rarities[0].id, weight: 100 }]
        : []
      addSlot(set.id, { id: uuidv4(), position: i, label: '', isFoil: false, pool })
    }
  }

  function openEditor(slotId: string, pool: SlotRarityWeight[]) {
    if (openSlotId && pendingWeights) {
      // discard unsaved
    }
    setOpenSlotId(slotId)
    setPendingWeights([...pool])
  }

  function saveSlotWeights(slotId: string) {
    if (!pendingWeights) return
    updateSlot(set.id, slotId, { pool: pendingWeights })
    setOpenSlotId(null)
    setPendingWeights(null)
  }

  function cancelEdit() {
    setOpenSlotId(null)
    setPendingWeights(null)
  }

  function toggleGroupExpand(groupKey: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) next.delete(groupKey)
      else next.add(groupKey)
      return next
    })
  }

  const dividers = set.slotDividers ?? []

  // Divider drag state
  const [draggingDividerPos, setDraggingDividerPos] = useState<number | null>(null)
  const [dividerDropTarget, setDividerDropTarget] = useState<number | null>(null)

  function addDivider() {
    // Find the first valid gap (group start > 1 without an existing divider)
    const usedPositions = new Set(dividers.map((d) => d.beforePosition))
    const validPosition = groups.find((g) => g.startPos > 1 && !usedPositions.has(g.startPos))?.startPos
    if (!validPosition) return
    const label = prompt('Section label:')
    if (!label) return
    const updated = [...dividers, { beforePosition: validPosition, label }]
    updateSet(set.id, { slotDividers: updated })
  }

  function removeDivider(beforePosition: number) {
    const updated = dividers.filter((d) => d.beforePosition !== beforePosition)
    updateSet(set.id, { slotDividers: updated })
  }

  function renameDivider(beforePosition: number) {
    const existing = dividers.find((d) => d.beforePosition === beforePosition)
    if (!existing) return
    const label = prompt('Section label:', existing.label)
    if (!label) return
    const updated = dividers.map((d) => d.beforePosition === beforePosition ? { ...d, label } : d)
    updateSet(set.id, { slotDividers: updated })
  }

  function handleDividerDragStart(e: React.DragEvent, beforePosition: number) {
    setDraggingDividerPos(beforePosition)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `divider-${beforePosition}`)
  }

  function handleDividerDragEnd() {
    if (draggingDividerPos !== null && dividerDropTarget !== null && draggingDividerPos !== dividerDropTarget) {
      const updated = dividers.map((d) =>
        d.beforePosition === draggingDividerPos ? { ...d, beforePosition: dividerDropTarget } : d
      )
      updateSet(set.id, { slotDividers: updated })
    }
    setDraggingDividerPos(null)
    setDividerDropTarget(null)
  }

  const handleDividerDragOver = useCallback((e: React.DragEvent, targetPos: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDividerDropTarget(targetPos)
  }, [])

  const dividerMap = new Map(dividers.map((d) => [d.beforePosition, d]))
  const hasAvailableGap = groups.some((g) => g.startPos > 1 && !dividerMap.has(g.startPos))

  const weightSum = pendingWeights?.reduce((s, w) => s + w.weight, 0) ?? 0

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="w-24" />
        <h3 className="text-lg font-semibold text-center">Slots ({set.slots.length} / {set.packSize})</h3>
        <div className="flex gap-2 justify-end">
          {set.slots.length === 0 && set.packSize > 0 && (
            <button
              onClick={handleAutoGenerate}
              className="px-3 py-1.5 text-sm bg-bg-tertiary text-text-secondary font-medium rounded hover:text-text-primary transition-colors border border-border"
            >
              Auto-generate {set.packSize} slots
            </button>
          )}
          {hasAvailableGap && (
            <button
              onClick={addDivider}
              className="px-3 py-1.5 text-sm bg-bg-tertiary text-text-secondary font-medium rounded hover:text-text-primary transition-colors border border-border flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus size={14} /> Divider
            </button>
          )}
          <button
            onClick={handleAddSlot}
            className="px-3 py-1.5 text-sm bg-accent-gold text-bg-primary font-medium rounded hover:opacity-90 transition-opacity flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={14} /> Slot
          </button>
        </div>
      </div>

      {set.rarities.length === 0 && (
        <p className="text-text-secondary text-sm mb-4">Define rarities first before configuring slots.</p>
      )}

      <div className="space-y-2">
        {groups.map((group) => {
          const groupKey = `${group.startPos}-${group.endPos}`
          const isExpanded = expandedGroups.has(groupKey)
          const isGrouped = group.slots.length > 1
          const divider = dividerMap.get(group.startPos)

          const dividerEl = divider && (
            <div
              key={`divider-${group.startPos}`}
              draggable
              onDragStart={(e) => handleDividerDragStart(e, group.startPos)}
              onDragEnd={handleDividerDragEnd}
              className={`flex items-center gap-2 py-1 cursor-grab active:cursor-grabbing ${draggingDividerPos === group.startPos ? 'opacity-40' : ''}`}
            >
              <GripVertical size={12} className="text-text-secondary/40 shrink-0" />
              <div className="flex-1 border-t border-accent-gold/40" />
              <span
                className="text-xs text-accent-gold font-medium px-2 cursor-pointer hover:underline"
                onClick={() => renameDivider(group.startPos)}
                title="Click to rename"
              >
                {divider.label}
              </span>
              <div className="flex-1 border-t border-accent-gold/40" />
              <button
                onClick={() => removeDivider(group.startPos)}
                className="text-xs text-text-secondary hover:text-danger"
                title="Remove divider"
              >
                <DeleteIcon />
              </button>
            </div>
          )

          // Drop zone for divider dragging — shown between groups when dragging
          const dropZoneEl = !divider && group.startPos > 1 && draggingDividerPos !== null && (
            <div
              key={`dropzone-${group.startPos}`}
              onDragOver={(e) => handleDividerDragOver(e, group.startPos)}
              onDragLeave={() => setDividerDropTarget(null)}
              onDrop={(e) => { e.preventDefault(); handleDividerDragEnd() }}
              className={`h-4 rounded transition-colors ${dividerDropTarget === group.startPos ? 'bg-accent-gold/20 border border-dashed border-accent-gold/40' : ''}`}
            />
          )

          if (isGrouped && !isExpanded) {
            return [dropZoneEl, dividerEl, (
              <div key={groupKey} className="border border-border rounded-lg p-3 bg-bg-tertiary/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-text-primary text-sm font-medium">#{group.startPos}–{group.endPos}</span>
                  <button
                    onClick={() => toggleGroupExpand(groupKey)}
                    className="text-xs text-text-secondary hover:text-accent-gold shrink-0"
                  >
                    Expand ({group.slots.length} slots)
                  </button>
                </div>
                <RarityPills pool={group.slots[0].pool} rarities={set.rarities} />
                <ProportionalBar pool={group.slots[0].pool} rarities={set.rarities} />
              </div>
            )]
          }

          const slotCards = group.slots.map((slot) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              set={set}
              isOpen={openSlotId === slot.id}
              pendingWeights={openSlotId === slot.id ? pendingWeights : null}
              weightSum={openSlotId === slot.id ? weightSum : 0}
              onOpen={() => openEditor(slot.id, slot.pool)}
              onSave={() => saveSlotWeights(slot.id)}
              onCancel={cancelEdit}
              onUpdatePendingWeight={(rarityId, weight) => {
                if (!pendingWeights) return
                const existing = pendingWeights.find((w) => w.rarityId === rarityId)
                if (existing) {
                  setPendingWeights(pendingWeights.map((w) => w.rarityId === rarityId ? { ...w, weight } : w))
                } else {
                  setPendingWeights([...pendingWeights, { rarityId, weight }])
                }
              }}
              onDelete={() => deleteSlot(set.id, slot.id)}
              onUpdateLabel={(label) => updateSlot(set.id, slot.id, { label })}
            />
          ))

          if (isGrouped) {
            return [dropZoneEl, dividerEl, (
              <div key={groupKey} className="border border-border rounded-lg p-3 bg-bg-tertiary/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary text-sm font-medium">
                    Slots #{group.startPos}–{group.endPos}
                  </span>
                  <button
                    onClick={() => toggleGroupExpand(groupKey)}
                    className="text-xs text-text-secondary hover:text-accent-gold"
                  >
                    <CollapseIcon /> Collapse ({group.slots.length} slots)
                  </button>
                </div>
                <div className="space-y-2 ml-4">
                  {slotCards}
                </div>
              </div>
            )]
          }

          return [dropZoneEl, dividerEl, ...slotCards]
        })}
      </div>
    </div>
  )
}

function RarityPills({ pool, rarities }: { pool: SlotRarityWeight[]; rarities: CCGSet['rarities'] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {pool
        .filter((w) => w.weight > 0)
        .map((w) => {
          const rarity = rarities.find((r) => r.id === w.rarityId)
          if (!rarity) return null
          return (
            <span
              key={w.rarityId}
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: rarity.color + '22', color: rarity.color, border: `1px solid ${rarity.color}44` }}
            >
              {rarity.shortCode} {Math.round(w.weight)}%
            </span>
          )
        })}
    </div>
  )
}

function ProportionalBar({ pool, rarities }: { pool: SlotRarityWeight[]; rarities: CCGSet['rarities'] }) {
  const nonZero = pool.filter((w) => w.weight > 0)
  if (nonZero.length === 0) return null
  return (
    <div className="flex h-2 rounded-full overflow-hidden mt-2">
      {nonZero.map((w) => {
        const rarity = rarities.find((r) => r.id === w.rarityId)
        return (
          <div
            key={w.rarityId}
            className="h-full"
            style={{ width: `${w.weight}%`, backgroundColor: rarity?.color ?? '#666' }}
          />
        )
      })}
    </div>
  )
}

interface SlotCardProps {
  slot: Slot
  set: CCGSet
  isOpen: boolean
  pendingWeights: SlotRarityWeight[] | null
  weightSum: number
  onOpen: () => void
  onSave: () => void
  onCancel: () => void
  onUpdatePendingWeight: (rarityId: string, weight: number) => void
  onDelete: () => void
  onUpdateLabel: (label: string) => void
}

function SlotCard({
  slot, set, isOpen, pendingWeights, weightSum,
  onOpen, onSave, onCancel, onUpdatePendingWeight, onDelete, onUpdateLabel,
}: SlotCardProps) {
  return (
    <div className={`border rounded-lg transition-colors ${isOpen ? 'border-accent-gold bg-bg-tertiary/50' : 'border-border bg-bg-tertiary/30'}`}>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-text-primary text-sm font-medium">#{slot.position}</span>
            <input
              type="text"
              value={slot.label}
              onChange={(e) => onUpdateLabel(e.target.value)}
              placeholder="Label"
              className="bg-transparent text-text-primary text-sm border-none outline-none placeholder:text-text-secondary/50 w-24 md:w-40"
            />
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={onOpen} className="px-2 py-1 text-base text-text-secondary hover:text-accent-gold">
              {isOpen ? <DoneIcon /> : <EditIcon />}
            </button>
            <button onClick={onDelete} className="px-2 py-1 text-base text-text-secondary hover:text-danger">
              <DeleteIcon />
            </button>
          </div>
        </div>
        <RarityPills pool={slot.pool} rarities={set.rarities} />
      </div>

      {!isOpen && <ProportionalBar pool={slot.pool} rarities={set.rarities} />}

      {isOpen && pendingWeights && (
        <div className="border-t border-border p-4">
          <div className="space-y-2">
            {set.rarities.map((rarity) => {
              const pw = pendingWeights.find((w) => w.rarityId === rarity.id)
              const weight = pw?.weight ?? 0
              return (
                <div key={rarity.id} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: rarity.color }} />
                  <span className="text-sm w-32 truncate" style={{ color: rarity.color }}>{rarity.name}</span>
                  <RequiredNumberInput
                    min={0}
                    max={100}
                    step={0.1}
                    value={weight}
                    onChange={(v) => onUpdatePendingWeight(rarity.id, v)}
                    className="bg-bg-primary text-text-primary px-2 py-1 rounded border border-border w-24 text-sm"
                  />
                  <span className="text-text-secondary text-sm">%</span>
                  <div className="flex-1 h-2 rounded-full bg-bg-primary overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${weight}%`, backgroundColor: rarity.color }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
            <span className={`text-sm font-medium ${Math.abs(weightSum - 100) < 0.01 ? 'text-success' : 'text-danger'}`}>
              {Math.abs(weightSum - 100) < 0.01
                ? 'Weights sum to 100%'
                : `Weights sum to ${weightSum.toFixed(1)}% (must be 100%)`}
            </span>
            <div className="flex gap-2">
              <button onClick={onCancel} className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary border border-border rounded">
                Cancel
              </button>
              <button
                onClick={onSave}
                disabled={Math.abs(weightSum - 100) >= 0.01}
                className="px-3 py-1.5 text-sm bg-accent-gold text-bg-primary font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Slot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
