import { v4 as uuidv4 } from 'uuid'
import type { StateCreator } from 'zustand'
import type {
  CCGSet,
  Rarity,
  Faction,
  Slot,
  Card,
} from '../types'
import type { AppState } from './types'

export interface SetSlice {
  sets: CCGSet[]
  activeSetId: string | null

  activeSet: () => CCGSet | null

  createSet: (name: string, game: string) => CCGSet
  updateSet: (id: string, updates: Partial<CCGSet>) => void
  deleteSet: (id: string) => void
  duplicateSet: (id: string) => CCGSet | null
  importSet: (set: CCGSet) => void
  setActiveSet: (id: string | null) => void

  addRarity: (setId: string, rarity: Rarity) => void
  updateRarity: (setId: string, rarityId: string, updates: Partial<Rarity>) => void
  deleteRarity: (setId: string, rarityId: string) => void
  reorderRarities: (setId: string, rarities: Rarity[]) => void

  addFaction: (setId: string, faction: Faction) => void
  updateFaction: (setId: string, factionId: string, updates: Partial<Faction>) => void
  deleteFaction: (setId: string, factionId: string) => void

  addSlot: (setId: string, slot: Slot) => void
  updateSlot: (setId: string, slotId: string, updates: Partial<Slot>) => void
  deleteSlot: (setId: string, slotId: string) => void
  reorderSlots: (setId: string, slots: Slot[]) => void

  setCards: (setId: string, cards: Card[]) => void
  clearCards: (setId: string) => void
}

function touchSet(set: CCGSet): CCGSet {
  return { ...set, updatedAt: new Date().toISOString() }
}

function updateSetInArray(sets: CCGSet[], id: string, updater: (s: CCGSet) => CCGSet): CCGSet[] {
  return sets.map((s) => (s.id === id ? touchSet(updater(s)) : s))
}

export const createSetSlice: StateCreator<AppState, [], [], SetSlice> = (set, get) => ({
  sets: [],
  activeSetId: null,

  activeSet: () => {
    const state = get()
    return state.sets.find((s) => s.id === state.activeSetId) ?? null
  },

  createSet: (name, game) => {
    const now = new Date().toISOString()
    const newSet: CCGSet = {
      id: uuidv4(),
      name,
      game,
      createdAt: now,
      updatedAt: now,
      packSize: 15,
      packsPerBox: null,
      packPrice: 4.0,
      rarities: [],
      factions: [],
      slots: [],
      cards: [],
      slotDividers: [],
      rarityDividers: [],
      noPackDuplicates: true,
      pityTimers: [],
    }
    set((state) => ({
      sets: [...state.sets, newSet],
      activeSetId: newSet.id,
      sidebarRootOrder: [...state.sidebarRootOrder, newSet.id],
    }))
    return newSet
  },

  updateSet: (id, updates) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, id, (s) => ({ ...s, ...updates })),
    }))
  },

  deleteSet: (id) => {
    set((state) => ({
      sets: state.sets.filter((s) => s.id !== id),
      activeSetId: state.activeSetId === id ? null : state.activeSetId,
      simResults: state.simResults?.setId === id ? null : state.simResults,
      sidebarRootOrder: state.sidebarRootOrder.filter((i) => i !== id),
      folders: state.folders.map((f) =>
        f.childOrder.includes(id)
          ? { ...f, childOrder: f.childOrder.filter((i) => i !== id) }
          : f
      ),
    }))
  },

  duplicateSet: (id) => {
    const source = get().sets.find((s) => s.id === id)
    if (!source) return null
    const now = new Date().toISOString()
    const copy: CCGSet = {
      ...structuredClone(source),
      id: uuidv4(),
      name: `${source.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    }
    set((state) => {
      // Insert the copy right after the source in the sidebar
      const rootIdx = state.sidebarRootOrder.indexOf(id)
      const sidebarRootOrder = [...state.sidebarRootOrder]
      let folders = state.folders

      if (rootIdx !== -1) {
        sidebarRootOrder.splice(rootIdx + 1, 0, copy.id)
      } else {
        // Source is in a folder — insert after it there
        folders = state.folders.map((f) => {
          const idx = f.childOrder.indexOf(id)
          if (idx !== -1) {
            const newOrder = [...f.childOrder]
            newOrder.splice(idx + 1, 0, copy.id)
            return { ...f, childOrder: newOrder }
          }
          return f
        })
      }

      return {
        sets: [...state.sets, copy],
        activeSetId: copy.id,
        sidebarRootOrder,
        folders,
      }
    })
    return copy
  },

  importSet: (importedSet) => {
    const now = new Date().toISOString()
    const newSet: CCGSet = {
      ...importedSet,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    }
    set((state) => ({
      sets: [...state.sets, newSet],
      activeSetId: newSet.id,
      sidebarRootOrder: [...state.sidebarRootOrder, newSet.id],
    }))
  },

  setActiveSet: (id) => {
    set({ activeSetId: id, simResults: null })
  },

  addRarity: (setId, rarity) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({
        ...s,
        rarities: [...s.rarities, rarity],
      })),
    }))
  },

  updateRarity: (setId, rarityId, updates) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({
        ...s,
        rarities: s.rarities.map((r) => (r.id === rarityId ? { ...r, ...updates } : r)),
      })),
    }))
  },

  deleteRarity: (setId, rarityId) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({
        ...s,
        rarities: s.rarities.filter((r) => r.id !== rarityId),
        slots: s.slots.map((slot) => ({
          ...slot,
          pool: slot.pool.filter((w) => w.rarityId !== rarityId),
        })),
      })),
    }))
  },

  reorderRarities: (setId, rarities) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({ ...s, rarities })),
    }))
  },

  addFaction: (setId, faction) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({
        ...s,
        factions: [...s.factions, faction],
      })),
    }))
  },

  updateFaction: (setId, factionId, updates) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({
        ...s,
        factions: s.factions.map((f) => (f.id === factionId ? { ...f, ...updates } : f)),
      })),
    }))
  },

  deleteFaction: (setId, factionId) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({
        ...s,
        factions: s.factions.filter((f) => f.id !== factionId),
      })),
    }))
  },

  addSlot: (setId, slot) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({
        ...s,
        slots: [...s.slots, slot],
      })),
    }))
  },

  updateSlot: (setId, slotId, updates) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({
        ...s,
        slots: s.slots.map((slot) => (slot.id === slotId ? { ...slot, ...updates } : slot)),
      })),
    }))
  },

  deleteSlot: (setId, slotId) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({
        ...s,
        slots: s.slots.filter((slot) => slot.id !== slotId).map((slot, i) => ({
          ...slot,
          position: i + 1,
        })),
      })),
    }))
  },

  reorderSlots: (setId, slots) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({
        ...s,
        slots: slots.map((slot, i) => ({ ...slot, position: i + 1 })),
      })),
    }))
  },

  setCards: (setId, cards) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({ ...s, cards })),
    }))
  },

  clearCards: (setId) => {
    set((state) => ({
      sets: updateSetInArray(state.sets, setId, (s) => ({ ...s, cards: [] })),
    }))
  },

})
