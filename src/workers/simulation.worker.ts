import { runSimulation, runCouponCollector } from '../lib/simulation'
import type { CCGSet, SimConfig, CouponCollectorConfig } from '../types'

interface RunMessage {
  type: 'run'
  set: CCGSet
  config: SimConfig
}

interface CouponMessage {
  type: 'coupon'
  set: CCGSet
  config: CouponCollectorConfig
}

type WorkerMessage = RunMessage | CouponMessage

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === 'run') {
    const result = runSimulation(e.data.set, e.data.config, (progress) => {
      self.postMessage({ type: 'progress', ...progress })
    })
    self.postMessage({ type: 'result', result })
  } else if (e.data.type === 'coupon') {
    const result = runCouponCollector(e.data.set, e.data.config, (progress) => {
      self.postMessage({ type: 'progress', ...progress })
    })
    self.postMessage({ type: 'result', result })
  }
}
