import { useState } from 'react'
import { PRESETS } from '../../lib/presets'
import type { CCGSet } from '../../types'

interface CreateSetFormProps {
  onCreate: (name: string, game: string) => void
  onImport: (set: CCGSet) => void
  onClose: () => void
}

export function CreateSetForm({ onCreate, onImport, onClose }: CreateSetFormProps) {
  const [name, setName] = useState('')
  const [game, setGame] = useState('')

  function handleCreate() {
    if (!name.trim()) return
    onCreate(name.trim(), game.trim())
    onClose()
  }

  return (
    <div className="mb-3 p-2 bg-bg-tertiary rounded border border-border space-y-2">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Set name"
        className="w-full bg-bg-primary text-text-primary px-2 py-1 rounded border border-border text-sm"
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
      />
      <input
        type="text"
        value={game}
        onChange={(e) => setGame(e.target.value)}
        placeholder="Game (optional)"
        className="w-full bg-bg-primary text-text-primary px-2 py-1 rounded border border-border text-sm"
        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
      />
      <div className="flex gap-1">
        <button
          onClick={handleCreate}
          className="px-2 py-1 text-xs bg-accent-gold text-bg-primary rounded font-medium"
        >
          Create
        </button>
        <button
          onClick={onClose}
          className="px-2 py-1 text-xs text-text-secondary hover:text-text-primary"
        >
          Cancel
        </button>
      </div>
      <div className="border-t border-border pt-2 mt-2">
        <p className="text-xs text-text-secondary mb-1">Or start from a template:</p>
        <div className="flex flex-col gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={async () => {
                const newSet = await preset.create()
                onImport(newSet)
                onClose()
              }}
              className="text-xs text-left text-accent-gold hover:opacity-80 px-1 py-0.5"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
