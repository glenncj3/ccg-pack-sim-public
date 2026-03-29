export interface DistributionStats {
  mean: number
  median: number
  stdDev: number
  min: number
  max: number
}

export interface Percentiles {
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

/**
 * Compute basic statistics from a numeric distribution.
 * Returns a sorted copy of the array alongside the stats for callers that need it.
 */
export function computeDistributionStats(distribution: number[]): DistributionStats & { sorted: number[] } {
  const n = distribution.length
  if (n === 0) {
    return { mean: 0, median: 0, stdDev: 0, min: 0, max: 0, sorted: [] }
  }

  const sorted = [...distribution].sort((a, b) => a - b)
  const sum = distribution.reduce((a, b) => a + b, 0)
  const mean = sum / n
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)]
  const variance = distribution.reduce((s, v) => s + (v - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)

  return { mean, median, stdDev, min: sorted[0], max: sorted[n - 1], sorted }
}

/**
 * Compute percentiles from a pre-sorted array.
 */
export function computePercentiles(sorted: number[]): Percentiles {
  const n = sorted.length
  if (n === 0) {
    return { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 }
  }
  return {
    p10: sorted[Math.floor(n * 0.1)],
    p25: sorted[Math.floor(n * 0.25)],
    p50: sorted[Math.floor(n * 0.5)],
    p75: sorted[Math.floor(n * 0.75)],
    p90: sorted[Math.floor(n * 0.9)],
  }
}

/**
 * Compute a single percentile from a pre-sorted array.
 */
export function percentile(sorted: number[], p: number): number {
  const n = sorted.length
  if (n === 0) return 0
  return sorted[Math.floor(n * p)]
}
