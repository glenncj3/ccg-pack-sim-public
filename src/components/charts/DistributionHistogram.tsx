import { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export interface DistributionHistogramProps {
  label: string
  color: string
  distribution: number[]
  mean: number
  median: number
  stdDev: number
  hideStats?: boolean
}

export function DistributionHistogram({ label, color, distribution, mean, median, stdDev, hideStats }: DistributionHistogramProps) {
  const [yMode, setYMode] = useState<'count' | 'probability'>('count')

  const { labels, values } = useMemo(() => {
    const freq: Map<number, number> = new Map()
    for (const val of distribution) {
      freq.set(val, (freq.get(val) || 0) + 1)
    }
    const sorted = [...freq.entries()].sort((a, b) => a[0] - b[0])
    return {
      labels: sorted.map(([k]) => k.toString()),
      values: sorted.map(([, v]) =>
        yMode === 'probability' ? v / distribution.length : v
      ),
    }
  }, [distribution, yMode])

  const data = {
    labels,
    datasets: [
      {
        label,
        data: values,
        backgroundColor: color + '99',
        borderColor: color,
        borderWidth: 1,
        borderRadius: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `${label} Distribution`,
        color,
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Cards pulled' },
        grid: { display: false },
      },
      y: {
        title: {
          display: true,
          text: yMode === 'count' ? 'Trials' : 'Probability',
        },
      },
    },
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="flex justify-end mb-2">
        <select
          value={yMode}
          onChange={(e) => setYMode(e.target.value as 'count' | 'probability')}
          className="text-xs bg-bg-tertiary text-text-secondary px-2 py-1 rounded border border-border"
        >
          <option value="count">Count</option>
          <option value="probability">Probability</option>
        </select>
      </div>
      <div className="h-64">
        <Bar data={data} options={options} />
      </div>
      {!hideStats && (
        <div className="flex gap-4 mt-2 text-xs text-text-secondary justify-center">
          <span>Mean: {mean.toFixed(1)}</span>
          <span>Median: {median.toFixed(1)}</span>
          <span>StdDev: {stdDev.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}
