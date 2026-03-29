import { useMemo, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type Plugin,
} from 'chart.js'
import { Scatter } from 'react-chartjs-2'
import type { CCGSet, EVResult } from '../../types'

ChartJS.register(LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface Props {
  result: EVResult
  set: CCGSet
}

export function EVBreakdownChart({ result, set }: Props) {
  const [yMode, setYMode] = useState<'count' | 'probability'>('probability')
  const chartRef = useRef<ChartJS<'scatter'>>(null)

  const { points, pointColors } = useMemo(() => {
    const dist = result.packEVDistribution
    if (dist.length === 0) return { points: [], pointColors: [] }

    const min = Math.min(...dist)
    const max = Math.max(...dist)
    const range = max - min
    const binCount = Math.min(30, Math.max(10, Math.ceil(Math.sqrt(dist.length))))
    const binWidth = range > 0 ? range / binCount : 1

    const bins = new Array(binCount + 1).fill(0)
    for (const v of dist) {
      const idx = range > 0 ? Math.min(Math.floor((v - min) / binWidth), binCount) : 0
      bins[idx]++
    }

    const pts: { x: number; y: number }[] = []
    const colors: string[] = []
    for (let i = 0; i < bins.length; i++) {
      const x = min + (i + 0.5) * binWidth
      const y = yMode === 'probability' ? bins[i] / dist.length : bins[i]
      if (y === 0) continue
      pts.push({ x, y })
      colors.push(x >= set.packPrice ? '#34d399' : '#f87171')
    }

    return { points: pts, pointColors: colors }
  }, [result.packEVDistribution, yMode, set.packPrice])

  // Plugin that applies a horizontal gradient to the line at render time.
  // Uses beforeDraw to set the gradient on the resolved line element directly,
  // so it won't be overwritten by Chart.js config resolution.
  const gradientPlugin = useMemo<Plugin<'scatter'>>(() => ({
    id: 'lineGradient',
    beforeDraw(chart) {
      const meta = chart.getDatasetMeta(0)
      const lineElement = meta?.dataset
      if (!lineElement || !chart.chartArea) return

      const xScale = chart.scales.x
      const { left, right } = chart.chartArea
      const ctx = chart.ctx
      const width = right - left
      if (width <= 0) return

      const pricePixel = xScale.getPixelForValue(set.packPrice)
      const stop = Math.max(0, Math.min(1, (pricePixel - left) / width))

      const gradient = ctx.createLinearGradient(left, 0, right, 0)
      gradient.addColorStop(0, '#f87171')
      gradient.addColorStop(Math.max(0, stop - 0.08), '#f87171')
      gradient.addColorStop(Math.min(1, stop + 0.08), '#34d399')
      gradient.addColorStop(1, '#34d399')

      lineElement.options.borderColor = gradient
    },
  }), [set.packPrice])

  const data = {
    datasets: [
      {
        label: 'Pack EV Distribution',
        data: points,
        showLine: true,
        borderColor: '#888',
        borderWidth: 1.5,
        pointBackgroundColor: pointColors,
        pointRadius: 4,
        pointBorderColor: pointColors,
        pointBorderWidth: 1,
        tension: 0,
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
        text: 'Pack EV Distribution (10,000 simulated packs)',
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Pack Value ($)' },
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
          <option value="probability">Probability</option>
          <option value="count">Count</option>
        </select>
      </div>
      <div className="h-72">
        <Scatter ref={chartRef} data={data} options={options} plugins={[gradientPlugin]} />
      </div>
      <div className="flex justify-center gap-4 mt-2 text-xs text-text-secondary">
        <span>
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: '#f87171' }} />
          Below pack price
        </span>
        <span>
          <span className="inline-block w-3 h-3 rounded mr-1" style={{ backgroundColor: '#34d399' }} />
          Above pack price
        </span>
      </div>
    </div>
  )
}
