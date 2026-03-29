import { v4 as uuidv4 } from 'uuid'
import type { CCGSet } from '../types'
import { parseCardCSV } from './csvParser'

export async function createPokemonPocketPreset(): Promise<CCGSet> {
  const now = new Date().toISOString()
  // Shared cards (appear in all sub-set packs)
  const sharedOneDiamondId = uuidv4()
  const sharedTwoDiamondId = uuidv4()
  const sharedGoldCrownId = uuidv4()
  // Exclusive cards (specific to one sub-set pack)
  const exclOneDiamondId = uuidv4()
  const exclTwoDiamondId = uuidv4()
  const exclThreeDiamondId = uuidv4()
  const exclFourDiamondId = uuidv4()
  const exclOneStarId = uuidv4()
  const exclTwoStarId = uuidv4()
  const exclThreeStarId = uuidv4()

  const slots = []
  // Slots 1-3: Shared + Exclusive One Diamond
  for (let i = 1; i <= 3; i++) {
    slots.push({
      id: uuidv4(),
      position: i,
      label: i === 1 ? 'One Diamond' : '',
      isFoil: false,
      pool: [
        { rarityId: exclOneDiamondId, weight: 46.154 },
        { rarityId: sharedOneDiamondId, weight: 53.846 },
      ],
    })
  }
  // Slot 4
  slots.push({
    id: uuidv4(),
    position: 4,
    label: 'Slot 4',
    isFoil: false,
    pool: [
      { rarityId: exclTwoDiamondId, weight: 46.364 },
      { rarityId: sharedTwoDiamondId, weight: 43.636 },
      { rarityId: sharedGoldCrownId, weight: 0.04 },
      { rarityId: exclThreeDiamondId, weight: 5 },
      { rarityId: exclFourDiamondId, weight: 1.666 },
      { rarityId: exclOneStarId, weight: 2.572 },
      { rarityId: exclTwoStarId, weight: 0.5 },
      { rarityId: exclThreeStarId, weight: 0.222 },
    ],
  })
  // Slot 5
  slots.push({
    id: uuidv4(),
    position: 5,
    label: 'Slot 5',
    isFoil: false,
    pool: [
      { rarityId: exclTwoDiamondId, weight: 30.909 },
      { rarityId: sharedTwoDiamondId, weight: 29.091 },
      { rarityId: sharedGoldCrownId, weight: 0.16 },
      { rarityId: exclThreeDiamondId, weight: 20 },
      { rarityId: exclFourDiamondId, weight: 6.664 },
      { rarityId: exclOneStarId, weight: 10.288 },
      { rarityId: exclTwoStarId, weight: 2 },
      { rarityId: exclThreeStarId, weight: 0.888 },
    ],
  })

  const rarities = [
      { id: exclOneDiamondId, name: 'Exclusive One Diamond', shortCode: '1◆', color: '#b0bec5', cardCount: 24, factionId: null },
      { id: exclTwoDiamondId, name: 'Exclusive Two Diamond', shortCode: '2◆', color: '#66bb6a', cardCount: 17, factionId: null },
      { id: exclThreeDiamondId, name: 'Exclusive Three Diamond', shortCode: '3◆', color: '#60a5fa', cardCount: 14, factionId: null },
      { id: exclFourDiamondId, name: 'Exclusive Four Diamond', shortCode: '4◆', color: '#a78bfa', cardCount: 5, factionId: null },
      { id: exclOneStarId, name: 'Exclusive One Star', shortCode: '1★', color: '#f59e0b', cardCount: 8, factionId: null },
      { id: exclTwoStarId, name: 'Exclusive Two Star', shortCode: '2★', color: '#8b5cf6', cardCount: 10, factionId: null },
      { id: exclThreeStarId, name: 'Exclusive Three Star', shortCode: '3★', color: '#ec4899', cardCount: 1, factionId: null },
      { id: sharedOneDiamondId, name: 'Shared One Diamond', shortCode: 'S1◆', color: '#94a3b8', cardCount: 28, factionId: null },
      { id: sharedTwoDiamondId, name: 'Shared Two Diamond', shortCode: 'S2◆', color: '#34d399', cardCount: 16, factionId: null },
      { id: sharedGoldCrownId, name: 'Shared Gold Crown', shortCode: 'S👑', color: '#f43f5e', cardCount: 3, factionId: null },
  ]

  let cards: CCGSet['cards'] = []
  try {
    const resp = await fetch('/PKMN_GA1.csv')
    const text = await resp.text()
    const result = parseCardCSV(text, rarities)
    cards = result.cards
  } catch {
    // CSV not available — return set without cards
  }

  return {
    id: uuidv4(),
    name: 'Genetic Apex - Charizard',
    game: 'Pokemon Pocket',
    createdAt: now,
    updatedAt: now,
    packSize: 5,
    packsPerBox: null,
    packPrice: 1,
    rarities,
    factions: [],
    slots,
    cards,
    slotDividers: [],
    rarityDividers: [
      { beforePosition: 1, label: 'Exclusive Cards' },
      { beforePosition: 5, label: 'Exclusive Cosmetics' },
      { beforePosition: 8, label: 'Shared Cards' },
    ],
    noPackDuplicates: true,
    pityTimers: [],
  }
}

