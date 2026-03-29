import type { CCGSet } from '../types'

/**
 * Storage adapter interface for abstracting persistence.
 * Currently backed by localStorage; can be swapped for REST API in Phase 3+.
 */
export interface StorageAdapter {
  loadSets(): Promise<CCGSet[]>
  saveSets(sets: CCGSet[]): Promise<void>
  clear(): Promise<void>
}

const STORAGE_KEY = 'ccg_simulator_sets'

export class LocalStorageAdapter implements StorageAdapter {
  async loadSets(): Promise<CCGSet[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const data = JSON.parse(raw)
      // The Zustand persist middleware stores { state: { sets, activeSetId } }
      if (data?.state?.sets) return data.state.sets
      if (Array.isArray(data)) return data
      return []
    } catch {
      return []
    }
  }

  async saveSets(sets: CCGSet[]): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets))
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY)
  }
}

// Default singleton
export const storage: StorageAdapter = new LocalStorageAdapter()
