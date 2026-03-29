import { describe, it, expect } from 'vitest'
import { createPokemonPocketPreset, createHearthstonePreset, createLorcanaPreset, createRiftboundPreset, createMtGLorwynPreset } from '../lib/presets'

describe('Presets', () => {
  describe('Pokemon Pocket preset', () => {
    it('has correct structure', async () => {
      const set = await createPokemonPocketPreset()
      expect(set.name).toBe('Genetic Apex - Charizard')
      expect(set.packSize).toBe(5)
      expect(set.packsPerBox).toBeNull()
      expect(set.rarities.length).toBe(10)
      expect(set.slots.length).toBe(5)
    })

    it('has slots that sum to 100%', async () => {
      const set = await createPokemonPocketPreset()
      for (const slot of set.slots) {
        const sum = slot.pool.reduce((s, w) => s + w.weight, 0)
        expect(Math.abs(sum - 100)).toBeLessThan(0.01)
      }
    })

    it('has all slot pool rarityIds referencing valid rarities', async () => {
      const set = await createPokemonPocketPreset()
      const rarityIds = new Set(set.rarities.map((r) => r.id))
      for (const slot of set.slots) {
        for (const w of slot.pool) {
          expect(rarityIds.has(w.rarityId)).toBe(true)
        }
      }
    })
  })

  describe('MTG Lorwyn Eclipsed preset', () => {
    it('has correct structure', async () => {
      const set = await createMtGLorwynPreset()
      expect(set.name).toBe('Lorwyn Eclipsed')
      expect(set.game).toBe('Magic: The Gathering')
      expect(set.packSize).toBe(14)
      expect(set.packsPerBox).toBe(36)
      expect(set.rarities.length).toBe(25)
      expect(set.slots.length).toBe(14)
    })

    it('has slots that sum to 100%', async () => {
      const set = await createMtGLorwynPreset()
      for (const slot of set.slots) {
        const sum = slot.pool.reduce((s, w) => s + w.weight, 0)
        expect(Math.abs(sum - 100)).toBeLessThan(0.01)
      }
    })

    it('has all slot pool rarityIds referencing valid rarities', async () => {
      const set = await createMtGLorwynPreset()
      const rarityIds = new Set(set.rarities.map((r) => r.id))
      for (const slot of set.slots) {
        for (const w of slot.pool) {
          expect(rarityIds.has(w.rarityId)).toBe(true)
        }
      }
    })

    it('has unique IDs and shortCodes', async () => {
      const set = await createMtGLorwynPreset()
      const ids = [set.id, ...set.rarities.map(r => r.id), ...set.slots.map(s => s.id)]
      expect(new Set(ids).size).toBe(ids.length)
      const codes = set.rarities.map(r => r.shortCode)
      expect(new Set(codes).size).toBe(codes.length)
    })
  })

  describe('Hearthstone preset', () => {
    it('has correct structure', async () => {
      const set = await createHearthstonePreset()
      expect(set.name).toBe('Cataclysm')
      expect(set.game).toBe('Hearthstone')
      expect(set.packSize).toBe(5)
      expect(set.packsPerBox).toBeNull()
      expect(set.rarities.length).toBe(8)
      expect(set.slots.length).toBe(5)
    })

    it('has slots that sum to 100%', async () => {
      const set = await createHearthstonePreset()
      for (const slot of set.slots) {
        const sum = slot.pool.reduce((s, w) => s + w.weight, 0)
        expect(Math.abs(sum - 100)).toBeLessThan(0.01)
      }
    })

    it('has all slot pool rarityIds referencing valid rarities', async () => {
      const set = await createHearthstonePreset()
      const rarityIds = new Set(set.rarities.map((r) => r.id))
      for (const slot of set.slots) {
        for (const w of slot.pool) {
          expect(rarityIds.has(w.rarityId)).toBe(true)
        }
      }
    })

    it('has unique IDs', async () => {
      const set = await createHearthstonePreset()
      const ids = [set.id, ...set.rarities.map(r => r.id), ...set.slots.map(s => s.id)]
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('slot 5 excludes commons (rare+ guarantee)', async () => {
      const set = await createHearthstonePreset()
      const slot5 = set.slots.find(s => s.position === 5)!
      const commonRarities = set.rarities.filter(r => r.name.includes('Common')).map(r => r.id)
      for (const w of slot5.pool) {
        expect(commonRarities.includes(w.rarityId)).toBe(false)
      }
    })

    it('has 6 pity timers', async () => {
      const set = await createHearthstonePreset()
      expect(set.pityTimers.length).toBe(6)
      for (const pt of set.pityTimers) {
        expect(set.rarities.some(r => r.id === pt.rarityId)).toBe(true)
        expect(pt.afterNPacks).toBeGreaterThan(0)
      }
    })
  })

  describe('Lorcana preset', () => {
    it('has correct structure', async () => {
      const set = await createLorcanaPreset()
      expect(set.name).toBe('Winterspell')
      expect(set.game).toBe('Lorcana')
      expect(set.packSize).toBe(12)
      expect(set.packsPerBox).toBe(36)
      expect(set.rarities.length).toBe(13)
      expect(set.slots.length).toBe(12)
    })

    it('has slots that sum to 100%', async () => {
      const set = await createLorcanaPreset()
      for (const slot of set.slots) {
        const sum = slot.pool.reduce((s, w) => s + w.weight, 0)
        expect(Math.abs(sum - 100)).toBeLessThan(0.01)
      }
    })

    it('has all slot pool rarityIds referencing valid rarities', async () => {
      const set = await createLorcanaPreset()
      const rarityIds = new Set(set.rarities.map((r) => r.id))
      for (const slot of set.slots) {
        for (const w of slot.pool) {
          expect(rarityIds.has(w.rarityId)).toBe(true)
        }
      }
    })

    it('has unique IDs', async () => {
      const set = await createLorcanaPreset()
      const ids = [set.id, ...set.rarities.map(r => r.id), ...set.slots.map(s => s.id)]
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('has unique shortCodes', async () => {
      const set = await createLorcanaPreset()
      const codes = set.rarities.map(r => r.shortCode)
      expect(new Set(codes).size).toBe(codes.length)
    })

    it('slot 12 is the foil/special slot', async () => {
      const set = await createLorcanaPreset()
      const slot12 = set.slots.find(s => s.position === 12)!
      expect(slot12.isFoil).toBe(true)
      expect(slot12.pool.length).toBe(8)
    })
  })

  describe('Riftbound preset', () => {
    it('has correct structure', async () => {
      const set = await createRiftboundPreset()
      expect(set.name).toBe('Origins')
      expect(set.game).toBe('Riftbound')
      expect(set.packSize).toBe(14)
      expect(set.packsPerBox).toBe(36)
      expect(set.rarities.length).toBe(12)
      expect(set.slots.length).toBe(14)
    })

    it('has slots that sum to 100%', async () => {
      const set = await createRiftboundPreset()
      for (const slot of set.slots) {
        const sum = slot.pool.reduce((s, w) => s + w.weight, 0)
        expect(Math.abs(sum - 100)).toBeLessThan(0.01)
      }
    })

    it('has all slot pool rarityIds referencing valid rarities', async () => {
      const set = await createRiftboundPreset()
      const rarityIds = new Set(set.rarities.map((r) => r.id))
      for (const slot of set.slots) {
        for (const w of slot.pool) {
          expect(rarityIds.has(w.rarityId)).toBe(true)
        }
      }
    })

    it('has unique IDs', async () => {
      const set = await createRiftboundPreset()
      const ids = [set.id, ...set.rarities.map(r => r.id), ...set.slots.map(s => s.id)]
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('has unique shortCodes', async () => {
      const set = await createRiftboundPreset()
      const codes = set.rarities.map(r => r.shortCode)
      expect(new Set(codes).size).toBe(codes.length)
    })

    it('slot 13 is the foil/special slot', async () => {
      const set = await createRiftboundPreset()
      const slot13 = set.slots.find(s => s.position === 13)!
      expect(slot13.isFoil).toBe(true)
      expect(slot13.pool.length).toBe(5)
    })

    it('slot 14 is rune/token', async () => {
      const set = await createRiftboundPreset()
      const slot14 = set.slots.find(s => s.position === 14)!
      expect(slot14.pool.length).toBe(3)
    })
  })
})
