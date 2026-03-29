import React from 'react'
import type { SimResult, Rarity, SlotDivider } from '../../types'
import { RarityDividerLabel, buildDividerMap, getRarityPosition } from '../shared/RarityDividerLabel'

interface Props {
  result: SimResult
  rarities: Rarity[]
  packsPerBox: number | null
  rarityDividers?: SlotDivider[]
}

export function SummaryTable({ result, rarities, packsPerBox, rarityDividers = [] }: Props) {
  const showBox = packsPerBox != null && packsPerBox > 0
  const colCount = showBox ? 5 : 4
  const dividerMap = buildDividerMap(rarityDividers)

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-secondary border-b border-border">
              <th className="pb-2 pr-4 text-left">Rarity</th>
              {showBox && <th className="pb-2 pr-4 text-center">Avg / Box</th>}
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
                  {divider && (
                    <tr><td colSpan={colCount} className="pt-3 pb-1"><RarityDividerLabel label={divider.label} /></td></tr>
                  )}
                  <tr className="border-b border-border/50 hover:bg-bg-tertiary/50">
                    <td className="py-2 pr-4 font-medium" style={{ color: rarity.color }}>
                      {rarity.name}
                    </td>
                    {showBox && (
                      <td className="py-2 pr-4 text-center">
                        {stat.avgPerBox?.toFixed(1) ?? '—'}
                      </td>
                    )}
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
        {result.config.numIterations.toLocaleString()} trials &times; {result.totalPacks.toLocaleString()} packs each
      </p>
    </div>
  )
}
