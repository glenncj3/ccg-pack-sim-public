import type { StateCreator } from 'zustand'
import type { UIState, ActiveModule } from '../types'
import type { AppState } from './types'

export interface UISlice {
  ui: UIState
  setActiveModule: (module: ActiveModule) => void
  toggleSidebar: () => void
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  ui: {
    sidebarOpen: true,
    activeModule: 'composer' as ActiveModule,
  },

  setActiveModule: (module) => {
    set((state) => ({ ui: { ...state.ui, activeModule: module } }))
  },

  toggleSidebar: () => {
    set((state) => ({ ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } }))
  },
})
