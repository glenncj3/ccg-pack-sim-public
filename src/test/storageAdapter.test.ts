import { describe, it, expect, beforeEach } from 'vitest'
import { LocalStorageAdapter } from '../lib/storageAdapter'
import type { CCGSet } from '../types'

const mockSet: CCGSet = {
  id: 'test-set',
  name: 'Test',
  game: 'Game',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  packSize: 15,
  packsPerBox: null,
  packPrice: 4.0,

  rarities: [],
  factions: [],
  slots: [],
  cards: [],
  slotDividers: [],
  rarityDividers: [],
  noPackDuplicates: false,
  pityTimers: [],
}

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter

  beforeEach(() => {
    adapter = new LocalStorageAdapter()
    localStorage.clear()
  })

  it('loads empty array when nothing is stored', async () => {
    const sets = await adapter.loadSets()
    expect(sets).toEqual([])
  })

  it('saves and loads sets', async () => {
    await adapter.saveSets([mockSet])
    const raw = localStorage.getItem('ccg_simulator_sets')
    expect(raw).not.toBeNull()
  })

  it('loads sets from Zustand persist format', async () => {
    localStorage.setItem('ccg_simulator_sets', JSON.stringify({ state: { sets: [mockSet] } }))
    const sets = await adapter.loadSets()
    expect(sets.length).toBe(1)
    expect(sets[0].id).toBe('test-set')
  })

  it('loads sets from plain array format', async () => {
    localStorage.setItem('ccg_simulator_sets', JSON.stringify([mockSet]))
    const sets = await adapter.loadSets()
    expect(sets.length).toBe(1)
  })

  it('returns empty array on corrupted JSON', async () => {
    localStorage.setItem('ccg_simulator_sets', 'not-json')
    const sets = await adapter.loadSets()
    expect(sets).toEqual([])
  })

  it('clears storage', async () => {
    await adapter.saveSets([mockSet])
    await adapter.clear()
    expect(localStorage.getItem('ccg_simulator_sets')).toBeNull()
  })
})