export async function createMtGLorwynPreset(): Promise<CCGSet> {
  const now = new Date().toISOString()
  const commonId = uuidv4()
  const uncommonId = uuidv4()
  const rareId = uuidv4()
  const mythicId = uuidv4()
  const basicLandId = uuidv4()
  const fullArtBasicId = uuidv4()
  const specialGuestId = uuidv4()
  const blShocklandId = uuidv4()
  const blRareId = uuidv4()
  const blMythicId = uuidv4()
  const fableUncommonId = uuidv4()
  const fableRareId = uuidv4()
  const fableMythicId = uuidv4()
  const foilCommonId = uuidv4()
  const foilUncommonId = uuidv4()
  const foilRareId = uuidv4()
  const foilMythicId = uuidv4()
  const foilBasicLandId = uuidv4()
  const foilFullArtBasicId = uuidv4()
  const foilBlShocklandId = uuidv4()
  const foilBlRareId = uuidv4()
  const foilBlMythicId = uuidv4()
  const foilFableUncommonId = uuidv4()
  const foilFableRareId = uuidv4()
  const foilFableMythicId = uuidv4()

  const slots = []
  // Slots 1-6: Common (100%)
  for (let i = 1; i <= 6; i++) {
    slots.push({
      id: uuidv4(),
      position: i,
      label: i === 1 ? 'Common' : '',
      isFoil: false,
      pool: [{ rarityId: commonId, weight: 100 }],
    })
  }
  // Slot 7: Common / Special Guest
  slots.push({
    id: uuidv4(),
    position: 7,
    label: 'Common / Special Guest',
    isFoil: false,
    pool: [
      { rarityId: commonId, weight: 98.18 },
      { rarityId: specialGuestId, weight: 1.82 },
    ],
  })
  // Slots 8-10: Uncommon / Fable Uncommon (per-slot: 96.67% / 3.33%)
  for (let i = 8; i <= 10; i++) {
    slots.push({
      id: uuidv4(),
      position: i,
      label: i === 8 ? 'Uncommon' : '',
      isFoil: false,
      pool: [
        { rarityId: uncommonId, weight: 96.667 },
        { rarityId: fableUncommonId, weight: 3.333 },
      ],
    })
  }
  // Slot 11: Wildcard slot
  slots.push({
    id: uuidv4(),
    position: 11,
    label: 'Wildcard',
    isFoil: false,
    pool: [
      { rarityId: commonId, weight: 18 },
      { rarityId: uncommonId, weight: 58 },
      { rarityId: rareId, weight: 19 },
      { rarityId: mythicId, weight: 2 },
      { rarityId: fableUncommonId, weight: 2 },
      { rarityId: fableRareId, weight: 0.875 },
      { rarityId: fableMythicId, weight: 0.125 },
    ],
  })
  // Slot 12: Rare / Mythic
  slots.push({
    id: uuidv4(),
    position: 12,
    label: 'Rare / Mythic',
    isFoil: false,
    pool: [
      { rarityId: rareId, weight: 78.2 },
      { rarityId: mythicId, weight: 13.6 },
      { rarityId: fableRareId, weight: 4.6 },
      { rarityId: fableMythicId, weight: 1.2 },
      { rarityId: blRareId, weight: 1.2 },
      { rarityId: blMythicId, weight: 0.6 },
      { rarityId: blShocklandId, weight: 0.6 },
    ],
  })
  // Slot 13: Foil
  slots.push({
    id: uuidv4(),
    position: 13,
    label: 'Foil',
    isFoil: true,
    pool: [
      { rarityId: foilCommonId, weight: 60.4 },
      { rarityId: foilUncommonId, weight: 29.8 },
      { rarityId: foilRareId, weight: 6.5 },
      { rarityId: foilMythicId, weight: 1.1 },
      { rarityId: foilFableUncommonId, weight: 1 },
      { rarityId: foilFableRareId, weight: 1 },
      { rarityId: foilFableMythicId, weight: 0.05 },
      { rarityId: foilBlRareId, weight: 0.1 },
      { rarityId: foilBlMythicId, weight: 0.025 },
      { rarityId: foilBlShocklandId, weight: 0.025 },
    ],
  })
  // Slot 14: Land
  slots.push({
    id: uuidv4(),
    position: 14,
    label: 'Land',
    isFoil: false,
    pool: [
      { rarityId: basicLandId, weight: 40 },
      { rarityId: foilBasicLandId, weight: 10 },
      { rarityId: fullArtBasicId, weight: 40 },
      { rarityId: foilFullArtBasicId, weight: 10 },
    ],
  })

  const rarities = [
    { id: commonId, name: 'Common', shortCode: 'C', color: '#94a3b8', cardCount: 81, factionId: null },
    { id: uncommonId, name: 'Uncommon', shortCode: 'U', color: '#34d399', cardCount: 100, factionId: null },
    { id: rareId, name: 'Rare', shortCode: 'R', color: '#60a5fa', cardCount: 65, factionId: null },
    { id: mythicId, name: 'Mythic Rare', shortCode: 'M', color: '#f59e0b', cardCount: 22, factionId: null },
    { id: basicLandId, name: 'Basic Land', shortCode: 'BL', color: '#a78bfa', cardCount: 15, factionId: null },
    { id: fullArtBasicId, name: 'Full-Art Basic Land', shortCode: 'FA', color: '#c084fc', cardCount: 15, factionId: null },
    { id: specialGuestId, name: 'Special Guest', shortCode: 'SG', color: '#fb923c', cardCount: 20, factionId: null },
    { id: blShocklandId, name: 'Borderless Shockland', shortCode: 'BS', color: '#2dd4bf', cardCount: 5, factionId: null },
    { id: blRareId, name: 'Borderless Rare', shortCode: 'BR', color: '#38bdf8', cardCount: 5, factionId: null },
    { id: blMythicId, name: 'Borderless Mythic Rare', shortCode: 'BM', color: '#818cf8', cardCount: 8, factionId: null },
    { id: fableUncommonId, name: 'Fable Uncommon', shortCode: 'FU', color: '#6ee7b7', cardCount: 10, factionId: null },
    { id: fableRareId, name: 'Fable Rare', shortCode: 'FR', color: '#93c5fd', cardCount: 26, factionId: null },
    { id: fableMythicId, name: 'Fable Mythic Rare', shortCode: 'FM', color: '#fbbf24', cardCount: 14, factionId: null },
    { id: foilCommonId, name: 'Foil Common', shortCode: 'FC', color: '#cbd5e1', cardCount: 81, factionId: null },
    { id: foilUncommonId, name: 'Foil Uncommon', shortCode: 'FoU', color: '#86efac', cardCount: 100, factionId: null },
    { id: foilRareId, name: 'Foil Rare', shortCode: 'FoR', color: '#7dd3fc', cardCount: 65, factionId: null },
    { id: foilMythicId, name: 'Foil Mythic Rare', shortCode: 'FoM', color: '#fcd34d', cardCount: 22, factionId: null },
    { id: foilBasicLandId, name: 'Foil Basic Land', shortCode: 'FBL', color: '#c4b5fd', cardCount: 15, factionId: null },
    { id: foilFullArtBasicId, name: 'Foil Full-Art Basic Land', shortCode: 'FFA', color: '#d8b4fe', cardCount: 15, factionId: null },
    { id: foilBlShocklandId, name: 'Foil Borderless Shockland', shortCode: 'FBS', color: '#5eead4', cardCount: 5, factionId: null },
    { id: foilBlRareId, name: 'Foil Borderless Rare', shortCode: 'FBR', color: '#7dd3fc', cardCount: 5, factionId: null },
    { id: foilBlMythicId, name: 'Foil Borderless Mythic Rare', shortCode: 'FBM', color: '#a5b4fc', cardCount: 8, factionId: null },
    { id: foilFableUncommonId, name: 'Foil Fable Uncommon', shortCode: 'FFU', color: '#a7f3d0', cardCount: 10, factionId: null },
    { id: foilFableRareId, name: 'Foil Fable Rare', shortCode: 'FFR', color: '#bae6fd', cardCount: 26, factionId: null },
    { id: foilFableMythicId, name: 'Foil Fable Mythic Rare', shortCode: 'FFM', color: '#fde68a', cardCount: 14, factionId: null },
  ]

  let cards: CCGSet['cards'] = []
  try {
    const resp = await fetch('/MTG_ECL.csv')
    const text = await resp.text()
    const result = parseCardCSV(text, rarities)
    cards = result.cards
  } catch {
    // CSV not available — return set without cards
  }

  return {
    id: uuidv4(),
    name: 'Lorwyn Eclipsed',
    game: 'Magic: The Gathering',
    createdAt: now,
    updatedAt: now,
    packSize: 14,
    packsPerBox: 36,
    packPrice: 4.0,
    rarities,
    factions: [],
    slots,
    cards,
    slotDividers: [],
    rarityDividers: [
      { beforePosition: 1, label: 'Regular Cards' },
      { beforePosition: 5, label: 'Basic Lands' },
      { beforePosition: 7, label: 'Booster Fun' },
      { beforePosition: 14, label: 'Foil Variants' },
    ],
    noPackDuplicates: true,
    pityTimers: [],
  }
}

