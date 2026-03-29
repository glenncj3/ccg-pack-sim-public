import type { StateCreator } from 'zustand'
import type { SimResult } from '../types'
import type { AppState } from './types'

export interface SimSlice {
  simResults: SimResult | null
  setSimResults: (results: SimResult | null) => void
}

export const createSimSlice: StateCreator<AppState, [], [], SimSlice> = (set) => ({
  simResults: null,

  setSimResults: (results) => {
    set({ simResults: results })
  },
})
