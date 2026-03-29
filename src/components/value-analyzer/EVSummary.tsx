import React from 'react'
import type { CCGSet, EVResult, Rarity } from '../../types'
import { RarityDividerLabel, buildDividerMap, getRarityPosition } from '../shared/RarityDividerLabel'

interface Props {
  result: EVResult
  rarities: Rarity[]
  set: CCGSet
}

export function EVSummary({ result, rarities, set }: Props) {
  const isPositive = result.totalEVPerPack >= set.packPrice

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 mb-6">
        <div className="bg-bg-tertiary rounded-lg p-3 text-center">
          <div className="text-xs text-text-secondary mb-1">Pack Price</div>
          <div className="text-xl font-bold text-text-primary">
            ${set.packPrice.toFixed(2)}
          </div>
        </div>
        <div className="bg-bg-tertiary rounded-lg p-3 text-center">
          <div className="text-xs text-text-secondary mb-1">EV per Pack</div>
          <div className={`text-xl font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
            ${result.totalEVPerPack.toFixed(2)}
          </div>
        </div>
        <div className="bg-bg-tertiary rounded-lg p-3 text-center">
          <div className="text-xs text-text-secondary mb-1">EV / Cost Ratio</div>
          <div className={`text-xl font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
            {set.packPrice > 0
              ? `${((result.totalEVPerPack / set.packPrice) * 100).toFixed(1)}%`
              : '—'}
          </div>
        </div>
      </div>

      {result.packsToBreakeven !== null && (
        <div className="mb-4 p-3 bg-bg-tertiary rounded border border-border">
          <span className="text-sm text-text-secondary">
            Breakeven point: you would need the equivalent value of{' '}
            <span className="text-accent-gold font-medium">
              {result.packsToBreakeven.toFixed(1)} packs
            </span>{' '}
            for your total card value to equal total pack cost.
          </span>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-text-secondary text-left border-b border-border">
            <th className="pb-2 pr-4">Rarity</th>
            <th className="pb-2 pr-4 text-center">% of Cost</th>
            <th className="pb-2 pr-4 text-center">EV/Pack</th>
            <th className="pb-2 text-center">% of EV</th>
          </tr>
        </thead>
        <tbody>
          {(() => { const dm = buildDividerMap(set.rarityDividers ?? []); return result.rarityContributions.map((c) => {
            const rarity = rarities.find((r) => r.id === c.rarityId)
            if (!rarity) return null
            const pos = getRarityPosition(c.rarityId, rarities)
            const divider = dm.get(pos)
            const pctEV = result.totalEVPerPack > 0
              ? (c.evPerPack / result.totalEVPerPack) * 100
              : 0
            const pctCost = set.packPrice > 0
              ? (c.evPerPack / set.packPrice) * 100
              : 0
            return (
              <React.Fragment key={c.rarityId}>
                {divider && <tr><td colSpan={4} className="pt-3 pb-1"><RarityDividerLabel label={divider.label} /></td></tr>}
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-4" style={{ color: rarity.color }}>{rarity.name}</td>
                  <td className="py-2 pr-4 text-center">{pctCost.toFixed(1)}%</td>
                  <td className="py-2 pr-4 text-center">${c.evPerPack.toFixed(2)}</td>
                  <td className="py-2 text-center">{pctEV.toFixed(1)}%</td>
                </tr>
              </React.Fragment>
            )
          }) })()}
        </tbody>
      </table>
    </div>
  )
}