export async function createHearthstonePreset(): Promise<CCGSet> {
  const now = new Date().toISOString()
  const commonId = uuidv4()
  const rareId = uuidv4()
  const epicId = uuidv4()
  const legendaryId = uuidv4()
  const goldenCommonId = uuidv4()
  const goldenRareId = uuidv4()
  const goldenEpicId = uuidv4()
  const goldenLegendaryId = uuidv4()

  const slots = []
  // Slots 1-4: Any rarity using observed overall drop rates
  for (let i = 1; i <= 4; i++) {
    slots.push({
      id: uuidv4(),
      position: i,
      label: i === 1 ? 'Any' : '',
      isFoil: false,
      pool: [
        { rarityId: commonId, weight: 70.36 },
        { rarityId: rareId, weight: 21.61 },
        { rarityId: epicId, weight: 4.08 },
        { rarityId: legendaryId, weight: 0.94 },
        { rarityId: goldenCommonId, weight: 1.48 },
        { rarityId: goldenRareId, weight: 1.27 },
        { rarityId: goldenEpicId, weight: 0.19 },
        { rarityId: goldenLegendaryId, weight: 0.07 },
      ],
    })
  }
  // Slot 5: Guaranteed Rare or better (Common/Golden Common excluded, renormalized)
  // Raw non-common sum: 21.61 + 4.08 + 0.94 + 1.27 + 0.19 + 0.07 = 28.16
  slots.push({
    id: uuidv4(),
    position: 5,
    label: 'Rare+',
    isFoil: false,
    pool: [
      { rarityId: rareId, weight: 76.74 },
      { rarityId: epicId, weight: 14.49 },
      { rarityId: legendaryId, weight: 3.34 },
      { rarityId: goldenRareId, weight: 4.51 },
      { rarityId: goldenEpicId, weight: 0.67 },
      { rarityId: goldenLegendaryId, weight: 0.25 },
    ],
  })

  const rarities = [
    { id: commonId, name: 'Common', shortCode: 'C', color: '#94a3b8', cardCount: 43, factionId: null },
    { id: rareId, name: 'Rare', shortCode: 'R', color: '#60a5fa', cardCount: 38, factionId: null },
    { id: epicId, name: 'Epic', shortCode: 'E', color: '#a78bfa', cardCount: 27, factionId: null },
    { id: legendaryId, name: 'Legendary', shortCode: 'L', color: '#f59e0b', cardCount: 27, factionId: null },
    { id: goldenCommonId, name: 'Golden Common', shortCode: 'GC', color: '#cbd5e1', cardCount: 43, factionId: null },
    { id: goldenRareId, name: 'Golden Rare', shortCode: 'GR', color: '#93c5fd', cardCount: 38, factionId: null },
    { id: goldenEpicId, name: 'Golden Epic', shortCode: 'GE', color: '#c4b5fd', cardCount: 27, factionId: null },
    { id: goldenLegendaryId, name: 'Golden Legendary', shortCode: 'GL', color: '#fbbf24', cardCount: 27, factionId: null },
  ]

  let cards: CCGSet['cards'] = []
  try {
    const resp = await fetch('/HS_Cataclysm.csv')
    const text = await resp.text()
    const result = parseCardCSV(text, rarities)
    cards = result.cards
  } catch {
    // CSV not available — return set without cards
  }

  return {
    id: uuidv4(),
    name: 'Cataclysm',
    game: 'Hearthstone',
    createdAt: now,
    updatedAt: now,
    packSize: 5,
    packsPerBox: null,
    packPrice: 1.50,
    rarities,
    factions: [],
    slots,
    cards,
    slotDividers: [],
    rarityDividers: [
      { beforePosition: 1, label: 'Regular Cards' },
      { beforePosition: 5, label: 'Golden Cards' },
    ],
    noPackDuplicates: true,
    pityTimers: [
      { rarityId: legendaryId, afterNPacks: 40 },
      { rarityId: epicId, afterNPacks: 10 },
      { rarityId: goldenLegendaryId, afterNPacks: 361 },
      { rarityId: goldenEpicId, afterNPacks: 142 },
      { rarityId: goldenRareId, afterNPacks: 29 },
      { rarityId: goldenCommonId, afterNPacks: 25 },
    ],
  }
}

