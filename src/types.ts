// ── Core primitives ──────────────────────────────────────────────

export interface Rarity {
  id: string
  name: string
  shortCode: string
  color: string // Hex color for UI display
  cardCount: number // Total distinct cards of this rarity in the set
  factionId: string | null // Rarity aliasing — points to associated faction
}

export interface Faction {
  id: string
  name: string
  shortCode: string
  color: string
  cardCount: number
}

export interface SlotRarityWeight {
  rarityId: string
  weight: number // Percentage 0–100, pool must sum to exactly 100
}

export interface Slot {
  id: string
  position: number // 1-indexed
  label: string
  isFoil: boolean
  pool: SlotRarityWeight[] // Must sum to exactly 100
}

export interface Card {
  id: string
  name: string
  rarityId: string
  factionId: string | null
  setNumber: string | null
  isFoilVariant: boolean
  notes: string | null
  relativeWeight?: number // Per-card weight within its rarity (default 1; <1 = less common, >1 = more common)
  value?: number // Per-card market value (from CSV import)
}

export interface PityTimer {
  rarityId: string
  afterNPacks: number
}

export interface SlotDivider {
  beforePosition: number // Divider appears before this slot position
  label: string
}

export interface CCGSet {
  id: string
  name: string
  game: string
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  packSize: number
  packsPerBox: number | null
  packPrice: number
  rarities: Rarity[]
  factions: Faction[]
  slots: Slot[]
  cards: Card[]
  slotDividers: SlotDivider[] // Cosmetic section dividers between slot groups
  rarityDividers: SlotDivider[] // Cosmetic section dividers between rarity rows
  noPackDuplicates: boolean
  pityTimers: PityTimer[]
}

export interface SetExport {
  exportVersion: string
  exportedAt: string
  set: CCGSet
}

// ── Simulation ───────────────────────────────────────────────────

export interface SimConfig {
  numPacks: number
  numIterations: number
  unitOfMeasure: 'pack' | 'box'
  seed: number | null
}

export interface RarityStats {
  rarityId: string
  mean: number
  median: number
  stdDev: number
  avgPerBox: number | null
  p5: number
  p95: number
  pZero: number // Probability of getting zero of this rarity across all packs
  distribution: number[] // Count per iteration: distribution[i] = total cards of this rarity in iteration i
  /**
   * Collectibility distributions indexed by copy threshold.
   * collectibility[t][i] = fraction of cards with >= (t+1) copies in iteration i.
   * e.g. collectibility[0] = distributions for "at least 1 copy", collectibility[1] = "at least 2 copies", etc.
   */
  collectibility: number[][]
}

export interface SimResult {
  setId: string
  config: SimConfig
  rarityStats: RarityStats[]
  totalPacks: number
  completedAt: string // ISO timestamp
}

// ── Coupon Collector ─────────────────────────────────────────────

export interface CouponCollectorConfig {
  targetRarityIds: string[]
  targetCopies: number
  numIterations: number
  seed: number | null
  byName: boolean // Track completion by card name (any rarity) instead of individual card ID
}

export interface CouponCollectorResult {
  setId: string
  config: CouponCollectorConfig
  rarityStats: RarityStats[] // per-rarity pull counts across all packs opened
  packsToComplete: {
    mean: number
    median: number
    stdDev: number
    p5: number
    p95: number
    min: number
    max: number
    distribution: number[] // packs needed per trial
  }
  completedAt: string
}

// ── Value Analyzer ───────────────────────────────────────────────

export interface RarityPricing {
  rarityId: string
  avgPrice: number // Average card price for this rarity
}

export interface CardPricing {
  cardId: string
  price: number
}

export interface ValueAnalyzerConfig {
  pricingMode: 'rarity' | 'card' // per-rarity average or per-card pricing
  rarityPrices: RarityPricing[]
  cardPrices: CardPricing[]
}

export interface EVResult {
  totalEVPerPack: number
  rarityContributions: {
    rarityId: string
    evPerPack: number
    avgCardsPerPack: number
    avgPrice: number
  }[]
  packsToBreakeven: number | null // null if EV >= pack price (always profitable)
  packEVDistribution: number[] // EV of each simulated pack
}

// ── Deck Acquisition ─────────────────────────────────────────────

export interface DeckTarget {
  cardName: string
  copies: number
}

export interface DeckAcquisitionConfig {
  targets: DeckTarget[]
  numIterations: number
  seed?: number | null
}

export interface DeckAcquisitionResult {
  mean: number
  median: number
  stdDev: number
  min: number
  max: number
  percentiles: { p5: number; p95: number }
  distribution: number[] // packs needed per iteration
  meanBoxes: number | null
}

// ── Sidebar / Folders ────────────────────────────────────────────

export interface SidebarFolder {
  id: string
  name: string
  parentFolderId: string | null
  collapsed: boolean
  childOrder: string[] // ordered IDs of children (sets and subfolders)
}

// ── UI ───────────────────────────────────────────────────────────

export type ActiveModule = 'composer' | 'simulator' | 'coupon-collector' | 'value-analyzer' | 'deck-acquisition'

export interface UIState {
  sidebarOpen: boolean
  activeModule: ActiveModule
}

// ── Constants ────────────────────────────────────────────────────

export const DEFAULT_RARITY_COLORS: Record<string, string> = {
  'Common': '#94a3b8',
  'Uncommon': '#22c55e',
  'Rare': '#3b82f6',
  'Mythic Rare': '#f97316',
  'Special': '#a855f7',
  'Foil': '#eab308',
  'Secret': '#a78bfa',
  'Serialized': '#f43f5e',
}
