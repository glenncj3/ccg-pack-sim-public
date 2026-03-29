import { v4 as uuidv4 } from 'uuid'
import type { Card, Rarity } from '../types'

export interface CSVParseResult {
  cards: Card[]
  skipped: { row: number; reason: string }[]
  total: number
}

export function parseCardCSV(csvText: string, rarities: Rarity[]): CSVParseResult {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) {
    return { cards: [], skipped: [], total: 0 }
  }

  // Parse header
  const headerLine = lines[0]
  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase())

  const nameIdx = headers.indexOf('name')
  const rarityIdx = headers.indexOf('rarity')
  const factionIdx = headers.indexOf('faction')
  const setNumberIdx = headers.indexOf('setnumber')
  const isFoilIdx = headers.indexOf('isfoilvariant')
  const notesIdx = headers.indexOf('notes')
  const weightIdx = headers.indexOf('relativeweight') !== -1
    ? headers.indexOf('relativeweight')
    : headers.indexOf('drawweight')
  const valueIdx = headers.indexOf('value')

  if (nameIdx === -1 || rarityIdx === -1) {
    return {
      cards: [],
      skipped: [{ row: 0, reason: 'CSV must have "name" and "rarity" columns' }],
      total: 0,
    }
  }

  const cards: Card[] = []
  const skipped: { row: number; reason: string }[] = []

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i])
    const name = fields[nameIdx]?.trim()
    const rarityStr = fields[rarityIdx]?.trim()

    if (!name || !rarityStr) {
      skipped.push({ row: i + 1, reason: 'Missing name or rarity' })
      continue
    }

    // Match rarity by shortCode first, then name (case-insensitive)
    const matchedRarity = rarities.find(
      (r) =>
        r.shortCode.toLowerCase() === rarityStr.toLowerCase() ||
        r.name.toLowerCase() === rarityStr.toLowerCase()
    )

    if (!matchedRarity) {
      skipped.push({ row: i + 1, reason: `Unrecognized rarity "${rarityStr}"` })
      continue
    }

    const factionStr = factionIdx !== -1 ? fields[factionIdx]?.trim() || null : null
    const setNumber = setNumberIdx !== -1 ? fields[setNumberIdx]?.trim() || null : null
    const isFoil = isFoilIdx !== -1 ? fields[isFoilIdx]?.trim().toLowerCase() === 'true' : false
    const notes = notesIdx !== -1 ? fields[notesIdx]?.trim() || null : null
    const rawWeight = weightIdx !== -1 ? parseFloat(fields[weightIdx]?.trim()) : NaN
    const resolvedWeight = isNaN(rawWeight) || rawWeight <= 0 ? undefined : rawWeight
    const rawValue = valueIdx !== -1 ? parseFloat(fields[valueIdx]?.trim().replace(/[$,]/g, '')) : NaN
    const resolvedValue = isNaN(rawValue) || rawValue < 0 ? undefined : rawValue

    cards.push({
      id: uuidv4(),
      name,
      rarityId: matchedRarity.id,
      factionId: factionStr, // Will be resolved to faction UUID by caller if needed
      setNumber,
      isFoilVariant: isFoil,
      notes,
      relativeWeight: resolvedWeight,
      value: resolvedValue,
    })
  }

  return { cards, skipped, total: lines.length - 1 }
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        fields.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }
  fields.push(current)
  return fields
}
