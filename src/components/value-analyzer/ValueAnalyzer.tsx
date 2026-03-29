import { useState, useMemo } from 'react'
import type { CCGSet, ValueAnalyzerConfig, EVResult } from '../../types'
import { calculateEV } from '../../lib/valueAnalyzer'
import { PriceInputs } from './PriceInputs'
import { EVSummary } from './EVSummary'
import { EVBreakdownChart } from '../charts/EVBreakdownChart'

interface Props {
  set: CCGSet
}

export function ValueAnalyzer({ set }: Props) {
  const [config, setConfig] = useState<ValueAnalyzerConfig>(() => ({
    pricingMode: 'rarity',
    rarityPrices: set.rarities.map((r) => {
      // Default to average card value per rarity when cards have values
      const cardsInRarity = set.cards.filter((c) => c.rarityId === r.id && c.value != null)
      if (cardsInRarity.length > 0) {
        const totalWeight = cardsInRarity.reduce((s, c) => s + (c.relativeWeight ?? 1), 0)
        const weightedSum = cardsInRarity.reduce((s, c) => s + c.value! * (c.relativeWeight ?? 1), 0)
        const avg = totalWeight > 0 ? weightedSum / totalWeight : 0
        return { rarityId: r.id, avgPrice: Math.round(avg * 100) / 100 }
      }
      return { rarityId: r.id, avgPrice: 0 }
    }),
    cardPrices: [],
  }))

  const [result, setResult] = useState<EVResult | null>(null)

  // Sync rarity prices when rarities change
  const syncedConfig = useMemo(() => {
    const existingPrices = new Map(config.rarityPrices.map((rp) => [rp.rarityId, rp.avgPrice]))
    return {
      ...config,
      rarityPrices: set.rarities.map((r) => ({
        rarityId: r.id,
        avgPrice: existingPrices.get(r.id) ?? 0,
      })),
    }
  }, [config, set.rarities])

  function handleCalculate() {
    const ev = calculateEV(set, syncedConfig)
    setResult(ev)
  }

  const hasValidSlots = set.slots.length > 0 && set.slots.every((s) => {
    const sum = s.pool.reduce((a, w) => a + w.weight, 0)
    return Math.abs(sum - 100) < 0.01
  })

  return (
    <div className="space-y-4 md:space-y-6 max-w-full md:max-w-4xl">
      <PriceInputs
        set={set}
        config={syncedConfig}
        onChange={(updates) => setConfig((prev) => ({ ...prev, ...updates }))}
        onCalculate={handleCalculate}
        hasValidSlots={hasValidSlots}
      />

      {result && (
        <>
          <EVSummary result={result} rarities={set.rarities} set={set} />
          <EVBreakdownChart result={result} set={set} />
        </>
      )}
    </div>
  )
}
