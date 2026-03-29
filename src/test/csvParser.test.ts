import { describe, it, expect } from 'vitest'
import { parseCardCSV } from '../lib/csvParser'
import type { Rarity } from '../types'

const testRarities: Rarity[] = [
  { id: 'c-id', name: 'Common', shortCode: 'C', color: '#aaa', cardCount: 100, factionId: null },
  { id: 'u-id', name: 'Uncommon', shortCode: 'U', color: '#0f0', cardCount: 50, factionId: null },
  { id: 'r-id', name: 'Rare', shortCode: 'R', color: '#00f', cardCount: 20, factionId: null },
]

describe('parseCardCSV', () => {
  it('parses basic CSV', () => {
    const csv = `name,rarity\nLightning Bolt,C\nCounterspell,U\nBlack Lotus,R`
    const result = parseCardCSV(csv, testRarities)

    expect(result.cards.length).toBe(3)
    expect(result.skipped.length).toBe(0)
    expect(result.total).toBe(3)
    expect(result.cards[0].name).toBe('Lightning Bolt')
    expect(result.cards[0].rarityId).toBe('c-id')
    expect(result.cards[2].rarityId).toBe('r-id')
  })

  it('matches by rarity name case-insensitively', () => {
    const csv = `name,rarity\nCard A,common\nCard B,RARE`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards.length).toBe(2)
    expect(result.cards[0].rarityId).toBe('c-id')
    expect(result.cards[1].rarityId).toBe('r-id')
  })

  it('matches by shortCode first', () => {
    const csv = `name,rarity\nCard A,C`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards[0].rarityId).toBe('c-id')
  })

  it('skips rows with missing name', () => {
    const csv = `name,rarity\n,C\nCard B,U`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards.length).toBe(1)
    expect(result.skipped.length).toBe(1)
    expect(result.skipped[0].reason).toContain('Missing')
  })

  it('skips rows with unrecognized rarity', () => {
    const csv = `name,rarity\nCard A,Mythic\nCard B,U`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards.length).toBe(1)
    expect(result.skipped.length).toBe(1)
    expect(result.skipped[0].reason).toContain('Unrecognized')
  })

  it('handles optional columns', () => {
    const csv = `name,rarity,faction,setNumber,isFoilVariant,notes\nCard A,C,Red,1/100,true,A note`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards.length).toBe(1)
    expect(result.cards[0].factionId).toBe('Red')
    expect(result.cards[0].setNumber).toBe('1/100')
    expect(result.cards[0].isFoilVariant).toBe(true)
    expect(result.cards[0].notes).toBe('A note')
  })

  it('handles quoted fields with commas', () => {
    const csv = `name,rarity\n"Card, The Great",C`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards.length).toBe(1)
    expect(result.cards[0].name).toBe('Card, The Great')
  })

  it('handles empty CSV', () => {
    const result = parseCardCSV('', testRarities)
    expect(result.cards.length).toBe(0)
    expect(result.total).toBe(0)
  })

  it('returns error for CSV without required columns', () => {
    const csv = `title,type\nCard A,Common`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards.length).toBe(0)
    expect(result.skipped.length).toBe(1)
    expect(result.skipped[0].reason).toContain('must have')
  })

  it('handles CRLF line endings', () => {
    const csv = `name,rarity\r\nCard A,C\r\nCard B,U`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards.length).toBe(2)
  })

  it('ignores extra columns', () => {
    const csv = `name,rarity,extra\nCard A,C,ignored`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards.length).toBe(1)
  })

  it('handles escaped double quotes within quoted fields', () => {
    const csv = `name,rarity\n"Card ""The Great"" One",C`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards.length).toBe(1)
    expect(result.cards[0].name).toBe('Card "The Great" One')
  })

  it('parses relativeWeight column', () => {
    const csv = `name,rarity,relativeWeight\nCard A,C,0.5\nCard B,C,2\nCard C,C,`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards.length).toBe(3)
    expect(result.cards[0].relativeWeight).toBe(0.5)
    expect(result.cards[1].relativeWeight).toBe(2)
    expect(result.cards[2].relativeWeight).toBeUndefined() // empty → undefined (defaults to 1)
  })

  it('defaults relativeWeight to undefined when column missing', () => {
    const csv = `name,rarity\nCard A,C`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards[0].relativeWeight).toBeUndefined()
  })

  it('clamps invalid relativeWeight to undefined', () => {
    const csv = `name,rarity,relativeWeight\nCard A,C,0\nCard B,C,-1\nCard C,C,abc`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards[0].relativeWeight).toBeUndefined() // 0 → undefined
    expect(result.cards[1].relativeWeight).toBeUndefined() // negative → undefined
    expect(result.cards[2].relativeWeight).toBeUndefined() // NaN → undefined
  })

  it('parses value column', () => {
    const csv = `name,rarity,value\nCard A,C,0.25\nCard B,R,15.50\nCard C,U,`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards.length).toBe(3)
    expect(result.cards[0].value).toBe(0.25)
    expect(result.cards[1].value).toBe(15.50)
    expect(result.cards[2].value).toBeUndefined() // empty → undefined
  })

  it('allows zero value', () => {
    const csv = `name,rarity,value\nCard A,C,0`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards[0].value).toBe(0)
  })

  it('clamps negative value to undefined', () => {
    const csv = `name,rarity,value\nCard A,C,-1\nCard B,C,abc`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards[0].value).toBeUndefined()
    expect(result.cards[1].value).toBeUndefined()
  })

  it('defaults value to undefined when column missing', () => {
    const csv = `name,rarity\nCard A,C`
    const result = parseCardCSV(csv, testRarities)
    expect(result.cards[0].value).toBeUndefined()
  })
})
