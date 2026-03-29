interface CreateFolderInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function CreateFolderInput({ value, onChange, onSubmit, onCancel }: CreateFolderInputProps) {
  return (
    <div className="mb-2 flex gap-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Folder name"
        className="flex-1 bg-bg-primary text-text-primary px-2 py-1 rounded border border-border text-sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSubmit()
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={() => {
          if (!value.trim()) onCancel()
        }}
      />
      <button
        onClick={onSubmit}
        className="px-2 py-1 text-xs bg-accent-gold text-bg-primary rounded font-medium"
      >
        Add
      </button>
    </div>
  )
}
