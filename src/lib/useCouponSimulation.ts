import { runCouponCollector } from './simulation'
import type { CouponCollectorConfig, CouponCollectorResult } from '../types'
import { useWorkerSimulation } from './useWorkerSimulation'

export function useCouponSimulation() {
  return useWorkerSimulation<CouponCollectorConfig, CouponCollectorResult>('coupon', runCouponCollector)
}
