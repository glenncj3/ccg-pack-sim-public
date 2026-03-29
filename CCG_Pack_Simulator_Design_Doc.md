# CCG Pack Simulator — Design Document & Phased Development Plan

**Version:** 0.2
**Status:** Ready for development — Phase 1
**Scope:** Web application for modeling collectible card game booster pack compositions and running statistical simulations

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Data Model](#2-core-data-model)
3. [Application Architecture](#3-application-architecture)
4. [Module Specifications](#4-module-specifications)
   - 4.1 Set Composer (Phase 1)
   - 4.2 Monte Carlo Simulator (Phase 1)
   - 4.3 Card Value Analyzer (Phase 2)
   - 4.4 Deck Acquisition Simulator (Phase 2)
   - 4.5 Collection Completion Tracker (Phase 3)
5. [Storage Strategy](#5-storage-strategy)
6. [CSV Specification](#6-csv-specification)
7. [UI/UX Structure](#7-uiux-structure)
8. [Phased Development Plan](#8-phased-development-plan)
9. [Open Questions & Future Considerations](#9-open-questions--future-considerations)

---

## 1. Project Overview

This application allows users to precisely model the booster pack structure of any collectible card game (CCG) expansion set, and then run a variety of mathematical simulations against that model to answer questions about probability, value, and acquisition cost.

The system is designed to be **game-agnostic**. Magic: The Gathering, Pokémon Pocket, One Piece, Lorcana, and any future CCG can be modeled using the same interface, as long as the user can define the set's compositional rules.

### Design Principles

- **Precision over simplicity.** Pack structure is modeled slot-by-slot with per-slot rarity weightings, not as global averages. This is the only way to faithfully represent games like Magic (where the rare slot is actually rare ~87.5% and mythic ~12.5%) or Pokémon Pocket (where slots 1-3 have different rules than slots 4-5).
- **Named cards are optional but unlocking.** The core data model works with rarity/faction counts alone, but uploading a card list with named cards unlocks more powerful simulations (e.g., "packs to pull 2 copies of a specific card").
- **Saved sets are first-class.** Users define a set once and reuse it across all simulation modules. Sets are persisted in browser localStorage and can be exported/imported as JSON.
- **All results are statistical, not deterministic.** Monte Carlo methods are used throughout. All outputs include mean, median, standard deviation, and distribution histograms.

---

## 2. Core Data Model

This section defines the canonical schema for all data in the application. Every module reads from and writes to this model.

### 2.1 Set Definition Schema

A **Set** is the top-level container for all information about one CCG expansion.

```
Set {
  id:                 UUID                    // Generated on creation
  name:               string                  // e.g., "Foundations", "Genetic Apex"
  game:               string                  // e.g., "Magic: The Gathering", "Pokémon Pocket"
  createdAt:          ISO timestamp
  updatedAt:          ISO timestamp

  packSize:           integer                 // Total cards per booster pack (e.g., 15 for MtG, 5 for Pocket)
  packsPerBox:        integer | null          // If null or 0, box-level analysis is hidden

  rarities:           Rarity[]               // Ordered list of all rarities in the set
  factions:           Faction[]              // Optional grouping (colors, types, etc.)
  slots:              Slot[]                 // One entry per card position in the pack
  cards:              Card[]                 // Empty unless CSV has been uploaded

  duplicateProtection: DuplicateProtection   // Pity timer / dupe rules
}
```

### 2.2 Rarity Schema

A **Rarity** represents one tier of card scarcity within a set. Rarity is the universal modeling primitive for all card print distinctions — foil variants, double-faced cards, faction-specific slots, and serialized cards are all modeled as distinct rarities rather than as special-case fields. This keeps the data model uniform and the UI consistent regardless of how exotic a set’s structure is.

The UI supports adding and removing rarities freely. There is no hard cap; the system must support at least 60 simultaneous rarities, though typical sets will use far fewer.

```
Rarity {
  id:                 UUID
  name:               string                  // e.g., "Common", "Foil Common", "Red Rare", "Serialized"
  shortCode:          string                  // e.g., "C", "FC", "RR" — used in slot editor pills
  color:              hex string              // For UI display (user-configurable)
  cardCount:          integer                 // Total distinct cards of this rarity in the set
  copiesPerSet:       integer | null          // If print sheet matters (optional, advanced)
  baseRarityId:       UUID | null             // See Rarity Aliasing below
  factionId:          UUID | null             // See Rarity Aliasing below
}
```

### 2.2.1 Rarity Aliasing

Some rarities are compound — they encode both a rarity tier and a faction in a single name. For example, a set with a dedicated faction slot might define "Red Rare", "Blue Rare", "Green Rare", etc. as distinct rarities in the slot model. However, for analytical purposes (deck acquisition, collection completion, card value), a user asking "how many packs to get a Red Rare card" should get the same answer whether the card came from the faction slot or from the standard rare slot.

To support this, rarities may optionally declare two aliasing fields:

- `baseRarityId` — points to the "pure" rarity this variant belongs to (e.g., "Red Rare" → "Rare"). Used to group compound rarities with their base tier in analysis modules.
- `factionId` — points to the Faction this rarity is associated with (e.g., "Red Rare" → "Red"). Used to filter cards by faction in analysis modules.

When both fields are set, the analysis layer can treat "Red Rare" and "Rare" as the same tier when querying cards of a given faction, unifying results across faction-slot and standard-slot pulls. This is the mechanism that allows future modules to answer "how many packs to get 4 copies of a specific Red Rare card" correctly, regardless of which slot produced it.

Aliasing is optional and purely analytical — it has no effect on simulation math, which always operates on the raw rarity as defined in the slot pool.

**Modeling conventions enabled by this approach:**
- **Foil variants** (e.g., "Foil Common"): a distinct rarity with `baseRarityId` pointing to "Common". Counted separately for collection completion.
- **Double-faced cards** (e.g., "DFC Common"): a distinct rarity only when the set has a dedicated DFC slot with fixed appearance rates. Otherwise modeled as standard Common. No effect on slot math.
- **Faction-slot rarities** (e.g., "Red Rare" in a faction-guarantee slot): distinct rarity with `baseRarityId` → "Rare" and `factionId` → "Red". The alias bridge ensures cross-slot queries work correctly in future modules.
- **Serialized variants** (e.g., "Serialized Rare"): a distinct rarity with a very low slot weight and `baseRarityId` → "Rare". Counted separately for collection purposes.

### 2.3 Faction Schema

A **Faction** is an optional grouping of cards (colors in MtG, types in Pokémon, etc.).

```
Faction {
  id:                 UUID
  name:               string                  // e.g., "Blue", "Fire", "Neutral"
  shortCode:          string
  color:              hex string
  cardCount:          integer                 // Total cards belonging to this faction
}
```

### 2.4 Slot Schema — Critical

This is the most important part of the model. A **Slot** represents one position in the booster pack. Slots are independent from one another. Each slot has a weighted pool of possible rarities, and when a pack is opened, each slot is resolved independently by sampling from its pool.

```
Slot {
  id:                 UUID
  position:           integer                 // 1-indexed position in pack (e.g., 1 through 15)
  label:              string                  // Optional label (e.g., "Rare/Mythic Slot", "Foil Slot")
  isFoil:             boolean                 // Cosmetic flag only; does not affect rarity math
  pool:               SlotRarityWeight[]      // Must sum to exactly 100%
}

SlotRarityWeight {
  rarityId:           UUID                    // References Rarity.id
  weight:             float                   // Percentage (e.g., 87.5 for rare, 12.5 for mythic)
}
```

**Validation Rule:** For every Slot, `sum(pool[i].weight)` must equal exactly 100.0. The UI will enforce this in real time and block saving if violated.

**Example — MtG Slot 15 (Rare/Mythic):**
```
pool: [
  { rarityId: "rare-uuid",   weight: 87.5 },
  { rarityId: "mythic-uuid", weight: 12.5 }
]
```

**Example — Pokémon Pocket Slot 5 (Rare hits only):**
```
pool: [
  { rarityId: "diamond1-uuid", weight: 0.0 },
  { rarityId: "diamond2-uuid", weight: 0.0 },
  ...
  { rarityId: "crown-uuid",    weight: 0.04 },
  ...
]
```
(All weights sum to 100.)

### 2.5 Card Schema (CSV-sourced)

Cards are only present if the user has uploaded a CSV. The simulation engine functions without cards, but some modules require them.

```
Card {
  id:                 UUID
  name:               string
  rarityId:           UUID                    // References Rarity.id
  factionId:          UUID | null             // References Faction.id
  setNumber:          string | null           // e.g., "147/291"
  isFoilVariant:      boolean                 // True if this card is a foil-only print
  notes:              string | null
}
```

### 2.6 Duplicate Protection Schema

```
DuplicateProtection {
  enabled:            boolean                 // Default: false
  pityTimer: {
    enabled:          boolean
    rarityId:         UUID                    // Which rarity triggers the pity rule
    afterNPacks:      integer                 // Guaranteed after N packs without one
  } | null
  noPackDuplicates:   boolean                 // No two identical cards in same pack
  noBoxDuplicates:    boolean                 // No duplicates across a box (requires packsPerBox)
}
```

---

## 3. Application Architecture

### 3.1 Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React (with hooks) | Component model suits the tabbed multi-module UI |
| Styling | Tailwind CSS | Utility-first; fast iteration; no design system needed |
| Charting | Chart.js via react-chartjs-2 | Canvas-based renderer handles large histogram datasets smoothly; clean dark theme support via global defaults object; see Section 3.3 |
| State | Zustand (global store) | Lightweight; excellent TypeScript support; localStorage sync is trivial |
| Storage | localStorage + JSON export | No backend required; portable; shareable via file |
| Build | Vite | Fast dev server; minimal config |
| Language | TypeScript | Required given the complexity of the data model |

### 3.2 Visual Design System

The application uses a **dark UI with warm accent colors** — dark backgrounds that create a premium, low-fatigue environment for long analytical sessions, accented with amber/gold tones that evoke the physical card game world rather than a finance dashboard. Rarity colors are a core part of the visual language and appear consistently across the slot editor pills, chart series, and result tables.

#### Color Palette

| Role | Token | Value | Usage |
|---|---|---|---|
| Background primary | `--bg-primary` | `#0f1117` | Page background, main surfaces |
| Background secondary | `--bg-secondary` | `#1a1d27` | Cards, panels, sidebars |
| Background tertiary | `--bg-tertiary` | `#22263a` | Input fields, hover states |
| Border | `--border` | `#2e3348` | All borders and dividers |
| Text primary | `--text-primary` | `#e8e9f0` | Headings, labels, values |
| Text secondary | `--text-secondary` | `#8b90a8` | Supporting text, placeholders |
| Accent gold | `--accent-gold` | `#f0b429` | Primary CTA buttons, active states, highlights |
| Accent gold muted | `--accent-gold-muted` | `#3d2e08` | Subtle gold backgrounds (badges, active nav) |
| Success | `--success` | `#34d399` | Validation pass, sum = 100% indicators |
| Danger | `--danger` | `#f87171` | Validation errors, sum ≠ 100% indicators |

#### Rarity Color System

Rarity colors are user-configurable per set but ship with sensible defaults that are consistent across the entire app. These defaults are baked into the preset set templates and used as fallbacks when a user creates a new rarity without assigning a color.

| Rarity tier | Default color | Hex |
|---|---|---|
| Common | Slate gray | `#94a3b8` |
| Uncommon | Emerald green | `#34d399` |
| Rare | Sky blue | `#60a5fa` |
| Mythic Rare | Amber/orange | `#f59e0b` |
| Special / Secret | Deep violet | `#a78bfa` |
| Foil variant | Teal (italicized label) | `#2dd4bf` |
| Serialized | Crimson | `#f43f5e` |

These colors appear in: slot editor pills, proportional bar segments, chart.js dataset series colors, summary table rarity column headers, and CSV import confirmation summaries. The rarity color is always the user-configured `Rarity.color` value — never hardcoded in a component.

#### Chart.js Dark Theme Configuration

All Chart.js charts share a single global defaults object initialized at app startup. This ensures consistent theming across every chart in the application without per-chart configuration.

```typescript
// src/lib/chartDefaults.ts — imported once in main.tsx
import { Chart, defaults } from 'chart.js';

export function applyChartDefaults() {
  defaults.color = '#8b90a8';               // axis labels, legend text
  defaults.borderColor = '#2e3348';         // grid lines
  defaults.backgroundColor = 'transparent';
  defaults.font.family = 'Inter, sans-serif';
  defaults.font.size = 12;
  defaults.plugins.tooltip.backgroundColor = '#1a1d27';
  defaults.plugins.tooltip.borderColor = '#2e3348';
  defaults.plugins.tooltip.borderWidth = 1;
  defaults.plugins.tooltip.titleColor = '#e8e9f0';
  defaults.plugins.tooltip.bodyColor = '#8b90a8';
  defaults.plugins.legend.labels.color = '#8b90a8';
}
```

#### Chart.js Wrapper Pattern

Chart.js is never used directly in module components. Every chart type is encapsulated in a thin wrapper component in `src/components/charts/`. This isolates Chart.js from the rest of the app, keeps module code clean, and means the charting library can be swapped with no changes outside the `charts/` directory.

```
src/components/charts/
  ├── RarityHistogram.tsx       // Distribution histogram for Monte Carlo output
  ├── RarityBarSummary.tsx      // Average cards per rarity — bar chart
  ├── EVBreakdownChart.tsx      // Phase 2: expected value by rarity
  └── PacksToCompletionChart.tsx // Phase 3: completion curve
```

Each wrapper component accepts typed props (rarity data, simulation results, color maps) and owns all Chart.js registration, dataset construction, and option configuration internally. Module components call them like:

```tsx
<RarityHistogram
  results={simResults}
  rarities={activeSet.rarities}
  targetRarity={selectedRarity}
/>
```

### 3.3 Module Map

```
App
├── Sidebar / Nav
│   ├── Set Library (saved sets)
│   └── Module navigation (per active set)
│
├── Module: Set Composer          [Phase 1]
│   ├── Rarity Editor
│   ├── Faction Editor
│   ├── Slot Matrix Editor
│   ├── Box Config
│   ├── Duplicate Protection Toggle
│   └── CSV Uploader
│
├── Module: Monte Carlo Simulator [Phase 1]
│   ├── Sim Config (N packs, iterations)
│   ├── Results: Summary Table
│   ├── Results: Distribution Histograms
│   └── Results: Box-level summary (if packsPerBox set)
│
├── Module: Card Value Analyzer   [Phase 2]
│   ├── Pack Price Input
│   ├── Expected Value per Rarity
│   └── EV Breakeven Analysis
│
├── Module: Deck Acquisition Sim  [Phase 2]
│   ├── Deck Builder (select named cards from CSV)
│   ├── Copy count per card
│   └── Sim: packs/boxes to complete deck
│
└── Module: Collection Completion [Phase 3]
    ├── % of set to complete
    └── Sim: packs to finish set (with diminishing returns)
```

### 3.4 State Management

The global store holds:
- `sets: Set[]` — all saved sets (synced to localStorage)
- `activeSetId: UUID | null` — currently selected set
- `simResults: SimResult | null` — most recent simulation output
- `ui: UIState` — sidebar open/closed, active module, etc.

The active set flows down to all modules as a prop or context value. No module mutates the set directly — changes go through store actions, which also handle localStorage sync.

---

## 4. Module Specifications

### 4.1 Module: Set Composer (Phase 1)

**Purpose:** Define the complete structural composition of one CCG expansion set.

**Sub-sections:**

#### 4.1.1 Set Metadata
- Fields: `name`, `game`, `packSize`, `packsPerBox`
- `packsPerBox` defaults to blank; if empty or 0, box-level stats are hidden throughout the app

#### 4.1.2 Rarity Editor
An editable table where the user defines all rarities for the set.

| Column | Type | Notes |
|---|---|---|
| Name | text | e.g., "Mythic Rare" |
| Short Code | text (≤4 chars) | e.g., "M" |
| Card Count | integer | Number of distinct cards |
| Color | color picker | For UI display |

Rows can be added, deleted, and reordered. Order determines how rarities appear in the Slot Matrix.

#### 4.1.3 Slot Editor

Slots are presented as a vertical list of **slot cards** rather than a flat grid. Each slot card shows its position number, an optional label, a set of colored **rarity pills** summarizing its weight distribution at a glance, and a compact proportional bar visualization. An "Edit" button opens an inline popover directly below the card.

**Slot card (closed state):**
- Slot number and optional label (e.g., "Rare / mythic", "Foil common")
- Rarity pills — one per non-zero rarity, showing name and percentage (e.g., a blue "Rare 87.5%" pill and an amber "Mythic 12.5%" pill). Zero-weight rarities are omitted from the pill display entirely.
- A segmented proportional bar (color-coded by rarity) giving an instant visual read of the slot's distribution
- An "Edit" button

**Slot card (edit/open state):**
- The card row highlights with a colored border
- An inline popover drops below the card containing one input row per rarity: a color swatch, rarity name, a number input (float, 0–100), a "%" label, and a mini proportional bar that fills live as the user types
- A live validation indicator ("Weights sum to 100%" in green, or the current total in red if not) lives at the bottom of the popover
- "Save slot" and "Cancel" buttons confirm or discard changes

Only one slot popover is open at a time. Opening a second slot auto-closes the first (with a discard-changes confirmation if the open slot has unsaved edits).

**Identical slot grouping:** Consecutive slots with identical rarity distributions are automatically collapsed into a single grouped row (e.g., "Slots 1–10 · Common 100%") with an "Expand" affordance. Expanding replaces the group with individual slot rows. This is especially valuable for long packs where most positions are uniform commons.

**Section dividers:** The slot list supports optional labeled dividers between logical groups of slots (e.g., "Common slots", "Uncommon slots", "Rare / mythic slot"). These are purely cosmetic and do not affect simulation logic.

**Known tradeoff:** The slot card view does not allow scanning an entire rarity column at once — you cannot immediately see "which slots can produce a Mythic?" without opening each card. This is an acceptable tradeoff for the gains in clarity and scannability for the common case. A future "column scan" mode (e.g., click a rarity in the legend to highlight all slots that carry it) can address this in a later phase.

#### 4.1.4 Duplicate Protection Panel
A collapsible panel below the slot editor. Toggled off by default.

- Toggle: `noPackDuplicates` (no two identical cards in one pack)
- Toggle: `noBoxDuplicates` (no duplicates across a full box — requires packsPerBox > 0)
- Pity Timer sub-panel:
  - Select rarity
  - Input N (guaranteed after N packs without one)

#### 4.1.5 CSV Uploader
A drag-and-drop upload zone. Accepts `.csv` files matching the spec in Section 6.

On successful upload:
- Parses and validates the CSV against the currently defined rarities (warns on mismatches)
- Populates `Set.cards[]`
- Shows a summary: "291 cards loaded — 101 Common, 80 Uncommon, 60 Rare, 36 Uncommon, 14 Mythic"

The CSV is not required to use the Set Composer or Monte Carlo Simulator. It is required for named-card simulations in later modules.

#### 4.1.6 Save & Export
- **Save to Library:** Persists to localStorage under the set's UUID
- **Export JSON:** Downloads the full Set object as a `.json` file
- **Import JSON:** Loads a previously exported set file
- **Duplicate Set:** Creates a copy for editing (useful for modeling variant rules)

---

### 4.2 Module: Monte Carlo Simulator (Phase 1)

**Purpose:** Simulate opening N booster packs and report the statistical distribution of outcomes.

**Inputs:**

| Field | Type | Default | Notes |
|---|---|---|---|
| Number of packs | integer | 100 | Per simulation run |
| Number of iterations | integer | 10,000 | How many times to run the sim |
| Unit of measure | select | Pack | "Pack" or "Box" (Box only shown if packsPerBox > 0) |
| Seed (optional) | integer | random | For reproducible results |

#### 4.2.1 Simulation Algorithm

```
function openPack(set):
  result = {}
  for each slot in set.slots:
    rarity = weightedRandom(slot.pool)
    card = drawCard(set, rarity, result, set.duplicateProtection)
    result[slot.position] = card
  return result

function runSimulation(set, numPacks, numIterations):
  allRuns = []
  for i in 1..numIterations:
    packResults = []
    pityCounts = {}  // per rarity
    for p in 1..numPacks:
      packResult = openPack(set)
      // apply pity timer adjustments
      // apply box duplicate tracking if applicable
      packResults.push(packResult)
    allRuns.push(aggregate(packResults))
  return computeStatistics(allRuns)
```

**Weighted random selection** uses the alias method (O(1) per draw) for performance. With 10,000 iterations × 100 packs × 15 slots = 15,000,000 random draws, performance matters.

**Draw without replacement** (for duplicate protection): The simulator maintains a per-pack or per-box pool of available cards within each rarity tier. When a slot resolves to a rarity, a card is drawn from that rarity's pool without replacement (if `noPackDuplicates` or `noBoxDuplicates` is enabled). The pool resets between packs (or between boxes).

**Pity timer:** A counter tracks how many consecutive packs have not produced a card of the pity rarity. If the counter reaches `afterNPacks`, the next pack's qualifying slot forces that rarity regardless of its weighted roll.

#### 4.2.2 Output — Summary Table

Per rarity, across all iterations of the requested pack count:

| Rarity | Avg / Pack | Avg / Box | Mean Total | Median | Std Dev | Min | Max |
|---|---|---|---|---|---|---|---|
| Common | 10.00 | 360 | 1,000 | 1,000 | 0 | 1,000 | 1,000 |
| Uncommon | 3.00 | 108 | 300 | 299 | 4.2 | 284 | 318 |
| Rare | 0.875 | 31.5 | 87.5 | 87 | 6.1 | 69 | 108 |
| Mythic | 0.125 | 4.5 | 12.5 | 12 | 3.1 | 4 | 24 |

"Avg / Box" column is hidden if `packsPerBox` is not set.

#### 4.2.3 Output — Distribution Histograms

One histogram per rarity showing: across all iterations, how many times did you get X cards of this rarity when opening N packs?

- X axis: card count
- Y axis: frequency (number of iterations)
- Overlaid vertical lines: mean, median, ±1 std dev
- User can toggle between "count" and "probability" on Y axis

#### 4.2.4 Output — Slot Breakdown (Expandable)

An expandable table showing which rarity was drawn per slot position across all simulations. Useful for verifying that the slot configuration was entered correctly.

#### 4.2.5 Output — Box Summary (if applicable)

If `packsPerBox > 0`, a separate summary card shows: per box, expected distribution of each rarity, including pity timer effects if enabled.

#### 4.2.6 Export Results

- Export as CSV (summary table)
- Export as PNG (histograms)
- Copy results as formatted text (for Discord/Reddit sharing)

---

### 4.3 Module: Card Value Analyzer (Phase 2)

**Purpose:** Given a pack price, estimate the monetary expected value (EV) contributed by each rarity tier.

**Key inputs:**
- Pack price (currency, user-specified)
- Card price per rarity (user can assign average market prices per rarity tier, or per named card if CSV is loaded)

**Key outputs:**
- EV per pack by rarity contribution
- EV breakeven analysis: how many packs until expected card value equals pack cost?
- Distribution of "pack EV" across iterations (since variance is high for rare/mythic slots)

---

### 4.4 Module: Deck Acquisition Simulator (Phase 2)

**Purpose:** Given a target decklist, simulate how many packs it takes on average to pull the required cards.

**Requirements:**
- Requires named card list (CSV uploaded)
- User selects cards and required copy counts from a searchable list
- Simulator runs Monte Carlo: opening packs until all required copies are found
- Output: average packs, median packs, percentile distribution (p10, p25, p50, p75, p90)
- Optionally include box count if `packsPerBox` is set

**Design note:** This module is the primary motivation for requiring named cards in the CSV. Without card names, we can only model rarity outcomes, not specific card pulls.

---

### 4.5 Module: Collection Completion (Phase 3)

**Purpose:** Model the "set completion problem" — how many packs to collect one (or more) copies of every card in the set?

- Classic coupon collector's problem, complicated by:
  - Multiple cards per rarity tier
  - Non-uniform slot weights
  - Duplicate protection rules
  - Optional: "I already own X cards" (partial collection input)
- Output: expected packs to completion, P50/P90 curves, "diminishing returns" visualization showing how fast the last 10% of the set is vs. the first 90%

---

## 5. Storage Strategy

### 5.1 Primary Storage: Browser localStorage

All saved sets are stored in `localStorage` under the key `ccg_simulator_sets`. The value is a JSON-serialized array of `Set` objects.

```
localStorage["ccg_simulator_sets"] = JSON.stringify([Set, Set, ...])
```

**Limits:** localStorage is typically capped at 5–10 MB. A fully defined set (with card list of ~300 cards) serializes to approximately 30–80 KB. This supports 60–300 saved sets comfortably.

### 5.2 Portability: JSON Export/Import

Any set can be exported as a `.json` file containing the full Set object. This serves as:
- A backup mechanism
- A sharing mechanism (send the file to another user)
- A migration path if the app moves to a backend in the future

**Export format:** Prettified JSON with a version field for forward compatibility:
```json
{
  "exportVersion": "1.0",
  "exportedAt": "2025-03-28T12:00:00Z",
  "set": { ... }
}
```

### 5.3 Future: Cloud Sync (Phase 3+)

If user accounts are added later, the storage layer should be abstracted behind a `StorageAdapter` interface that can be swapped between localStorage and a REST API without changing module code.

---

## 6. CSV Specification

When uploading named card data, the CSV must conform to the following format.

### 6.1 Required Columns

| Column Name | Type | Description |
|---|---|---|
| `name` | string | Card name |
| `rarity` | string | Must match a Rarity `name` or `shortCode` defined in the set |

### 6.2 Optional Columns

| Column Name | Type | Description |
|---|---|---|
| `faction` | string | Must match a Faction `name` or `shortCode` if factions are defined |
| `setNumber` | string | Collector number (e.g., "147/291") |
| `isFoilVariant` | boolean | "true"/"false" — marks foil-only prints |
| `notes` | string | Free text |

### 6.3 Parsing Rules

- First row is always treated as a header
- Column names are case-insensitive and trimmed
- Extra columns are ignored
- Rows with missing `name` or `rarity` are skipped with a warning
- Rarity values are matched first by `shortCode`, then by `name` (case-insensitive)
- A validation summary is shown before confirming the import: "291 cards parsed. 3 rows skipped (unrecognized rarity). Proceed?"

### 6.4 Example CSV (MtG-style)

```csv
name,rarity,faction,setNumber
Lightning Bolt,C,Red,141/291
Counterspell,C,Blue,44/291
Swords to Plowshares,C,White,39/291
Llanowar Elves,C,Green,186/291
Dark Ritual,C,Black,102/291
Brainstorm,U,Blue,45/291
...
Volcanic Island,R,Red,291/291
Black Lotus,M,Colorless,4/291
```

---

## 7. UI/UX Structure

### 7.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  CCG Pack Simulator          [Set Library ▾]    │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  Sidebar     │  Main Content Area                      │
│              │                                          │
│  Active Set: │  [Module Tabs]                          │
│  Foundations │  Set Composer | Monte Carlo | ...       │
│              │  ─────────────────────────────          │
│  [Modules]   │  [Active Module Content]                │
│  ▸ Composer  │                                          │
│  ▸ Monte     │                                          │
│    Carlo     │                                          │
│  ▸ Value     │                                          │
│    (Phase 2) │                                          │
│              │                                          │
│  [+ New Set] │                                          │
│  [Import]    │                                          │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### 7.2 Key UX Principles

- **Active set is always visible.** The set name appears in the sidebar header. Switching sets mid-simulation clears sim results with a confirmation prompt.
- **Validation is inline, not modal.** Slot weight errors appear as inline red indicators on the row, not popup alerts.
- **Simulation progress is visible.** A progress bar shows Monte Carlo iteration progress. For large simulations (10k iterations), this prevents the UI from feeling frozen.
- **Results persist until re-run.** Navigating away from the Monte Carlo module and returning shows the last results. A "Re-run" button refreshes.
- **Mobile is secondary.** The app is designed for desktop-first. The slot card editor adapts reasonably to medium-width viewports, but narrow mobile screens require a condensed editing paradigm deferred to Phase 3.

---

## 8. Phased Development Plan

### Phase 1 — Core Engine (Current Scope)

**Goal:** Ship a fully functional set composer and Monte Carlo simulator.

| # | Task | Notes |
|---|---|---|
| 1.1 | Data model + TypeScript types | All schemas from Section 2 |
| 1.2 | Global store (Zustand) + localStorage sync | Section 5.1 |
| 1.3 | Rarity Editor UI | Section 4.1.2 |
| 1.4 | Slot card editor UI | Section 4.1.3 — slot cards with pill display, inline popovers, identical-slot grouping |
| 1.5 | Set metadata form | Pack size, box size, game name |
| 1.6 | Duplicate Protection panel | Section 4.1.4 |
| 1.7 | CSV uploader + parser | Section 6 |
| 1.8 | Save / Export / Import | Section 5.2 |
| 1.9 | Set Library sidebar | List, select, duplicate, delete sets |
| 1.10 | Monte Carlo engine (worker thread) | Section 4.2.1 — run in Web Worker to avoid UI freeze |
| 1.11 | Sim config UI | Pack count, iterations, seed |
| 1.12 | Results: Summary table | Section 4.2.2 |
| 1.13 | Results: Histograms (Chart.js via RarityHistogram wrapper) | Section 4.2.3; Section 3.2 chart wrapper pattern |
| 1.14 | Results: Slot breakdown (expandable) | Section 4.2.4 |
| 1.15 | Results: Box summary | Section 4.2.5 |
| 1.16 | Export results (CSV + PNG) | Section 4.2.6 |
| 1.17 | Preset sets (MtG, Pokémon Pocket) | Bundled templates to reduce friction |

**Phase 1 Deliverable:** A fully functional React app (Vite build) that can be opened in a browser with no backend. All data persists in localStorage.

---

### Phase 2 — Value & Deck Analysis

**Goal:** Add the card value and deck acquisition modules.

| # | Task | Notes |
|---|---|---|
| 2.1 | Value Analyzer: price input per rarity | Section 4.3 |
| 2.2 | Value Analyzer: EV per pack calculation | |
| 2.3 | Value Analyzer: breakeven visualization | |
| 2.4 | Deck Acquisition: card selector UI | Requires named cards from CSV |
| 2.5 | Deck Acquisition: sim engine | Extension of Monte Carlo engine |
| 2.6 | Deck Acquisition: percentile output | p10/p25/p50/p75/p90 |
| 2.7 | Faction-level analysis | Filter Monte Carlo results by faction |

---

### Phase 3 — Completion & Infrastructure

**Goal:** Collection completion module, cloud sync groundwork, mobile improvements.

| # | Task | Notes |
|---|---|---|
| 3.1 | Collection Completion sim | Section 4.5 |
| 3.2 | Partial collection input | "I already own these cards" |
| 3.3 | StorageAdapter abstraction | Prep for cloud sync |
| 3.4 | Optional: user accounts + cloud storage | Requires backend |
| 3.5 | Mobile-responsive slot card editor | Condensed editing paradigm for small screens; slot cards collapse further on narrow viewports |
| 3.6 | Set sharing via URL | Encode set as URL-safe compressed string |

---

## 9. Open Questions & Future Considerations

### Resolved Design Decisions

- **Foil variants:** Foil Common, Foil Rare, etc. are distinct rarities. A "Foil Common" is a separate rarity from "Common" and counted independently for collection completion. The rarity system supports as many foil variants as needed. Each may declare `baseRarityId` pointing to its non-foil counterpart for analytical grouping.
- **Double-faced cards:** DFC status does not affect slot math by default. If a set has a dedicated DFC slot with fixed appearance rates, the user models it as a distinct rarity (e.g., "DFC Common") for that slot. Otherwise, DFCs are entered as standard cards under their printed rarity.
- **Faction-weighted slot draws:** Modeled as compound rarities (e.g., "Red Rare", "Blue Rare"). Each faction-specific rarity is assigned to the relevant slot at the appropriate weight. The `baseRarityId` and `factionId` aliasing fields on the Rarity schema ensure that future analysis modules can correctly unify "Red Rare from the faction slot" and "Rare that happens to be Red from the standard slot" when answering faction-filtered queries. See Section 2.2.1.
- **Serialized/numbered variants:** Modeled as a distinct rarity (e.g., "Serialized Rare") with a very low slot weight and `baseRarityId` pointing to the base rarity. Counted separately for collection purposes.

### Rarity Aliasing — Implementation Note for Future Modules

When a future module (deck acquisition, collection completion, value analysis) accepts user input like "I need 2 copies of a Red Rare card," the query must resolve correctly whether that card is obtained from a faction-specific slot (rarity: "Red Rare") or a standard rare slot (rarity: "Rare", faction: Red). The aliasing bridge — `baseRarityId` + `factionId` on the Rarity schema — is the mechanism for this. Module builders must query against both the compound rarity and any base rarity whose faction matches, rather than filtering on rarity name alone. This convention must be documented in the developer guide when Phase 2 begins.

### Potential Future Modules

- **Trade Calculator:** Given two collections, compute a fair trade based on EV.
- **Set Comparison:** Compare EV, completion cost, and mythic rate across multiple sets side by side.
- **Pull Rate Tracker:** User inputs actual pulls; app compares against expected rates (chi-squared goodness of fit test).
- **Prerelease Sealed Sim:** Simulate sealed pool generation (6 packs) and assess deck-building probability of getting a playable curve by color.
