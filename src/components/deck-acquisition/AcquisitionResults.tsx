import type { DeckAcquisitionResult } from '../../types'

interface Props {
  result: DeckAcquisitionResult
  packsPerBox: number | null
  packPrice?: number
}

export function AcquisitionResults({ result, packsPerBox, packPrice }: Props) {
  const showBox = packsPerBox != null && packsPerBox > 0

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center mb-4">
        <div>
          <div className="text-lg font-semibold">Mean</div>
          <div className="text-2xl font-bold text-accent-gold">{result.mean.toFixed(1)}</div>
          <div className="text-xs text-text-secondary">packs</div>
        </div>
        <div>
          <div className="text-lg font-semibold">Median</div>
          <div className="text-2xl font-bold text-accent-gold">{result.median.toFixed(1)}</div>
          <div className="text-xs text-text-secondary">packs</div>
        </div>
        <div>
          <div className="text-lg font-semibold">P5</div>
          <div className="text-2xl font-bold text-text-secondary">{result.percentiles.p5}</div>
          <div className="text-xs text-text-secondary">packs</div>
        </div>
        <div>
          <div className="text-lg font-semibold">P95</div>
          <div className="text-2xl font-bold text-text-secondary">{result.percentiles.p95}</div>
          <div className="text-xs text-text-secondary">packs</div>
        </div>
      </div>

      {showBox && result.meanBoxes != null && (
        <div className="p-3 bg-bg-tertiary rounded border border-border mb-4">
          <span className="text-sm text-text-secondary">
            Average boxes needed:{' '}
            <span className="text-accent-gold font-medium">{result.meanBoxes.toFixed(1)}</span>
            {' '}({packsPerBox} packs/box)
          </span>
        </div>
      )}

      {packPrice != null && packPrice > 0 && (
        <div className="p-3 bg-bg-tertiary rounded border border-border">
          <span className="text-sm text-text-secondary">
            Estimated cost:{' '}
            <span className="text-accent-gold font-medium">
              ${(result.mean * packPrice).toFixed(2)}
            </span>
            {' '}/{' '}
            <span className="text-text-primary font-medium">
              ${(result.percentiles.p5 * packPrice).toFixed(2)}
            </span>
            {' '}(best case) /{' '}
            <span className="text-text-primary font-medium">
              ${(result.percentiles.p95 * packPrice).toFixed(2)}
            </span>
            {' '}(worst case)
          </span>
        </div>
      )}
    </div>
  )
}
