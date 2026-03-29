import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createSetSlice } from './setSlice'
import { createSimSlice } from './simSlice'
import { createUISlice } from './uiSlice'
import { createFolderSlice } from './folderSlice'
import type { AppState } from './types'

export type { AppState } from './types'

export const useStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createSetSlice(...a),
      ...createSimSlice(...a),
      ...createUISlice(...a),
      ...createFolderSlice(...a),
    }),
    {
      name: 'ccg_simulator_sets',
      version: 3,
      partialize: (state) => ({
        sets: state.sets,
        activeSetId: state.activeSetId,
        folders: state.folders,
        sidebarRootOrder: state.sidebarRootOrder,
      }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>
        if (version < 1 && Array.isArray(state.sets)) {
          // v0→v1: Flatten duplicateProtection into top-level fields
          state.sets = state.sets.map((s: Record<string, unknown>) => {
            if ('duplicateProtection' in s) {
              const dp = s.duplicateProtection as { enabled?: boolean; noPackDuplicates?: boolean; pityTimer?: unknown } | undefined
              const wasEnabled = dp?.enabled ?? false
              const migrated = { ...s }
              delete migrated.duplicateProtection
              return {
                ...migrated,
                noPackDuplicates: wasEnabled && (dp?.noPackDuplicates ?? false),
                pityTimer: wasEnabled ? (dp?.pityTimer ?? null) : null,
              }
            }
            return s
          })
        }
        if (version < 2 && Array.isArray(state.sets)) {
          // v1→v2: pityTimer: PityTimer | null → pityTimers: PityTimer[]
          state.sets = state.sets.map((s: Record<string, unknown>) => {
            const pt = s.pityTimer as { enabled?: boolean; rarityId?: string; afterNPacks?: number } | null | undefined
            const migrated = { ...s }
            delete migrated.pityTimer
            if (pt && pt.enabled && pt.rarityId) {
              return { ...migrated, pityTimers: [{ rarityId: pt.rarityId, afterNPacks: pt.afterNPacks ?? 10 }] }
            }
            return { ...migrated, pityTimers: [] }
          })
        }
        if (version < 3) {
          // v2→v3: Add folders and sidebarRootOrder
          state.folders = []
          state.sidebarRootOrder = Array.isArray(state.sets)
            ? (state.sets as { id: string }[]).map((s) => s.id)
            : []
        }
        return state as unknown as AppState
      },
    }
  )
)
