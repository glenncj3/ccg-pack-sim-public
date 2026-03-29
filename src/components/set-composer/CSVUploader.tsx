import { useState, useRef } from 'react'
import { useStore } from '../../store'
import { parseCardCSV, type CSVParseResult } from '../../lib/csvParser'
import type { CCGSet, SetExport } from '../../types'
import { Download, Upload, Trash2 } from 'lucide-react'
import { DoneIcon, DuplicateIcon } from '../shared/Icons'

interface Props {
  set: CCGSet
}

export function CSVUploader({ set }: Props) {
  const { setCards, clearCards, importSet, duplicateSet } = useStore()
  const [parseResult, setParseResult] = useState<CSVParseResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const result = parseCardCSV(text, set.rarities)
      setParseResult(result)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) handleFile(file)
  }

  function confirmImport() {
    if (!parseResult) return
    setCards(set.id, parseResult.cards)
    setParseResult(null)
  }

  function handleClear() {
    clearCards(set.id)
    setParseResult(null)
  }

  function handleExportJSON() {
    const exportData: SetExport = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      set,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${set.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as SetExport
        if (data.set && data.exportVersion) {
          importSet(data.set)
        }
      } catch {
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)
    if (jsonInputRef.current) jsonInputRef.current.value = ''
  }

  const raritySummary = set.cards.length > 0
    ? set.rarities
        .map((r) => {
          const count = set.cards.filter((c) => c.rarityId === r.id).length
          return count > 0 ? `${count} ${r.name}` : null
        })
        .filter(Boolean)
        .join(', ')
    : null

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4 flex flex-col">
      <h3 className="text-lg font-semibold mb-3 text-center">Card List (CSV)</h3>

      {set.cards.length > 0 ? (
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-medium text-success">{set.cards.length} cards loaded</span>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-sm border border-border text-text-secondary hover:text-danger rounded flex items-center gap-1.5 whitespace-nowrap"
            >
              <Trash2 size={14} /> Clear Data
            </button>
          </div>
          {raritySummary && (
            <p className="text-sm text-text-secondary">{raritySummary}</p>
          )}
        </div>
      ) : (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => csvInputRef.current?.click()}
            className={`flex-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
              dragOver
                ? 'border-accent-gold bg-accent-gold-muted/20'
                : 'border-border hover:border-text-secondary'
            }`}
          >
            <p className="text-text-secondary text-sm">
              Drag & drop a .csv file, or click to browse
            </p>
            <p className="text-text-secondary/60 text-xs mt-1">
              Columns: name, rarity (required); value, relativeWeight (optional)
            </p>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
          </div>

          {parseResult && (
            <div className="mt-3 p-3 bg-bg-tertiary rounded border border-border">
              <p className="text-sm mb-2">
                <span className="text-text-primary font-medium">{parseResult.cards.length}</span>
                {' cards parsed'}
                {parseResult.skipped.length > 0 && (
                  <span className="text-danger"> ({parseResult.skipped.length} rows skipped)</span>
                )}
              </p>
              {parseResult.skipped.length > 0 && (
                <details className="text-xs text-text-secondary mb-2">
                  <summary className="cursor-pointer hover:text-text-primary">Show skipped rows</summary>
                  <ul className="mt-1 ml-4 list-disc">
                    {parseResult.skipped.map((s, i) => (
                      <li key={i}>Row {s.row}: {s.reason}</li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="flex gap-2">
                <button
                  onClick={confirmImport}
                  disabled={parseResult.cards.length === 0}
                  className="px-3 py-1.5 text-sm bg-accent-gold text-bg-primary font-medium rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <DoneIcon /> Confirm Import
                </button>
                <button
                  onClick={() => setParseResult(null)}
                  className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary border border-border rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Save & Export */}
      <div className="mt-3 flex flex-wrap gap-2 justify-center">
        <button
          onClick={handleExportJSON}
          className="px-3 py-1.5 text-sm bg-accent-gold text-bg-primary font-medium rounded hover:opacity-90 flex items-center gap-1.5 whitespace-nowrap"
        >
          <Download size={14} /> Export JSON
        </button>
        <button
          onClick={() => jsonInputRef.current?.click()}
          className="px-3 py-1.5 text-sm border border-border text-text-secondary hover:text-text-primary rounded flex items-center gap-1.5 whitespace-nowrap"
        >
          <Upload size={14} /> Import JSON
        </button>
        <button
          onClick={() => duplicateSet(set.id)}
          className="px-3 py-1.5 text-sm border border-border text-text-secondary hover:text-text-primary rounded flex items-center gap-1.5 whitespace-nowrap"
        >
          <DuplicateIcon /> Duplicate Set
        </button>
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportJSON}
        />
      </div>
    </div>
  )
}
