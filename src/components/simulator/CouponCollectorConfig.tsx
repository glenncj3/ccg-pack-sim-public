import React, { type ReactNode } from 'react'
import type { CouponCollectorConfig as ConfigType, Rarity, SlotDivider } from '../../types'
import { RequiredNumberInput } from '../shared/RequiredNumberInput'
import { RarityDividerLabel, buildDividerMap } from '../shared/RarityDividerLabel'

interface Props {
  config: ConfigType
  rarities: Rarity[]
  onChange: (config: ConfigType) => void
  children?: ReactNode
  rarityDividers?: SlotDivider[]
  hasCards?: boolean // true when set has CSV-imported cards (enables byName toggle)
}

export function CouponCollectorConfigPanel({ config, rarities, onChange, children, rarityDividers = [], hasCards = false }: Props) {
  const byName = config.byName ?? false

  function toggleByName() {
    onChange({ ...config, byName: !byName, targetRarityIds: !byName ? [] : config.targetRarityIds })
  }

  function toggleRarity(id: string) {
    const ids = config.targetRarityIds.includes(id)
      ? config.targetRarityIds.filter((r) => r !== id)
      : [...config.targetRarityIds, id]
    onChange({ ...config, targetRarityIds: ids })
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">Target</label>
          <div className="space-y-1 max-h-48 overflow-y-auto bg-bg-tertiary rounded border border-border p-2">
            {hasCards && (
              <>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-bg-secondary/50 rounded px-1 py-0.5">
                  <input
                    type="checkbox"
                    checked={byName}
                    onChange={toggleByName}
                    className="accent-accent-gold"
                  />
                  <span className="text-sm font-medium text-text-primary">Card name (any rarity)</span>
                </label>
                <div className="border-t border-border my-1" />
              </>
            )}
            {(() => { const dm = buildDividerMap(rarityDividers); return rarities.map((r, i) => {
              const divider = dm.get(i + 1)
              return (
                <React.Fragment key={r.id}>
                  {divider && <RarityDividerLabel label={divider.label} />}
                  <label className={`flex items-center gap-2 rounded px-1 py-0.5 ${byName ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-bg-secondary/50'}`}>
                    <input
                      type="checkbox"
                      checked={!byName && config.targetRarityIds.includes(r.id)}
                      onChange={() => toggleRarity(r.id)}
                      disabled={byName}
                      className="accent-accent-gold"
                    />
                    <span className="text-sm" style={{ color: r.color }}>{r.name}</span>
                  </label>
                </React.Fragment>
              )
            }) })()}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Copies of Each Card</label>
            <RequiredNumberInput
              min={1}
              max={99}
              value={config.targetCopies}
              onChange={(v) => onChange({ ...config, targetCopies: v })}
              className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded border border-border"
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1">Trials</label>
            <RequiredNumberInput
              min={100}
              max={100000}
              step={100}
              value={config.numIterations}
              onChange={(v) => onChange({ ...config, numIterations: v })}
              className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded border border-border"
            />
          </div>
          {children && <div>{children}</div>}
        </div>
      </div>
    </div>
  )
}
