import React from 'react'
import type { CouponCollectorResult, Rarity, SlotDivider } from '../../types'
import { RarityDividerLabel, buildDividerMap, getRarityPosition } from '../shared/RarityDividerLabel'

interface Props {
  result: CouponCollectorResult
  rarities: Rarity[]
  rarityDividers?: SlotDivider[]
}

export function CouponSummaryTable({ result, rarities, rarityDividers = [] }: Props) {
  const dividerMap = buildDividerMap(rarityDividers)

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <h3 className="text-lg font-semibold mb-4 text-center">Cards Opened By Rarity</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-secondary text-left border-b border-border">
              <th className="pb-2 pr-4">Rarity</th>
              <th className="pb-2 pr-4 text-center">Mean</th>
              <th className="pb-2 pr-4 text-center">P5</th>
              <th className="pb-2 pr-4 text-center">P95</th>
              <th className="pb-2 text-center">P(0)</th>
            </tr>
          </thead>
          <tbody>
            {result.rarityStats.map((stat) => {
              const rarity = rarities.find((r) => r.id === stat.rarityId)
              if (!rarity) return null
              const pos = getRarityPosition(stat.rarityId, rarities)
              const divider = dividerMap.get(pos)
              return (
                <React.Fragment key={stat.rarityId}>
                  {divider && <tr><td colSpan={5} className="pt-3 pb-1"><RarityDividerLabel label={divider.label} /></td></tr>}
                  <tr className="border-b border-border/50 hover:bg-bg-tertiary/50">
                    <td className="py-2 pr-4 font-medium" style={{ color: rarity.color }}>
                      {rarity.name}
                    </td>
                    <td className="py-2 pr-4 text-center">{stat.mean.toFixed(1)}</td>
                    <td className="py-2 pr-4 text-center">{stat.p5}</td>
                    <td className="py-2 pr-4 text-center">{stat.p95}</td>
                    <td className="py-2 text-center">
                      {stat.pZero === 0 ? '0%' : stat.pZero < 0.01 ? '<1%' : `${(stat.pZero * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-secondary mt-3">
        {result.config.numIterations.toLocaleString()} trials &mdash; packs opened varies per trial
      </p>
    </div>
  )
}
