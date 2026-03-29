import { useState, useRef, useCallback } from 'react'
import type { CCGSet } from '../types'
import type { SimProgress } from './simulation'

interface WorkerSimState<TResult> {
  running: boolean
  progress: number
  result: TResult | null
  error: string | null
}

/**
 * Generic hook for running a simulation in a Web Worker with main-thread fallback.
 *
 * @param workerType - The message type sent to the worker ('run' | 'coupon')
 * @param runFn - The main-thread fallback function to run if the worker fails
 */
export function useWorkerSimulation<TConfig, TResult>(
  workerType: string,
  runFn: (set: CCGSet, config: TConfig, onProgress?: (p: SimProgress) => void) => TResult
) {
  const [state, setState] = useState<WorkerSimState<TResult>>({
    running: false,
    progress: 0,
    result: null,
    error: null,
  })
  const workerRef = useRef<Worker | null>(null)

  const run = useCallback((set: CCGSet, config: TConfig) => {
    setState({ running: true, progress: 0, result: null, error: null })

    try {
      if (workerRef.current) {
        workerRef.current.terminate()
      }

      const worker = new Worker(
        new URL('../workers/simulation.worker.ts', import.meta.url),
        { type: 'module' }
      )
      workerRef.current = worker

      worker.onmessage = (e) => {
        if (e.data.type === 'progress') {
          setState((s) => ({ ...s, progress: e.data.current / e.data.total }))
        } else if (e.data.type === 'result') {
          setState({ running: false, progress: 1, result: e.data.result, error: null })
          worker.terminate()
          workerRef.current = null
        }
      }

      worker.onerror = () => {
        worker.terminate()
        workerRef.current = null
        runOnMainThread(set, config, runFn, setState)
      }

      worker.postMessage({ type: workerType, set, config })
    } catch {
      runOnMainThread(set, config, runFn, setState)
    }
  }, [workerType, runFn])

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setState((s) => ({ ...s, running: false }))
  }, [])

  return { ...state, run, cancel }
}

function runOnMainThread<TConfig, TResult>(
  set: CCGSet,
  config: TConfig,
  runFn: (set: CCGSet, config: TConfig, onProgress?: (p: SimProgress) => void) => TResult,
  setState: React.Dispatch<React.SetStateAction<WorkerSimState<TResult>>>
) {
  try {
    const result = runFn(set, config, (progress) => {
      setState((s) => ({ ...s, progress: progress.current / progress.total }))
    })
    setState({ running: false, progress: 1, result, error: null })
  } catch (e) {
    setState({ running: false, progress: 0, result: null, error: String(e) })
  }
}