export async function createLorcanaPreset(): Promise<CCGSet> {
  const now = new Date().toISOString()
  const commonId = uuidv4()
  const uncommonId = uuidv4()
  const rareId = uuidv4()
  const superRareId = uuidv4()
  const legendaryId = uuidv4()
  const foilCommonId = uuidv4()
  const foilUncommonId = uuidv4()
  const foilRareId = uuidv4()
  const foilSuperRareId = uuidv4()
  const foilLegendaryId = uuidv4()
  const epicId = uuidv4()
  const enchantedId = uuidv4()
  const iconicId = uuidv4()
  const rarities = [
    { id: commonId, name: 'Common', shortCode: 'C', color: '#94a3b8', cardCount: 72, factionId: null },
    { id: uncommonId, name: 'Uncommon', shortCode: 'U', color: '#34d399', cardCount: 54, factionId: null },
    { id: rareId, name: 'Rare', shortCode: 'R', color: '#60a5fa', cardCount: 48, factionId: null },
    { id: superRareId, name: 'Super Rare', shortCode: 'SR', color: '#a78bfa', cardCount: 18, factionId: null },
    { id: legendaryId, name: 'Legendary', shortCode: 'L', color: '#f59e0b', cardCount: 12, factionId: null },
    { id: foilCommonId, name: 'Foil Common', shortCode: 'FC', color: '#cbd5e1', cardCount: 72, factionId: null },
    { id: foilUncommonId, name: 'Foil Uncommon', shortCode: 'FU', color: '#6ee7b7', cardCount: 54, factionId: null },
    { id: foilRareId, name: 'Foil Rare', shortCode: 'FR', color: '#93c5fd', cardCount: 48, factionId: null },
    { id: foilSuperRareId, name: 'Foil Super Rare', shortCode: 'FSR', color: '#c4b5fd', cardCount: 18, factionId: null },
    { id: foilLegendaryId, name: 'Foil Legendary', shortCode: 'FL', color: '#fbbf24', cardCount: 12, factionId: null },
    { id: epicId, name: 'Epic', shortCode: 'E', color: '#f472b6', cardCount: 36, factionId: null },
    { id: enchantedId, name: 'Enchanted', shortCode: 'EN', color: '#ec4899', cardCount: 36, factionId: null },
    { id: iconicId, name: 'Iconic', shortCode: 'IC', color: '#f43f5e', cardCount: 4, factionId: null },
  ]

  const slots = []
  // Slots 1-6: Common (100%)
  for (let i = 1; i <= 6; i++) {
    slots.push({
      id: uuidv4(),
      position: i,
      label: i === 1 ? 'Common' : '',
      isFoil: false,
      pool: [{ rarityId: commonId, weight: 100 }],
    })
  }
  // Slots 7-9: Uncommon (100%)
  for (let i = 7; i <= 9; i++) {
    slots.push({
      id: uuidv4(),
      position: i,
      label: i === 7 ? 'Uncommon' : '',
      isFoil: false,
      pool: [{ rarityId: uncommonId, weight: 100 }],
    })
  }
  // Slots 10-11: Rare or higher (per-slot rates = combined rates / 2)
  for (let i = 10; i <= 11; i++) {
    slots.push({
      id: uuidv4(),
      position: i,
      label: i === 10 ? 'Rare+' : '',
      isFoil: false,
      pool: [
        { rarityId: rareId, weight: 67.50 },
        { rarityId: superRareId, weight: 23.665 },
        { rarityId: legendaryId, weight: 8.835 },
      ],
    })
  }
  // Slot 12: Foil slot (any rarity foil, plus Epic/Enchanted/Iconic/Orwen)
  slots.push({
    id: uuidv4(),
    position: 12,
    label: 'Foil / Special',
    isFoil: true,
    pool: [
      { rarityId: foilCommonId, weight: 48 },
      { rarityId: foilUncommonId, weight: 25 },
      { rarityId: foilRareId, weight: 12.5 },
      { rarityId: foilSuperRareId, weight: 4.8 },
      { rarityId: foilLegendaryId, weight: 2.35 },
      { rarityId: epicId, weight: 6.25 },
      { rarityId: enchantedId, weight: 1.042 },
      { rarityId: iconicId, weight: 0.0625 },
    ],
  })

  let cards: CCGSet['cards'] = []
  try {
    const resp = await fetch('/Lorcana_Winterspell.csv')
    const text = await resp.text()
    const result = parseCardCSV(text, rarities)
    cards = result.cards
  } catch {
    // CSV not available — return set without cards
  }

  return {
    id: uuidv4(),
    name: 'Winterspell',
    game: 'Lorcana',
    createdAt: now,
    updatedAt: now,
    packSize: 12,
    packsPerBox: 36,
    packPrice: 5.99,
    rarities,
    factions: [],
    slots,
    cards,
    slotDividers: [],
    rarityDividers: [
      { beforePosition: 1, label: 'Regular Cards' },
      { beforePosition: 6, label: 'Foil Variants' },
    ],
    noPackDuplicates: true,
    pityTimers: [],
  }
}

