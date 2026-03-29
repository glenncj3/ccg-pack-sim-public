import { useState, useCallback } from 'react'
import { useStore } from '../../store'
import { DuplicateIcon, DeleteIcon, EditIcon } from '../shared/Icons'
import { ChevronRight, Folder, FolderOpen, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { CreateSetForm } from './CreateSetForm'
import { CreateFolderInput } from './CreateFolderInput'
import type { CCGSet, SidebarFolder } from '../../types'

// ── Drag-and-drop types ─────────────────────────────────────────

interface DragItem {
  id: string
  type: 'set' | 'folder'
}

interface DropTarget {
  parentId: string | null
  index: number
}

interface DropIntoFolder {
  folderId: string
}

type DropZone = DropTarget | DropIntoFolder

function isDropIntoFolder(dz: DropZone): dz is DropIntoFolder {
  return 'folderId' in dz
}

// ── Sidebar ─────────────────────────────────────────────────────

export function Sidebar() {
  const {
    sets, activeSetId, setActiveSet, createSet, deleteSet, duplicateSet, importSet,
    ui, toggleSidebar, simResults,
    folders, sidebarRootOrder, createFolder, renameFolder, deleteFolder,
    toggleFolderCollapse, moveSidebarItem,
  } = useStore()

  const [showNewForm, setShowNewForm] = useState(false)
  const [newFolderName, setNewFolderName] = useState<string | null>(null)

  // DnD state
  const [dragItem, setDragItem] = useState<DragItem | null>(null)
  const [dropZone, setDropZone] = useState<DropZone | null>(null)

  // Rename state
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const setsById = new Map(sets.map((s) => [s.id, s]))
  const foldersById = new Map(folders.map((f) => [f.id, f]))

  // ── Handlers ────────────────────────────────────────────────

  function handleDelete(id: string, name: string) {
    if (confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteSet(id)
    }
  }

  function handleDeleteFolder(id: string, name: string) {
    if (confirm(`Delete folder "${name}"? Sets inside will be moved out.`)) {
      deleteFolder(id)
    }
  }

  function handleStartRename(folder: SidebarFolder) {
    setRenamingFolderId(folder.id)
    setRenameValue(folder.name)
  }

  function handleFinishRename() {
    if (renamingFolderId && renameValue.trim()) {
      renameFolder(renamingFolderId, renameValue.trim())
    }
    setRenamingFolderId(null)
    setRenameValue('')
  }

  function handleCreateFolder() {
    if (newFolderName === null) {
      setNewFolderName('')
      return
    }
    if (!newFolderName.trim()) {
      setNewFolderName(null)
      return
    }
    createFolder(newFolderName.trim())
    setNewFolderName(null)
  }

  // ── DnD handlers ──────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, item: DragItem) {
    setDragItem(item)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', item.id)
  }

  function handleDragEnd() {
    if (dragItem && dropZone) {
      if (isDropIntoFolder(dropZone)) {
        const folder = foldersById.get(dropZone.folderId)
        moveSidebarItem(dragItem.id, dropZone.folderId, folder?.childOrder.length ?? 0)
      } else {
        moveSidebarItem(dragItem.id, dropZone.parentId, dropZone.index)
      }
    }
    setDragItem(null)
    setDropZone(null)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  function computeDropZone(
    e: React.DragEvent,
    itemId: string,
    itemType: 'set' | 'folder',
    parentId: string | null,
    indexInParent: number
  ) {
    if (!dragItem || dragItem.id === itemId) {
      setDropZone(null)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const ratio = y / rect.height

    if (itemType === 'folder') {
      if (ratio < 0.25) {
        setDropZone({ parentId, index: indexInParent })
      } else if (ratio > 0.75) {
        setDropZone({ parentId, index: indexInParent + 1 })
      } else {
        setDropZone({ folderId: itemId })
      }
    } else {
      if (ratio < 0.5) {
        setDropZone({ parentId, index: indexInParent })
      } else {
        setDropZone({ parentId, index: indexInParent + 1 })
      }
    }
  }

  // ── Render helpers ────────────────────────────────────────

  function renderDropIndicator(parentId: string | null, index: number) {
    if (
      !dragItem ||
      !dropZone ||
      isDropIntoFolder(dropZone) ||
      dropZone.parentId !== parentId ||
      dropZone.index !== index
    ) {
      return null
    }
    return <div className="h-0.5 bg-accent-gold rounded mx-1 my-0.5" />
  }

  function renderSetItem(s: CCGSet, parentId: string | null, indexInParent: number) {
    const isActive = s.id === activeSetId
    const isDragging = dragItem?.id === s.id

    return (
      <div key={s.id}>
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, { id: s.id, type: 'set' })}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => {
            handleDragOver(e)
            computeDropZone(e, s.id, 'set', parentId, indexInParent)
          }}
          onDragLeave={() => setDropZone(null)}
          className={`group rounded px-2 py-1.5 cursor-pointer transition-colors ${
            isDragging ? 'opacity-40' : ''
          } ${
            isActive
              ? 'bg-accent-gold-muted text-accent-gold'
              : 'hover:bg-bg-tertiary text-text-secondary hover:text-text-primary'
          }`}
          onClick={() => {
            if (s.id === activeSetId) return
            if (simResults && !confirm('Switching sets will clear your simulation results. Continue?')) return
            setActiveSet(s.id)
          }}
        >
          <div className="flex items-center justify-between">
            <div className="truncate">
              <div className="text-sm font-medium truncate">{s.name}</div>
              {s.game && <div className="text-xs opacity-60 truncate">{s.game}</div>}
            </div>
            <div className="hidden group-hover:flex gap-2 shrink-0 ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); duplicateSet(s.id) }}
                className="text-base px-1 hover:text-white"
                title="Duplicate"
              >
                <DuplicateIcon />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(s.id, s.name) }}
                className="text-base px-1 hover:text-danger"
                title="Delete"
              >
                <DeleteIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderFolderItem(folder: SidebarFolder, parentId: string | null, indexInParent: number, depth: number) {
    const isDragging = dragItem?.id === folder.id
    const isDropTarget = dropZone && isDropIntoFolder(dropZone) && dropZone.folderId === folder.id
    const isRenaming = renamingFolderId === folder.id

    return (
      <div key={folder.id}>
        <div
          draggable={!isRenaming}
          onDragStart={(e) => handleDragStart(e, { id: folder.id, type: 'folder' })}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => {
            handleDragOver(e)
            computeDropZone(e, folder.id, 'folder', parentId, indexInParent)
          }}
          onDragLeave={() => setDropZone(null)}
          className={`group rounded px-2 py-1.5 cursor-pointer transition-colors ${
            isDragging ? 'opacity-40' : ''
          } ${
            isDropTarget
              ? 'bg-accent-gold/20'
              : 'hover:bg-bg-tertiary'
          } text-text-secondary`}
          onClick={() => !isRenaming && toggleFolderCollapse(folder.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <ChevronRight size={12} className={`transition-transform ${folder.collapsed ? '' : 'rotate-90'}`} />
              {folder.collapsed
                ? <Folder size={14} className="opacity-60" />
                : <FolderOpen size={14} className="opacity-60" />
              }
              {isRenaming ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishRename()
                    if (e.key === 'Escape') { setRenamingFolderId(null); setRenameValue('') }
                  }}
                  onBlur={handleFinishRename}
                  className="bg-bg-primary text-text-primary px-1 py-0 rounded border border-border text-sm w-full"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="text-sm font-medium truncate">{folder.name}</span>
              )}
            </div>
            <div className="hidden group-hover:flex gap-2 shrink-0 ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); handleStartRename(folder) }}
                className="text-xs px-1 hover:text-accent-gold"
                title="Rename"
              >
                <EditIcon />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id, folder.name) }}
                className="text-base px-1 hover:text-danger"
                title="Delete folder"
              >
                <DeleteIcon />
              </button>
            </div>
          </div>
        </div>

        {!folder.collapsed && (
          <div className="ml-3 border-l border-border/40 pl-1">
            {renderItemList(folder.childOrder, folder.id, depth + 1)}
            {folder.childOrder.length === 0 && (
              <div
                className="text-[10px] text-text-secondary/40 py-1 px-2 italic"
                onDragOver={(e) => {
                  handleDragOver(e)
                  if (dragItem && dragItem.id !== folder.id) {
                    setDropZone({ folderId: folder.id })
                  }
                }}
                onDragLeave={() => setDropZone(null)}
                onDrop={(e) => { e.preventDefault(); handleDragEnd() }}
              >
                Drop items here
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderItemList(order: string[], parentId: string | null, depth: number) {
    return (
      <>
        {order.map((id, index) => {
          const folder = foldersById.get(id)
          const set = setsById.get(id)

          return (
            <div key={id}>
              {renderDropIndicator(parentId, index)}
              {folder
                ? renderFolderItem(folder, parentId, index, depth)
                : set
                  ? renderSetItem(set, parentId, index)
                  : null}
            </div>
          )
        })}
        {renderDropIndicator(parentId, order.length)}
      </>
    )
  }

  // ── Collapsed sidebar ─────────────────────────────────────

  if (!ui.sidebarOpen) {
    return (
      <div className="hidden md:flex w-10 bg-bg-secondary border-r border-border flex-col items-end pr-2.5 pt-6">
        <button
          onClick={toggleSidebar}
          className="text-text-secondary hover:text-accent-gold"
          title="Open sidebar"
        >
          <PanelRightOpen size={20} />
        </button>
      </div>
    )
  }

  // ── Compute effective root order ──────────────────────────

  const allOrderedIds = new Set([
    ...sidebarRootOrder,
    ...folders.flatMap((f) => f.childOrder),
  ])
  const orphanedSetIds = sets.filter((s) => !allOrderedIds.has(s.id)).map((s) => s.id)
  const effectiveRootOrder = [...sidebarRootOrder, ...orphanedSetIds]

  const isEmpty = sets.length === 0 && folders.length === 0

  // ── Full sidebar ──────────────────────────────────────────

  return (
    <>
    <div
      data-testid="sidebar-backdrop"
      className="fixed inset-0 bg-black/50 z-30 md:hidden"
      onClick={toggleSidebar}
    />
    <aside className="w-64 bg-bg-secondary border-r border-border flex flex-col h-full shrink-0 fixed inset-y-0 left-0 z-40 md:relative md:z-auto">
      <div className="pl-8 pr-2.5 pt-6 pb-4 flex items-center justify-between border-b border-border">
        <h1 className="text-sm font-bold text-accent-gold tracking-wide">CCG Pack Simulator</h1>
        <button
          onClick={toggleSidebar}
          className="text-text-secondary hover:text-text-primary"
        >
          <PanelRightClose size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-secondary uppercase tracking-wider">Set Library</span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="text-xs text-accent-gold hover:opacity-80"
            >
              + Set
            </button>
            <button
              onClick={handleCreateFolder}
              className="text-xs text-accent-gold hover:opacity-80"
            >
              + Folder
            </button>
          </div>
        </div>

        {newFolderName !== null && (
          <CreateFolderInput
            value={newFolderName}
            onChange={setNewFolderName}
            onSubmit={handleCreateFolder}
            onCancel={() => setNewFolderName(null)}
          />
        )}

        {showNewForm && (
          <CreateSetForm
            onCreate={createSet}
            onImport={importSet}
            onClose={() => setShowNewForm(false)}
          />
        )}

        {isEmpty ? (
          <p className="text-xs text-text-secondary/60 mt-4 text-center">No sets yet</p>
        ) : (
          <div
            className="space-y-0.5"
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(e) => {
              e.preventDefault()
              handleDragEnd()
            }}
          >
            {renderItemList(effectiveRootOrder, null, 0)}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border flex items-center justify-between">
        <a
          href="https://github.com/glenncj3/ccg-pack-sim-public"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent-gold transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          GitHub
        </a>
        <span className="text-[10px] text-text-secondary/60">&copy; 2026 Glenn Jones</span>
      </div>
    </aside>
    </>
  )
}
