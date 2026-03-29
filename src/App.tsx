import { type ReactNode } from 'react'
import { Layers, PackageOpen, BookOpen, Spade, DollarSign, Menu } from 'lucide-react'
import { useStore } from './store'
import { Sidebar } from './components/sidebar/Sidebar'
import { SetComposer } from './components/set-composer/SetComposer'
import { Simulator } from './components/simulator/Simulator'
import { ValueAnalyzer } from './components/value-analyzer/ValueAnalyzer'
import { DeckAcquisition } from './components/deck-acquisition/DeckAcquisition'
import { CouponCollector } from './components/simulator/CouponCollector'

function App() {
  const ui = useStore((s) => s.ui)
  const sets = useStore((s) => s.sets)
  const activeSetId = useStore((s) => s.activeSetId)
  const activeSet = sets.find((s) => s.id === activeSetId) ?? null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-3 md:px-6 pb-6 bg-bg-primary">
        {!activeSet ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-text-secondary">
              <button
                data-testid="mobile-menu-btn"
                onClick={() => useStore.getState().toggleSidebar()}
                className="md:hidden mb-4 text-text-secondary hover:text-accent-gold"
              >
                <Menu size={24} />
              </button>
              <h2 className="text-2xl font-semibold text-text-primary mb-2">
                CCG Pack Simulator
              </h2>
              <p>Select a set from the sidebar or create a new one to get started.</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="sticky top-0 z-10 bg-bg-primary flex gap-1 border-b border-border -mx-3 px-3 md:-mx-6 md:px-6 pt-6 overflow-x-auto">
              <button
                data-testid="mobile-menu-btn"
                onClick={() => useStore.getState().toggleSidebar()}
                className="md:hidden px-2 py-2 text-text-secondary hover:text-accent-gold -mb-px flex items-center"
              >
                <Menu size={18} />
              </button>
              <TabButton
                label="Structure"
                icon={<Layers size={14} />}
                active={ui.activeModule === 'composer'}
                onClick={() => useStore.getState().setActiveModule('composer')}
              />
              <TabButton
                label="Packs"
                icon={<PackageOpen size={14} />}
                active={ui.activeModule === 'simulator'}
                onClick={() => useStore.getState().setActiveModule('simulator')}
              />
              <TabButton
                label="Collecting"
                icon={<BookOpen size={14} />}
                active={ui.activeModule === 'coupon-collector'}
                onClick={() => useStore.getState().setActiveModule('coupon-collector')}
              />
              <TabButton
                label="Decks"
                icon={<Spade size={14} />}
                active={ui.activeModule === 'deck-acquisition'}
                onClick={() => useStore.getState().setActiveModule('deck-acquisition')}
              />
              <TabButton
                label="Value"
                icon={<DollarSign size={14} />}
                active={ui.activeModule === 'value-analyzer'}
                onClick={() => useStore.getState().setActiveModule('value-analyzer')}
              />
            </div>
            <p className="text-xs text-text-secondary/60 pt-4 pb-3">
              {ui.activeModule === 'composer' && 'Define your set\u2019s rarities, pack slots, and card list.'}
              {ui.activeModule === 'simulator' && 'Simulate opening packs to see pull rate distributions.'}
              {ui.activeModule === 'coupon-collector' && 'Estimate how many packs to complete a full set.'}
              {ui.activeModule === 'deck-acquisition' && 'Estimate how many packs to pull specific cards for a deck.'}
              {ui.activeModule === 'value-analyzer' && 'Calculate expected pack value from card market prices.'}
            </p>
            {ui.activeModule === 'composer' && <SetComposer set={activeSet} />}
            {ui.activeModule === 'simulator' && <Simulator set={activeSet} />}
            {ui.activeModule === 'coupon-collector' && <CouponCollector set={activeSet} />}
            {ui.activeModule === 'value-analyzer' && <ValueAnalyzer set={activeSet} />}
            {ui.activeModule === 'deck-acquisition' && <DeckAcquisition set={activeSet} />}
          </div>
        )}
      </main>
    </div>
  )
}

function TabButton({ label, icon, active, onClick }: { label: string; icon?: ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-t transition-colors -mb-px flex items-center gap-1.5 whitespace-nowrap ${
        active
          ? 'bg-bg-secondary text-accent-gold border border-border border-b-bg-secondary'
          : 'text-text-secondary hover:text-text-primary border border-transparent'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

export default App
