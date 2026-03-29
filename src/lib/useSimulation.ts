import { runSimulation } from './simulation'
import type { SimConfig, SimResult } from '../types'
import { useWorkerSimulation } from './useWorkerSimulation'

export function useSimulation() {
  return useWorkerSimulation<SimConfig, SimResult>('run', runSimulation)
}
