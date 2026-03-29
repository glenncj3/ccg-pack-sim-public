import type { RarityStats, Rarity } from '../../types'
import { DistributionHistogram } from './DistributionHistogram'

interface Props {
  stats: RarityStats
  rarity: Rarity
}

export function RarityHistogram({ stats, rarity }: Props) {
  return (
    <DistributionHistogram
      label={rarity.name}
      color={rarity.color}
      distribution={stats.distribution}
      mean={stats.mean}
      median={stats.median}
      stdDev={stats.stdDev}
      hideStats
    />
  )
}
