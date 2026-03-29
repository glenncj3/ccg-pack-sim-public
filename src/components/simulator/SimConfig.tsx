import type { ReactNode } from 'react'
import type { SimConfig as SimConfigType } from '../../types'
import { RequiredNumberInput } from '../shared/RequiredNumberInput'

interface Props {
  config: SimConfigType
  hasBoxSize: boolean
  onChange: (config: SimConfigType) => void
  children?: ReactNode
}

export function SimConfigPanel({ config, hasBoxSize, onChange, children }: Props) {
  return (
    <div className="bg-bg-secondary rounded-lg border border-border p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
        <div>
          <label className="block text-sm text-text-secondary mb-1">
            Number of {config.unitOfMeasure === 'box' ? 'Boxes' : 'Packs'}
          </label>
          <RequiredNumberInput
            min={1}
            value={config.numPacks}
            onChange={(v) => onChange({ ...config, numPacks: v })}
            className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded border border-border"
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1">Trials</label>
          <RequiredNumberInput
            min={100}
            max={100000}
            step={100}
            value={config.numIterations}
            onChange={(v) => onChange({ ...config, numIterations: v })}
            className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded border border-border"
          />
        </div>
        {hasBoxSize && (
          <div>
            <label className="block text-sm text-text-secondary mb-1">Unit of Measure</label>
            <select
              value={config.unitOfMeasure}
              onChange={(e) => onChange({ ...config, unitOfMeasure: e.target.value as 'pack' | 'box' })}
              className="w-full bg-bg-tertiary text-text-primary px-3 py-2 rounded border border-border"
            >
              <option value="pack">Packs</option>
              <option value="box">Boxes</option>
            </select>
          </div>
        )}
        {children && <div className="flex items-end">{children}</div>}
      </div>
    </div>
  )
}
