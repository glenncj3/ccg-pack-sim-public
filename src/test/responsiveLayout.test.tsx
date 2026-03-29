import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { useStore } from '../store'
import App from '../App'
import { Sidebar } from '../components/sidebar/Sidebar'
import { SetComposer } from '../components/set-composer/SetComposer'
import { SimConfigPanel } from '../components/simulator/SimConfig'
import { CouponCollectorConfigPanel } from '../components/simulator/CouponCollectorConfig'
import { EVSummary } from '../components/value-analyzer/EVSummary'
import { SlotEditor } from '../components/set-composer/SlotEditor'
import { RarityEditor } from '../components/set-composer/RarityEditor'
import { CardList } from '../components/set-composer/CardList'
import type { CCGSet } from '../types'

// Minimal set for rendering pages that require an active set
const minimalSet = {
  id: 'test-set',
  name: 'Test Set',
  game: 'Test Game',
  packSize: 15,
  packsPerBox: null,
  packPrice: 0,
  rarities: [],
  factions: [],
  slots: [],
  cards: [],
  slotDividers: [],
  rarityDividers: [],
  noPackDuplicates: false,
  pityTimers: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('Phase 1: Layout Shell', () => {
  beforeEach(() => {
    useStore.setState({
      sets: [minimalSet],
      activeSetId: 'test-set',
      simResults: null,
      folders: [],
      sidebarRootOrder: ['test-set'],
      ui: { sidebarOpen: true, activeModule: 'composer' },
    })
  })

  it('main content area has responsive padding', () => {
    const { container } = render(<App />)
    const main = container.querySelector('main')
    expect(main?.className).toContain('px-3')
    expect(main?.className).toContain('md:px-6')
  })

  it('tab bar is horizontally scrollable', () => {
    const { container } = render(<App />)
    const tabBar = container.querySelector('.sticky.top-0')
    expect(tabBar?.className).toContain('overflow-x-auto')
  })

  it('sidebar uses fixed overlay classes for mobile when open', () => {
    const { container } = render(<Sidebar />)
    const aside = container.querySelector('aside')
    expect(aside?.className).toContain('fixed')
    expect(aside?.className).toContain('md:relative')
  })

  it('sidebar backdrop exists when open (mobile only)', () => {
    const { container } = render(<Sidebar />)
    const backdrop = container.querySelector('[data-testid="sidebar-backdrop"]')
    expect(backdrop).toBeTruthy()
    expect(backdrop?.className).toContain('md:hidden')
  })

  it('collapsed sidebar is hidden on mobile', () => {
    useStore.setState({
      ui: { sidebarOpen: false, activeModule: 'composer' },
    })
    const { container } = render(<Sidebar />)
    // The collapsed strip should have hidden md:flex
    const collapsed = container.firstElementChild
    expect(collapsed?.className).toContain('hidden')
    expect(collapsed?.className).toContain('md:flex')
  })

  it('hamburger button exists and is only visible on mobile', () => {
    useStore.setState({
      ui: { sidebarOpen: false, activeModule: 'composer' },
    })
    const { container } = render(<App />)
    const hamburger = container.querySelector('[data-testid="mobile-menu-btn"]')
    expect(hamburger).toBeTruthy()
    expect(hamburger?.className).toContain('md:hidden')
  })
})

describe('Phase 1: Page container max-width', () => {
  beforeEach(() => {
    useStore.setState({
      sets: [minimalSet],
      activeSetId: 'test-set',
      simResults: null,
      folders: [],
      sidebarRootOrder: ['test-set'],
      ui: { sidebarOpen: true, activeModule: 'composer' },
    })
  })

  for (const mod of ['composer', 'simulator', 'coupon-collector', 'value-analyzer', 'deck-acquisition'] as const) {
    it(`${mod} page has responsive max-width`, () => {
      useStore.setState({ ui: { sidebarOpen: true, activeModule: mod } })
      const { container } = render(<App />)
      const pageContainer = container.querySelector('.max-w-full.md\\:max-w-4xl')
      expect(pageContainer).toBeTruthy()
    })
  }
})

// ── Phase 2: Panel/Card Layouts ─────────────────────────────────

describe('Phase 2: Panel layouts collapse to single column on mobile', () => {
  beforeEach(() => {
    useStore.setState({
      sets: [minimalSet],
      activeSetId: 'test-set',
      simResults: null,
      folders: [],
      sidebarRootOrder: ['test-set'],
      ui: { sidebarOpen: true, activeModule: 'composer' },
    })
  })

  it('SetComposer top grid is single-column on mobile, two-column on md+', () => {
    const { container } = render(<SetComposer set={minimalSet as CCGSet} />)
    const grid = container.querySelector('.grid-cols-1.md\\:grid-cols-2')
    expect(grid).toBeTruthy()
  })

  it('SetMetadata form grid is single-column on mobile', () => {
    const { container } = render(<App />)
    // SetMetadata is inside SetComposer — find its inner grid
    const grids = container.querySelectorAll('.grid-cols-1.md\\:grid-cols-2')
    // Should have at least 2: SetComposer top + SetMetadata
    expect(grids.length).toBeGreaterThanOrEqual(2)
  })

  it('SimConfigPanel grid is single-column on mobile', () => {
    const noop = () => {}
    const { container } = render(
      <SimConfigPanel
        config={{ numPacks: 10, numIterations: 10000, unitOfMeasure: 'pack', seed: null }}
        hasBoxSize={false}
        onChange={noop}
      />
    )
    const grid = container.querySelector('.grid-cols-1.md\\:grid-cols-2')
    expect(grid).toBeTruthy()
  })

  it('CouponCollectorConfigPanel grid is single-column on mobile', () => {
    const noop = () => {}
    const { container } = render(
      <CouponCollectorConfigPanel
        config={{ targetRarityIds: [], targetCopies: 1, numIterations: 10000, seed: null, byName: false }}
        rarities={[]}
        onChange={noop}
      />
    )
    const grid = container.querySelector('.grid-cols-1.md\\:grid-cols-2')
    expect(grid).toBeTruthy()
  })

  it('DeckAcquisition config grid is single-column on mobile', () => {
    useStore.setState({
      sets: [{ ...minimalSet, cards: [{ id: 'c1', name: 'Card', rarityId: 'r1', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 }] }],
      activeSetId: 'test-set',
      ui: { sidebarOpen: true, activeModule: 'deck-acquisition' },
    })
    const { container } = render(<App />)
    const grid = container.querySelector('.grid-cols-1.md\\:grid-cols-2')
    expect(grid).toBeTruthy()
  })

  it('EVSummary stat cards are single-column on mobile, three-column on md+', () => {
    const mockResult = {
      totalEVPerPack: 5,
      packsToBreakeven: null,
      rarityContributions: [],
      packEVDistribution: [],
    }
    const mockSet = { ...minimalSet, packPrice: 4 } as CCGSet
    const { container } = render(<EVSummary result={mockResult} rarities={[]} set={mockSet} />)
    const grid = container.querySelector('.grid-cols-1.md\\:grid-cols-3')
    expect(grid).toBeTruthy()
  })
})

// ── Phase 3: Data Tables ────────────────────────────────────────

const setWithRaritiesAndSlots = {
  ...minimalSet,
  rarities: [
    { id: 'r1', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 10, factionId: null },
  ],
  slots: [
    { id: 's1', position: 1, label: '', isFoil: false, pool: [{ rarityId: 'r1', weight: 100 }] },
  ],
  cards: [
    { id: 'c1', name: 'Card A', rarityId: 'r1', factionId: null, setNumber: null, isFoilVariant: false, notes: null, relativeWeight: 1 },
  ],
} as CCGSet

describe('Phase 3: Data tables', () => {
  beforeEach(() => {
    useStore.setState({
      sets: [setWithRaritiesAndSlots],
      activeSetId: 'test-set',
      simResults: null,
      folders: [],
      sidebarRootOrder: ['test-set'],
      ui: { sidebarOpen: true, activeModule: 'composer' },
    })
  })

  it('RarityEditor table wrapper has overflow-x-auto', () => {
    const { container } = render(<RarityEditor set={setWithRaritiesAndSlots} />)
    const wrapper = container.querySelector('.overflow-x-auto')
    expect(wrapper).toBeTruthy()
  })

  it('RarityEditor does not use table-fixed', () => {
    const { container } = render(<RarityEditor set={setWithRaritiesAndSlots} />)
    const table = container.querySelector('table')
    expect(table?.className).not.toContain('table-fixed')
  })

  it('CardList table wrapper has overflow-x-auto', () => {
    const { container } = render(<CardList set={setWithRaritiesAndSlots} />)
    const wrapper = container.querySelector('.overflow-x-auto')
    expect(wrapper).toBeTruthy()
  })

  it('CardList filter input has responsive width', () => {
    const { container } = render(<CardList set={setWithRaritiesAndSlots} />)
    const filter = container.querySelector('input[placeholder="Filter cards..."]')
    expect(filter?.className).toContain('md:w-48')
  })

  it('SlotEditor slot label input has responsive width', () => {
    const { container } = render(<SlotEditor set={setWithRaritiesAndSlots} />)
    // Label input should be narrower on mobile, wider on desktop
    const labelInput = container.querySelector('input[placeholder="Label"]')
    expect(labelInput?.className).toContain('w-24')
    expect(labelInput?.className).toContain('md:w-40')
  })
})

// ── Phase 4: Touch & Polish ─────────────────────────────────────

describe('Phase 4: Responsive gaps and polish', () => {
  beforeEach(() => {
    useStore.setState({
      sets: [minimalSet],
      activeSetId: 'test-set',
      simResults: null,
      folders: [],
      sidebarRootOrder: ['test-set'],
      ui: { sidebarOpen: true, activeModule: 'composer' },
    })
  })

  it('SetComposer top grid has responsive gap', () => {
    const { container } = render(<SetComposer set={minimalSet as CCGSet} />)
    const grid = container.querySelector('.gap-2.md\\:gap-4')
    expect(grid).toBeTruthy()
  })

  it('SetMetadata grid has responsive gap', () => {
    const { container } = render(<App />)
    const grid = container.querySelector('.gap-2.md\\:gap-3')
    expect(grid).toBeTruthy()
  })

  it('SimConfigPanel grid has responsive gap', () => {
    const noop = () => {}
    const { container } = render(
      <SimConfigPanel
        config={{ numPacks: 10, numIterations: 10000, unitOfMeasure: 'pack', seed: null }}
        hasBoxSize={false}
        onChange={noop}
      />
    )
    const grid = container.querySelector('.gap-2.md\\:gap-4')
    expect(grid).toBeTruthy()
  })

  it('CouponCollectorConfigPanel grid has responsive gap', () => {
    const noop = () => {}
    const { container } = render(
      <CouponCollectorConfigPanel
        config={{ targetRarityIds: [], targetCopies: 1, numIterations: 10000, seed: null, byName: false }}
        rarities={[]}
        onChange={noop}
      />
    )
    const grid = container.querySelector('.gap-2.md\\:gap-4')
    expect(grid).toBeTruthy()
  })

  it('main content space-y is responsive', () => {
    const { container } = render(<App />)
    const pageContainer = container.querySelector('.space-y-4.md\\:space-y-6')
    expect(pageContainer).toBeTruthy()
  })
})
