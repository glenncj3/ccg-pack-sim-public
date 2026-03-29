import React from 'react'
import type { CCGSet, ValueAnalyzerConfig } from '../../types'
import { RequiredNumberInput } from '../shared/RequiredNumberInput'
import { RarityDividerLabel, buildDividerMap } from '../shared/RarityDividerLabel'

interface Props {
  set: CCGSet
  config: ValueAnalyzerConfig
  onChange: (updates: Partial<ValueAnalyzerConfig>) => void
  onCalculate: () => void
  hasValidSlots: boolean
}

export function PriceInputs({ set, config, onChange, onCalculate, hasValidSlots }: Props) {
  const hasCSVValues = set.cards.some((c) => c.value != null)

  function updateRarityPrice(rarityId: string, avgPrice: number) {
    onChange({
      rarityPrices: config.rarityPrices.map((rp) =>
        rp.rarityId === rarityId ? { ...rp, avgPrice } : rp
      ),
    })
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">Price Configuration</h3>
        {hasCSVValues && (
          <p className="text-sm text-text-secondary mt-1">All values defined via CSV</p>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
        {(() => { const dm = buildDividerMap(set.rarityDividers ?? []); return set.rarities.map((r, i) => {
          const rp = config.rarityPrices.find((p) => p.rarityId === r.id)
          const divider = dm.get(i + 1)
          return (
            <React.Fragment key={r.id}>
              {divider && <div className="col-span-full"><RarityDividerLabel label={divider.label} /></div>}
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded shrink-0" style={{ backgroundColor: r.color }} />
                <span className="text-sm truncate min-w-0" style={{ color: r.color }}>{r.name}</span>
                <div className="flex items-center gap-1 ml-auto shrink-0">
                  <span className="text-text-secondary text-sm">$</span>
                  <RequiredNumberInput
                    min={0}
                    step={0.01}
                    value={rp?.avgPrice ?? 0}
                    onChange={(v) => updateRarityPrice(r.id, v)}
                    disabled={hasCSVValues}
                    className={`bg-bg-tertiary text-text-primary px-2 py-1 rounded border border-border w-20 text-sm${hasCSVValues ? ' opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
            </React.Fragment>
          )
        }) })()}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4">
        {!hasValidSlots && (
          <span className="text-sm text-danger">Slots must be defined with valid weights.</span>
        )}
        <button
          onClick={onCalculate}
          disabled={!hasValidSlots}
          className="px-6 py-2.5 bg-accent-gold text-bg-primary font-semibold rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Calculate Value
        </button>
      </div>
    </div>
  )
}