export async function createRiftboundPreset(): Promise<CCGSet> {
  const now = new Date().toISOString()
  const commonId = uuidv4()
  const uncommonId = uuidv4()
  const rareId = uuidv4()
  const epicId = uuidv4()
  const foilCommonId = uuidv4()
  const foilUncommonId = uuidv4()
  const altArtId = uuidv4()
  const overnumberId = uuidv4()
  const sigOvernumberId = uuidv4()
  const runeId = uuidv4()
  const tokenId = uuidv4()
  const showcaseRuneId = uuidv4()

  const rarities = [
    { id: commonId, name: 'Common', shortCode: 'C', color: '#94a3b8', cardCount: 88, factionId: null },
    { id: uncommonId, name: 'Uncommon', shortCode: 'U', color: '#34d399', cardCount: 84, factionId: null },
    { id: rareId, name: 'Rare', shortCode: 'R', color: '#60a5fa', cardCount: 84, factionId: null },
    { id: epicId, name: 'Epic', shortCode: 'E', color: '#a78bfa', cardCount: 42, factionId: null },
    { id: runeId, name: 'Rune', shortCode: 'RN', color: '#38bdf8', cardCount: 10, factionId: null },
    { id: tokenId, name: 'Token', shortCode: 'TK', color: '#a3e635', cardCount: 1, factionId: null },
    { id: foilCommonId, name: 'Foil Common', shortCode: 'FC', color: '#cbd5e1', cardCount: 88, factionId: null },
    { id: foilUncommonId, name: 'Foil Uncommon', shortCode: 'FU', color: '#6ee7b7', cardCount: 84, factionId: null },
    { id: altArtId, name: 'Alt Art', shortCode: 'AA', color: '#f59e0b', cardCount: 24, factionId: null },
    { id: overnumberId, name: 'Overnumbered', shortCode: 'ON', color: '#ec4899', cardCount: 12, factionId: null },
    { id: sigOvernumberId, name: 'Signature Overnumbered', shortCode: 'SO', color: '#f43f5e', cardCount: 12, factionId: null },
    { id: showcaseRuneId, name: 'Showcase Rune', shortCode: 'SR', color: '#2dd4bf', cardCount: 6, factionId: null },
  ]

  const slots = []
  // Slots 1-7: Common (100%)
  for (let i = 1; i <= 7; i++) {
    slots.push({
      id: uuidv4(),
      position: i,
      label: i === 1 ? 'Common' : '',
      isFoil: false,
      pool: [{ rarityId: commonId, weight: 100 }],
    })
  }
  // Slots 8-10: Uncommon (100%)
  for (let i = 8; i <= 10; i++) {
    slots.push({
      id: uuidv4(),
      position: i,
      label: i === 8 ? 'Uncommon' : '',
      isFoil: false,
      pool: [{ rarityId: uncommonId, weight: 100 }],
    })
  }
  // Slots 11-12: Rare/Epic (per-slot: 75% Rare, 25% Epic)
  for (let i = 11; i <= 12; i++) {
    slots.push({
      id: uuidv4(),
      position: i,
      label: i === 11 ? 'Rare / Epic' : '',
      isFoil: false,
      pool: [
        { rarityId: rareId, weight: 75 },
        { rarityId: epicId, weight: 25 },
      ],
    })
  }
  // Slot 13: Foil / Special
  slots.push({
    id: uuidv4(),
    position: 13,
    label: 'Foil / Special',
    isFoil: true,
    pool: [
      { rarityId: foilCommonId, weight: 51.94 },
      { rarityId: foilUncommonId, weight: 38.201 },
      { rarityId: altArtId, weight: 8.33 },
      { rarityId: overnumberId, weight: 1.39 },
      { rarityId: sigOvernumberId, weight: 0.139 },
    ],
  })
  // Slot 14: Rune / Token
  slots.push({
    id: uuidv4(),
    position: 14,
    label: 'Rune / Token',
    isFoil: false,
    pool: [
      { rarityId: runeId, weight: 45.83 },
      { rarityId: tokenId, weight: 50 },
      { rarityId: showcaseRuneId, weight: 4.17 },
    ],
  })

  let cards: CCGSet['cards'] = []
  try {
    const resp = await fetch('/Riftbound_OGN.csv')
    const text = await resp.text()
    const result = parseCardCSV(text, rarities)
    cards = result.cards
  } catch {
    // CSV not available — return set without cards
  }

  return {
    id: uuidv4(),
    name: 'Origins',
    game: 'Riftbound',
    createdAt: now,
    updatedAt: now,
    packSize: 14,
    packsPerBox: 36,
    packPrice: 5.00,
    rarities,
    factions: [],
    slots,
    cards,
    slotDividers: [],
    rarityDividers: [
      { beforePosition: 1, label: 'Regular Cards' },
      { beforePosition: 7, label: 'Foil Variants' },
      { beforePosition: 9, label: 'Showcase' },
    ],
    noPackDuplicates: true,
    pityTimers: [],
  }
}

export interface Preset {
  name: string
  create: () => CCGSet | Promise<CCGSet>
}

export const PRESETS: Preset[] = [
  { name: 'Magic: The Gathering', create: createMtGLorwynPreset },
  { name: 'Pokemon Pocket', create: createPokemonPocketPreset },
  { name: 'Hearthstone', create: createHearthstonePreset },
  { name: 'Riftbound', create: createRiftboundPreset },
  { name: 'Lorcana', create: createLorcanaPreset },
]
