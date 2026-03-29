import React, { useState } from 'react'
import type { SimResult, Rarity, SlotDivider } from '../../types'
import { RequiredNumberInput } from '../shared/RequiredNumberInput'
import { RarityDividerLabel, buildDividerMap, getRarityPosition } from '../shared/RarityDividerLabel'

interface Props {
  result: SimResult
  rarities: Rarity[]
  rarityDividers?: SlotDivider[]
}

export function CollectibilityTable({ result, rarities, rarityDividers = [] }: Props) {
  const [threshold, setThreshold] = useState(1)

  // Max useful threshold: highest index where any rarity has non-zero data
  const maxThreshold = result.rarityStats.reduce((max, stat) => {
    return Math.max(max, stat.collectibility.length)
  }, 0)

  if (maxThreshold === 0) return null

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="relative flex items-center justify-center mb-4">
        <h3 className="text-lg font-semibold">Ownership</h3>
        <RequiredNumberInput
          min={1}
          max={maxThreshold}
          value={threshold}
          onChange={(v) => setThreshold(Math.max(1, Math.min(maxThreshold, v)))}
          className="absolute right-0 w-16 bg-bg-primary border border-border rounded px-2 py-1 text-center text-sm"
        />
      </div>
      <p className="text-xs text-text-secondary mb-3 text-center">
        Average % of cards collected with at least {threshold} {threshold === 1 ? 'copy' : 'copies'}, across {result.config.numIterations.toLocaleString()} trials.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-secondary border-b border-border">
              <th className="pb-2 pr-4 text-left">Rarity</th>
              <th className="pb-2 pr-4 text-center">Cards</th>
              <th className="pb-2 pr-4 text-center">Avg %</th>
              <th className="pb-2 pr-4 text-center">P5</th>
              <th className="pb-2 text-center">P95</th>
            </tr>
          </thead>
          <tbody>
            {(() => { const dm = buildDividerMap(rarityDividers); return result.rarityStats.map((stat) => {
              const rarity = rarities.find((r) => r.id === stat.rarityId)
              if (!rarity) return null
              const pos = getRarityPosition(stat.rarityId, rarities)
              const divider = dm.get(pos)

              const dist = stat.collectibility[threshold - 1]
              const row = (!dist || dist.length === 0) ? (
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium" style={{ color: rarity.color }}>{rarity.name}</td>
                  <td className="py-2 pr-4 text-center text-text-secondary">{rarity.cardCount}</td>
                  <td className="py-2 pr-4 text-center text-text-secondary" colSpan={3}>—</td>
                </tr>
              ) : (() => {
                const avg = dist.reduce((a, b) => a + b, 0) / dist.length
                const sorted = [...dist].sort((a, b) => a - b)
                const p5 = sorted[Math.floor(sorted.length * 0.05)]
                const p95 = sorted[Math.floor(sorted.length * 0.95)]
                return (
                  <tr className="border-b border-border/50 hover:bg-bg-tertiary/50">
                    <td className="py-2 pr-4 font-medium" style={{ color: rarity.color }}>{rarity.name}</td>
                    <td className="py-2 pr-4 text-center">{rarity.cardCount}</td>
                    <td className="py-2 pr-4 text-center">{fmtPct(avg)}</td>
                    <td className="py-2 pr-4 text-center">{fmtPct(p5)}</td>
                    <td className="py-2 text-center">{fmtPct(p95)}</td>
                  </tr>
                )
              })()

              return (
                <React.Fragment key={stat.rarityId}>
                  {divider && <tr><td colSpan={5} className="pt-3 pb-1"><RarityDividerLabel label={divider.label} /></td></tr>}
                  {row}
                </React.Fragment>
              )
            }) })()}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function fmtPct(v: number): string {
  const pct = v * 100
  if (pct === 0) return '0%'
  if (pct === 100) return '100%'
  if (pct < 1) return '<1%'
  return `${pct.toFixed(1)}%`
}
