import React, { useState } from 'react'
import type { CCGSet, SimConfig as SimConfigType } from '../../types'
import { useSimulation } from '../../lib/useSimulation'
import { Play, X } from 'lucide-react'
import { SimConfigPanel } from './SimConfig'
import { SummaryTable } from './SummaryTable'
import { RarityHistogram } from '../charts/RarityHistogram'
import { RarityDividerLabel, buildDividerMap, getRarityPosition } from '../shared/RarityDividerLabel'

import { CollectibilityTable } from './CollectibilityTable'

interface Props {
  set: CCGSet
}

export function Simulator({ set }: Props) {
  const [config, setConfig] = useState<SimConfigType>({
    numPacks: 10,
    numIterations: 10000,
    unitOfMeasure: 'pack',
    seed: null,
  })

  const sim = useSimulation()

  const hasValidSlots = set.slots.length > 0 && set.slots.every((s) => {
    const sum = s.pool.reduce((a, w) => a + w.weight, 0)
    return Math.abs(sum - 100) < 0.01
  })

  function handleRun() {
    if (!hasValidSlots) return
    sim.run(set, config)
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-full md:max-w-4xl">
      <SimConfigPanel
        config={config}
        hasBoxSize={set.packsPerBox != null && set.packsPerBox > 0}
        onChange={setConfig}
      >
        <button
          onClick={handleRun}
          disabled={sim.running || !hasValidSlots}
          className="w-full px-6 py-2.5 bg-accent-gold text-bg-primary font-semibold rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {sim.running ? 'Running...' : <><Play size={14} /> Run Simulation</>}
        </button>
      </SimConfigPanel>

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

      {sim.error && (
        <div className="bg-danger/10 border border-danger/30 rounded p-3 text-danger text-sm">
          {sim.error}
        </div>
      )}

      {sim.result && (
        <>
          <SummaryTable result={sim.result} rarities={set.rarities} packsPerBox={set.packsPerBox} rarityDividers={set.rarityDividers} />

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
                    <RarityHistogram stats={stat} rarity={rarity} />
                  </React.Fragment>
                )
              }) })()}
            </div>
          </div>

          <CollectibilityTable result={sim.result} rarities={set.rarities} rarityDividers={set.rarityDividers} />

        </>
      )}
    </div>
  )
}
