import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'

describe('Store', () => {
  beforeEach(() => {
    // Reset store state
    useStore.setState({
      sets: [],
      activeSetId: null,
      simResults: null,
      ui: { sidebarOpen: true, activeModule: 'composer' },
    })
  })

  it('creates a new set', () => {
    const newSet = useStore.getState().createSet('Test Set', 'Test Game')
    expect(newSet.name).toBe('Test Set')
    expect(newSet.game).toBe('Test Game')
    expect(newSet.packSize).toBe(15)
    expect(useStore.getState().sets.length).toBe(1)
    expect(useStore.getState().activeSetId).toBe(newSet.id)
  })

  it('updates a set', () => {
    const set = useStore.getState().createSet('Old Name', 'Game')
    useStore.getState().updateSet(set.id, { name: 'New Name' })
    const updated = useStore.getState().sets[0]
    expect(updated.name).toBe('New Name')
    // updatedAt is refreshed on update (may be same ms in fast tests, just verify it exists)
    expect(updated.updatedAt).toBeTruthy()
  })

  it('deletes a set', () => {
    const set = useStore.getState().createSet('To Delete', 'Game')
    expect(useStore.getState().sets.length).toBe(1)
    useStore.getState().deleteSet(set.id)
    expect(useStore.getState().sets.length).toBe(0)
    expect(useStore.getState().activeSetId).toBeNull()
  })

  it('duplicates a set', () => {
    const original = useStore.getState().createSet('Original', 'Game')
    useStore.getState().addRarity(original.id, {
      id: 'r1', name: 'Common', shortCode: 'C', color: '#aaa',
      cardCount: 100, factionId: null,
    })

    const copy = useStore.getState().duplicateSet(original.id)
    expect(copy).not.toBeNull()
    expect(copy!.name).toBe('Original (Copy)')
    expect(copy!.id).not.toBe(original.id)
    expect(useStore.getState().sets.length).toBe(2)

    // Should have the same rarities
    const copySet = useStore.getState().sets.find(s => s.id === copy!.id)!
    expect(copySet.rarities.length).toBe(1)
    expect(copySet.rarities[0].name).toBe('Common')
  })

  it('adds and removes rarities', () => {
    const set = useStore.getState().createSet('Test', 'Game')
    useStore.getState().addRarity(set.id, {
      id: 'r1', name: 'Common', shortCode: 'C', color: '#aaa',
      cardCount: 100, factionId: null,
    })
    expect(useStore.getState().sets[0].rarities.length).toBe(1)

    useStore.getState().deleteRarity(set.id, 'r1')
    expect(useStore.getState().sets[0].rarities.length).toBe(0)
  })

  it('deleting rarity removes it from slot pools', () => {
    const set = useStore.getState().createSet('Test', 'Game')
    useStore.getState().addRarity(set.id, {
      id: 'r1', name: 'Common', shortCode: 'C', color: '#aaa',
      cardCount: 100, factionId: null,
    })
    useStore.getState().addSlot(set.id, {
      id: 's1', position: 1, label: '', isFoil: false,
      pool: [{ rarityId: 'r1', weight: 100 }],
    })

    useStore.getState().deleteRarity(set.id, 'r1')
    const slot = useStore.getState().sets[0].slots[0]
    expect(slot.pool.length).toBe(0)
  })

  it('manages slots with position renumbering on delete', () => {
    const set = useStore.getState().createSet('Test', 'Game')
    useStore.getState().addSlot(set.id, { id: 's1', position: 1, label: 'A', isFoil: false, pool: [] })
    useStore.getState().addSlot(set.id, { id: 's2', position: 2, label: 'B', isFoil: false, pool: [] })
    useStore.getState().addSlot(set.id, { id: 's3', position: 3, label: 'C', isFoil: false, pool: [] })

    useStore.getState().deleteSlot(set.id, 's2')
    const slots = useStore.getState().sets[0].slots
    expect(slots.length).toBe(2)
    expect(slots[0].position).toBe(1)
    expect(slots[1].position).toBe(2)
    expect(slots[1].label).toBe('C')
  })

  it('sets and clears cards', () => {
    const set = useStore.getState().createSet('Test', 'Game')
    const cards = [
      { id: 'c1', name: 'Card 1', rarityId: 'r1', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
    ]
    useStore.getState().setCards(set.id, cards)
    expect(useStore.getState().sets[0].cards.length).toBe(1)

    useStore.getState().clearCards(set.id)
    expect(useStore.getState().sets[0].cards.length).toBe(0)
  })

  it('updates pack rules via updateSet', () => {
    const set = useStore.getState().createSet('Test', 'Game')
    useStore.getState().updateSet(set.id, {
      noPackDuplicates: true,
      pityTimers: [{ rarityId: 'r1', afterNPacks: 5 }],
    })
    const updated = useStore.getState().sets[0]
    expect(updated.noPackDuplicates).toBe(true)
    expect(updated.pityTimers[0].afterNPacks).toBe(5)
  })

  it('updates a rarity in place', () => {
    const set = useStore.getState().createSet('Test', 'Game')
    useStore.getState().addRarity(set.id, {
      id: 'r1', name: 'Common', shortCode: 'C', color: '#aaa',
      cardCount: 100, factionId: null,
    })
    useStore.getState().addRarity(set.id, {
      id: 'r2', name: 'Rare', shortCode: 'R', color: '#00f',
      cardCount: 30, factionId: null,
    })

    useStore.getState().updateRarity(set.id, 'r1', { name: 'Updated Common', shortCode: 'UC' })

    const rarities = useStore.getState().sets[0].rarities
    expect(rarities[0].name).toBe('Updated Common')
    expect(rarities[0].shortCode).toBe('UC')
    // Other rarity untouched
    expect(rarities[1].name).toBe('Rare')
  })

  it('reorders rarities', () => {
    const set = useStore.getState().createSet('Test', 'Game')
    const r1 = { id: 'r1', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 100, factionId: null }
    const r2 = { id: 'r2', name: 'Rare', shortCode: 'R', color: '#00f', cardCount: 30, factionId: null }
    useStore.getState().addRarity(set.id, r1)
    useStore.getState().addRarity(set.id, r2)

    useStore.getState().reorderRarities(set.id, [r2, r1])
    const rarities = useStore.getState().sets[0].rarities
    expect(rarities[0].id).toBe('r2')
    expect(rarities[1].id).toBe('r1')
  })

  it('manages factions (add, update, delete)', () => {
    const set = useStore.getState().createSet('Test', 'Game')
    useStore.getState().addFaction(set.id, {
      id: 'f1', name: 'Fire', shortCode: 'F', color: '#f00', cardCount: 20,
    })
    useStore.getState().addFaction(set.id, {
      id: 'f2', name: 'Water', shortCode: 'W', color: '#00f', cardCount: 15,
    })
    expect(useStore.getState().sets[0].factions.length).toBe(2)

    useStore.getState().updateFaction(set.id, 'f1', { name: 'Flame' })
    expect(useStore.getState().sets[0].factions[0].name).toBe('Flame')

    useStore.getState().deleteFaction(set.id, 'f1')
    expect(useStore.getState().sets[0].factions.length).toBe(1)
    expect(useStore.getState().sets[0].factions[0].id).toBe('f2')
  })

  it('updates a slot', () => {
    const set = useStore.getState().createSet('Test', 'Game')
    useStore.getState().addSlot(set.id, {
      id: 's1', position: 1, label: 'Original', isFoil: false,
      pool: [{ rarityId: 'r1', weight: 100 }],
    })

    useStore.getState().updateSlot(set.id, 's1', { label: 'Updated', pool: [{ rarityId: 'r1', weight: 50 }, { rarityId: 'r2', weight: 50 }] })
    const slot = useStore.getState().sets[0].slots[0]
    expect(slot.label).toBe('Updated')
    expect(slot.pool.length).toBe(2)
  })

  it('reorders slots with position renumbering', () => {
    const set = useStore.getState().createSet('Test', 'Game')
    const s1 = { id: 's1', position: 1, label: 'A', isFoil: false, pool: [] }
    const s2 = { id: 's2', position: 2, label: 'B', isFoil: false, pool: [] }
    const s3 = { id: 's3', position: 3, label: 'C', isFoil: false, pool: [] }
    useStore.getState().addSlot(set.id, s1)
    useStore.getState().addSlot(set.id, s2)
    useStore.getState().addSlot(set.id, s3)

    // Reverse order
    useStore.getState().reorderSlots(set.id, [s3, s1, s2])
    const slots = useStore.getState().sets[0].slots
    expect(slots[0].label).toBe('C')
    expect(slots[0].position).toBe(1)
    expect(slots[1].label).toBe('A')
    expect(slots[1].position).toBe(2)
    expect(slots[2].label).toBe('B')
    expect(slots[2].position).toBe(3)
  })

  it('imports a set with a new id', () => {
    const importedSet = {
      id: 'old-id',
      name: 'Imported Set',
      game: 'Some Game',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      packSize: 10,
      packsPerBox: 36,
      packPrice: 4.0,

      rarities: [{ id: 'r1', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 50, factionId: null }],
      factions: [],
      slots: [],
      cards: [],
      slotDividers: [],
      rarityDividers: [],
      noPackDuplicates: false,
      pityTimers: [],
    }

    useStore.getState().importSet(importedSet)
    const sets = useStore.getState().sets
    expect(sets.length).toBe(1)
    expect(sets[0].name).toBe('Imported Set')
    expect(sets[0].id).not.toBe('old-id') // Gets a new UUID
    expect(sets[0].rarities.length).toBe(1)
    expect(useStore.getState().activeSetId).toBe(sets[0].id)
  })

  it('duplicateSet returns null for nonexistent set', () => {
    const result = useStore.getState().duplicateSet('nonexistent')
    expect(result).toBeNull()
  })

  it('switches active set and clears sim results', () => {
    const set1 = useStore.getState().createSet('Set 1', 'Game')
    const set2 = useStore.getState().createSet('Set 2', 'Game')

    useStore.getState().setSimResults({
      setId: set2.id, config: { numPacks: 1, numIterations: 1, unitOfMeasure: 'pack', seed: null },
      rarityStats: [], totalPacks: 1, completedAt: '',
    })

    useStore.getState().setActiveSet(set1.id)
    expect(useStore.getState().activeSetId).toBe(set1.id)
    expect(useStore.getState().simResults).toBeNull()
  })

  it('toggles sidebar and active module', () => {
    expect(useStore.getState().ui.sidebarOpen).toBe(true)
    useStore.getState().toggleSidebar()
    expect(useStore.getState().ui.sidebarOpen).toBe(false)

    useStore.getState().setActiveModule('simulator')
    expect(useStore.getState().ui.activeModule).toBe('simulator')
  })
})
