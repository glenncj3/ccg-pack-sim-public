import { v4 as uuidv4 } from 'uuid'
import type { StateCreator } from 'zustand'
import type { SidebarFolder } from '../types'
import type { AppState } from './types'

export interface FolderSlice {
  folders: SidebarFolder[]
  sidebarRootOrder: string[]

  createFolder: (name: string) => void
  renameFolder: (id: string, name: string) => void
  deleteFolder: (id: string) => void
  toggleFolderCollapse: (id: string) => void
  moveSidebarItem: (itemId: string, targetParentId: string | null, index: number) => void
}

/** Remove an item from rootOrder and all folder childOrders */
function removeFromTree(
  rootOrder: string[],
  folders: SidebarFolder[],
  itemId: string
): { rootOrder: string[]; folders: SidebarFolder[] } {
  return {
    rootOrder: rootOrder.filter((id) => id !== itemId),
    folders: folders.map((f) =>
      f.childOrder.includes(itemId)
        ? { ...f, childOrder: f.childOrder.filter((id) => id !== itemId) }
        : f
    ),
  }
}

/** Check if candidateId is a descendant of folderId */
function isDescendant(folders: SidebarFolder[], folderId: string, candidateId: string): boolean {
  const folder = folders.find((f) => f.id === folderId)
  if (!folder) return false
  for (const childId of folder.childOrder) {
    if (childId === candidateId) return true
    if (isDescendant(folders, childId, candidateId)) return true
  }
  return false
}

export const createFolderSlice: StateCreator<AppState, [], [], FolderSlice> = (set) => ({
  folders: [],
  sidebarRootOrder: [],

  createFolder: (name) => {
    const folder: SidebarFolder = {
      id: uuidv4(),
      name,
      parentFolderId: null,
      collapsed: false,
      childOrder: [],
    }
    set((state) => ({
      folders: [...state.folders, folder],
      sidebarRootOrder: [...state.sidebarRootOrder, folder.id],
    }))
  },

  renameFolder: (id, name) => {
    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }))
  },

  deleteFolder: (id) => {
    set((state) => {
      const folder = state.folders.find((f) => f.id === id)
      if (!folder) return state

      // Find where the folder lives and splice its children in at that position
      const rootOrder = [...state.sidebarRootOrder]
      let folders = state.folders.map((f) => ({ ...f, childOrder: [...f.childOrder] }))

      const rootIdx = rootOrder.indexOf(id)
      if (rootIdx !== -1) {
        rootOrder.splice(rootIdx, 1, ...folder.childOrder)
      } else {
        folders = folders.map((f) => {
          const idx = f.childOrder.indexOf(id)
          if (idx !== -1) {
            const newOrder = [...f.childOrder]
            newOrder.splice(idx, 1, ...folder.childOrder)
            return { ...f, childOrder: newOrder }
          }
          return f
        })
      }

      // Update children's parentFolderId
      folders = folders.map((f) =>
        f.parentFolderId === id ? { ...f, parentFolderId: folder.parentFolderId } : f
      )

      // Remove the folder itself
      folders = folders.filter((f) => f.id !== id)

      return { folders, sidebarRootOrder: rootOrder }
    })
  },

  toggleFolderCollapse: (id) => {
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, collapsed: !f.collapsed } : f
      ),
    }))
  },

  moveSidebarItem: (itemId, targetParentId, index) => {
    set((state) => {
      // Prevent moving a folder into itself or its descendants
      if (targetParentId && (targetParentId === itemId || isDescendant(state.folders, itemId, targetParentId))) {
        return state
      }

      // Remove from current location
      const removed = removeFromTree(
        [...state.sidebarRootOrder],
        state.folders.map((f) => ({ ...f, childOrder: [...f.childOrder] })),
        itemId
      )
      const rootOrder = removed.rootOrder
      let folders = removed.folders

      // Insert at new location
      if (targetParentId === null) {
        rootOrder.splice(index, 0, itemId)
      } else {
        folders = folders.map((f) => {
          if (f.id === targetParentId) {
            const newOrder = [...f.childOrder]
            newOrder.splice(index, 0, itemId)
            return { ...f, childOrder: newOrder }
          }
          return f
        })
      }

      // Update parentFolderId if the moved item is a folder
      folders = folders.map((f) =>
        f.id === itemId ? { ...f, parentFolderId: targetParentId } : f
      )

      return { sidebarRootOrder: rootOrder, folders }
    })
  },
})
