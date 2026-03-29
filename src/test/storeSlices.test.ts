import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'

/**
 * Phase 3 tests: verify that sliced store maintains identical behavior
 * to the monolithic store. These complement the existing store.test.ts
 * by testing slice boundaries and cross-slice interactions.
 */

describe('Store slices composition', () => {
  beforeEach(() => {
    useStore.setState({
      sets: [],
      activeSetId: null,
      simResults: null,
      ui: { sidebarOpen: true, activeModule: 'composer' },
    })
  })

  describe('SetSlice isolation', () => {
    it('set CRUD does not affect UI state', () => {
      const initialUI = { ...useStore.getState().ui }
      useStore.getState().createSet('Test', 'Game')
      expect(useStore.getState().ui).toEqual(initialUI)
    })

    it('activeSet() correctly computes from sets + activeSetId', () => {
      expect(useStore.getState().activeSet()).toBeNull()

      const set = useStore.getState().createSet('Test', 'Game')
      expect(useStore.getState().activeSet()?.id).toBe(set.id)

      useStore.getState().setActiveSet(null)
      expect(useStore.getState().activeSet()).toBeNull()
    })
  })

  describe('SimSlice isolation', () => {
    it('setSimResults is independent of set operations', () => {
      const set = useStore.getState().createSet('Test', 'Game')
      const simResult = {
        setId: set.id,
        config: { numPacks: 10, numIterations: 100, unitOfMeasure: 'pack' as const, seed: null },
        rarityStats: [],
        totalPacks: 10,
        completedAt: new Date().toISOString(),
      }

      useStore.getState().setSimResults(simResult)
      expect(useStore.getState().simResults).toEqual(simResult)

      useStore.getState().setSimResults(null)
      expect(useStore.getState().simResults).toBeNull()
    })
  })

  describe('UISlice isolation', () => {
    it('UI actions do not affect sets or sim results', () => {
      useStore.getState().createSet('Test', 'Game')
      const setsBefore = useStore.getState().sets

      useStore.getState().toggleSidebar()
      useStore.getState().setActiveModule('simulator')

      expect(useStore.getState().sets).toEqual(setsBefore)
      expect(useStore.getState().ui.sidebarOpen).toBe(false)
      expect(useStore.getState().ui.activeModule).toBe('simulator')
    })
  })

  describe('Cross-slice interactions', () => {
    it('deleteSet clears simResults if they belong to deleted set', () => {
      const set = useStore.getState().createSet('Test', 'Game')
      useStore.getState().setSimResults({
        setId: set.id,
        config: { numPacks: 1, numIterations: 1, unitOfMeasure: 'pack', seed: null },
        rarityStats: [],
        totalPacks: 1,
        completedAt: '',
      })

      useStore.getState().deleteSet(set.id)
      expect(useStore.getState().simResults).toBeNull()
    })

    it('deleteSet preserves simResults for other sets', () => {
      const set1 = useStore.getState().createSet('Set 1', 'Game')
      const set2 = useStore.getState().createSet('Set 2', 'Game')

      const simResult = {
        setId: set2.id,
        config: { numPacks: 1, numIterations: 1, unitOfMeasure: 'pack' as const, seed: null },
        rarityStats: [],
        totalPacks: 1,
        completedAt: '',
      }
      useStore.getState().setSimResults(simResult)

      useStore.getState().deleteSet(set1.id)
      expect(useStore.getState().simResults).toEqual(simResult)
    })

    it('setActiveSet clears simResults (cross-slice)', () => {
      const set1 = useStore.getState().createSet('Set 1', 'Game')
      const set2 = useStore.getState().createSet('Set 2', 'Game')

      useStore.getState().setSimResults({
        setId: set2.id,
        config: { numPacks: 1, numIterations: 1, unitOfMeasure: 'pack', seed: null },
        rarityStats: [],
        totalPacks: 1,
        completedAt: '',
      })

      useStore.getState().setActiveSet(set1.id)
      expect(useStore.getState().simResults).toBeNull()
    })
  })
})
