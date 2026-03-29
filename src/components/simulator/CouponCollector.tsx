import React, { useState } from 'react'
import type { CCGSet, CouponCollectorConfig as CouponConfigType } from '../../types'
import { useCouponSimulation } from '../../lib/useCouponSimulation'
import { Play, X } from 'lucide-react'
import { CouponCollectorConfigPanel } from './CouponCollectorConfig'
import { CouponSummaryTable } from './CouponSummaryTable'
import { DistributionHistogram } from '../charts/DistributionHistogram'
import { CollectibilityTable } from './CollectibilityTable'
import { RarityDividerLabel, buildDividerMap, getRarityPosition } from '../shared/RarityDividerLabel'

interface Props {
  set: CCGSet
}

export function CouponCollector({ set }: Props) {
  const [config, setConfig] = useState<CouponConfigType>({
    targetRarityIds: set.rarities.length > 0 ? [set.rarities[0].id] : [],
    targetCopies: 1,
    numIterations: 10000,
    seed: null,
    byName: false,
  })

  const sim = useCouponSimulation()

  const hasValidSlots = set.slots.length > 0 && set.slots.every((s) => {
    const sum = s.pool.reduce((a, w) => a + w.weight, 0)
    return Math.abs(sum - 100) < 0.01
  })

  const byName = config.byName ?? false
  const hasCards = set.cards.length > 0
  const targetRarities = set.rarities.filter((r) => config.targetRarityIds.includes(r.id))

  const targetCardCount = byName
    ? new Set(set.cards.map((c) => c.name)).size
    : targetRarities.reduce((sum, r) => sum + (r.cardCount ?? 0), 0)

  const hasTarget = byName ? hasCards : config.targetRarityIds.length > 0

  function handleRun() {
    if (!hasValidSlots || !hasTarget) return
    sim.run(set, config)
  }

  // Build a SimResult-like object for CollectibilityTable
  const collectibilityResult = sim.result ? {
    config: { numPacks: 0, numIterations: sim.result.config.numIterations, unitOfMeasure: 'pack' as const, seed: sim.result.config.seed },
    rarityStats: sim.result.rarityStats,
    setId: sim.result.setId,
    totalPacks: 0,
    completedAt: sim.result.completedAt,
  } : null

  return (
    <div className="space-y-4 md:space-y-6 max-w-full md:max-w-4xl">
      <CouponCollectorConfigPanel
        config={config}
        rarities={set.rarities}
        onChange={setConfig}
        rarityDividers={set.rarityDividers}
        hasCards={hasCards}
      >
        <button
          onClick={handleRun}
          disabled={sim.running || !hasValidSlots || targetCardCount === 0 || !hasTarget}
          className="w-full px-6 py-2.5 bg-accent-gold text-bg-primary font-semibold rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {sim.running ? 'Running...' : <><Play size={14} /> Run Simulation</>}
        </button>
      </CouponCollectorConfigPanel>

      {sim.running && (
        <div className="flex items-center gap-4">
          <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-gold transition-all"
              style={{ width: `${sim.progress * 100}%` }}
            />
          </div>
          <button
            onClick={sim.cancel}
            className="text-sm text-text-secondary hover:text-danger flex items-center gap-1 whitespace-nowrap"
          >
            <X size={14} /> Cancel
          </button>
        </div>
      )}

      {!hasValidSlots && (
        <div className="text-sm text-danger">
          Slots must be defined and weights must sum to 100% each.
        </div>
      )}
      {targetCardCount === 0 && hasValidSlots && hasTarget && (
        <div className="text-sm text-danger">
          Selected rarity has no cards defined.
        </div>
      )}

      {sim.error && (
        <div className="bg-danger/10 border border-danger/30 rounded p-3 text-danger text-sm">
          {sim.error}
        </div>
      )}

      {sim.result && (
        <>
          {/* Packs to completion — emphasized at top */}
          <div className="bg-bg-secondary rounded-lg border border-border p-5">
            <h3 className="text-lg font-semibold mb-1 text-center">
              Packs to Collect {config.targetCopies}x Every{' '}
              {byName
                ? <span className="text-accent-gold">Card Name</span>
                : targetRarities.map((r, i) => (
                    <span key={r.id}>
                      {i > 0 && ' + '}
                      <span style={{ color: r.color }}>{r.name}</span>
                    </span>
                  ))
              }
            </h3>
            <p className="text-xs text-text-secondary mb-4 text-center">
              {targetCardCount} distinct {byName ? 'names' : 'cards'} &times; {config.targetCopies} {config.targetCopies === 1 ? 'copy' : 'copies'} each
              &mdash; {sim.result.config.numIterations.toLocaleString()} trials
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold">Mean</div>
                <div className="text-2xl font-bold text-accent-gold">{sim.result.packsToComplete.mean.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-lg font-semibold">Median</div>
                <div className="text-2xl font-bold text-accent-gold">{sim.result.packsToComplete.median.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-lg font-semibold">P5</div>
                <div className="text-2xl font-bold text-text-secondary">{sim.result.packsToComplete.p5}</div>
              </div>
              <div>
                <div className="text-lg font-semibold">P95</div>
                <div className="text-2xl font-bold text-text-secondary">{sim.result.packsToComplete.p95}</div>
              </div>
            </div>
          </div>

          {/* Packs needed histogram */}
          <div>
            <DistributionHistogram
              label="Packs Needed"
              color={targetRarities.length === 1 ? (targetRarities[0].color ?? '#60a5fa') : '#60a5fa'}
              distribution={sim.result.packsToComplete.distribution}
              mean={sim.result.packsToComplete.mean}
              median={sim.result.packsToComplete.median}
              stdDev={sim.result.packsToComplete.stdDev}
              hideStats
            />
          </div>

          <CouponSummaryTable result={sim.result} rarities={set.rarities} rarityDividers={set.rarityDividers} />

          <div>
            <h3 className="text-lg font-semibold mb-4 text-center">Distribution Histograms</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {(() => { const dm = buildDividerMap(set.rarityDividers ?? []); return sim.result.rarityStats.map((stat) => {
                const rarity = set.rarities.find((r) => r.id === stat.rarityId)
                if (!rarity) return null
                const pos = getRarityPosition(stat.rarityId, set.rarities)
                const divider = dm.get(pos)
                return (
                  <React.Fragment key={stat.rarityId}>
                    {divider && <div className="col-span-full"><RarityDividerLabel label={divider.label} /></div>}
                    <DistributionHistogram
                      label={rarity.name}
                      color={rarity.color}
                      distribution={stat.distribution}
                      mean={stat.mean}
                      median={stat.median}
                      stdDev={stat.stdDev}
                      hideStats
                    />
                  </React.Fragment>
                )
              }) })()}
            </div>
          </div>

          {collectibilityResult && (
            <CollectibilityTable result={collectibilityResult} rarities={set.rarities} rarityDividers={set.rarityDividers} />
          )}
        </>
      )}
    </div>
  )
}
