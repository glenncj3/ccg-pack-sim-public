import { useState } from 'react'
import type { CCGSet, DeckTarget, DeckAcquisitionResult } from '../../types'
import { runDeckAcquisitionSim } from '../../lib/deckAcquisition'
import { CardSelector } from './CardSelector'
import { AcquisitionResults } from './AcquisitionResults'
import { DistributionHistogram } from '../charts/DistributionHistogram'
import { computeDistributionStats } from '../../lib/stats'
import { RequiredNumberInput } from '../shared/RequiredNumberInput'

interface Props {
  set: CCGSet
}

export function DeckAcquisition({ set }: Props) {
  const [targets, setTargets] = useState<DeckTarget[]>([])
  const [iterations, setIterations] = useState(10000)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<DeckAcquisitionResult | null>(null)

  function handleRun() {
    if (targets.length === 0) return
    setRunning(true)

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const res = runDeckAcquisitionSim(set, {
        targets,
        numIterations: iterations,
      })
      setResult(res)
      setRunning(false)
    }, 10)
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-full md:max-w-4xl">
      <CardSelector set={set} targets={targets} onChange={setTargets} />

      {set.cards.length > 0 && (
        <>
          <div className="bg-bg-secondary rounded-lg border border-border p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Trials</label>
                <RequiredNumberInput
                  min={100}
                  max={50000}
                  step={100}
                  value={iterations}
                  onChange={(v) => setIterations(v)}
                  className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded border border-border"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleRun}
                  disabled={running || targets.length === 0}
                  className="w-full px-6 py-2.5 bg-accent-gold text-bg-primary font-semibold rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  {running ? 'Simulating...' : `Collect (${targets.length}) Cards`}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {result && (
        <>
          <AcquisitionResults result={result} packsPerBox={set.packsPerBox} packPrice={set.packPrice} />

          {result.distribution.length > 0 && (
            <PacksDistributionHistogram distribution={result.distribution} />
          )}
        </>
      )}
    </div>
  )
}

function PacksDistributionHistogram({ distribution }: { distribution: number[] }) {
  const { mean, median, stdDev } = computeDistributionStats(distribution)

  return (
    <DistributionHistogram
      label="Packs Needed"
      color="#f0b429"
      distribution={distribution}
      mean={mean}
      median={median}
      stdDev={stdDev}
      hideStats
    />
  )
}
