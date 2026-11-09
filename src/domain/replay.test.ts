import { describe, expect, it } from 'vitest'
import { simulateGame } from './engine'
import { computeMapState } from './replayMap'
import { createRng } from './rng'
import { resolveSlots } from './ratings'
import { startNewGame } from './season'
import { createWorld, defaultAdminDb, toAdmin } from './seed'
import { rosterOf } from './transfers'

const game = startNewGame('gayneyryodan', 21)
const side = (id: string) => ({ team: game.teams[id]!, slots: resolveSlots(game.teams[id]!, rosterOf(game, id)) })
const play = (seed: number) => simulateGame(side('gayneyryodan'), side('sktenis'), createRng(seed))

describe('cenas e minimapa', () => {
  it('cada evento de luta traz cena com participantes e abates coerentes', () => {
    const g = play(4)
    const fights = g.events.filter((e) => e.kind === 'kill')
    expect(fights.length).toBeGreaterThan(5)
    for (const e of fights) {
      expect(e.scene).toBeDefined()
      expect(e.amount).toBe(e.scene!.kills.length)
      const ids = new Set([...e.scene!.home, ...e.scene!.away])
      for (const k of e.scene!.kills) {
        expect(ids.has(k.killer)).toBe(true)
        expect(ids.has(k.victim)).toBe(true)
      }
    }
  })

  it('narração de gank cita o caçador e a lane', () => {
    const texts = Array.from({ length: 30 }, (_, i) => play(100 + i).events.map((e) => e.text)).flat()
    expect(texts.some((t) => /foi gankar o (top|mid|bot) e acabou morrendo/.test(t))).toBe(true)
    expect(texts.some((t) => /foi gankar o (top|mid|bot) e abateu/.test(t))).toBe(true)
  })

  it('participantes caminham até o local e a vítima vira caveira só na fase de luta', () => {
    const g = play(8)
    const idx = g.events.findIndex((e) => (e.scene?.kills.length ?? 0) > 0)
    const e = g.events[idx]!
    const victim = e.scene!.kills[0]!.victim
    const travel = computeMapState(g, idx, 'travel')
    const clash = computeMapState(g, idx, 'clash')
    const near = (t: { x: number; y: number }) => Math.hypot(t.x - e.scene!.x, t.y - e.scene!.y) < 8
    expect(near(travel.tokens.find((t) => t.playerId === victim)!)).toBe(true)
    expect(travel.tokens.find((t) => t.playerId === victim)!.skull).toBe(false)
    expect(clash.tokens.find((t) => t.playerId === victim)!.skull).toBe(true)
    const later = computeMapState(g, Math.min(idx + 1, g.events.length - 1), 'travel')
    expect(later.tokens.find((t) => t.playerId === victim)!.respawning).toBe(true)
  })

  it('pé de chumbo morre mais', () => {
    const baseDeaths = (flag: boolean) => {
      let deaths = 0
      for (let i = 0; i < 60; i++) {
        const s = side('gayneyryodan')
        const slot = s.slots.find((x) => x.role === 'Mid')!
        s.slots = s.slots.map((x) => (x === slot ? { ...x, player: { ...x.player, leadFoot: flag } } : x))
        const g = simulateGame(s, side('sktenis'), createRng(500 + i))
        deaths += g.picks[0].find((p) => p.role === 'Mid')!.deaths
      }
      return deaths
    }
    expect(baseDeaths(true)).toBeGreaterThan(baseDeaths(false))
  })
})

describe('banco admin', () => {
  it('novo jogo usa o banco editado (jogador novo, time, foto e pé de chumbo)', () => {
    const db = defaultAdminDb()
    expect(db).toHaveLength(71)
    db.push({ id: 'novato', name: 'Novato', role: 'Mid', teamId: 'sktenis', age: 19, ovr: 60, potential: 70, leadFoot: true, photo: 'data:image/jpeg;base64,AAAA' })
    const world = createWorld('sktenis', 1, db)
    const p = world.players['novato']!
    expect(p.teamId).toBe('sktenis')
    expect(p.leadFoot).toBe(true)
    expect(p.photo).toContain('data:image')
    expect(toAdmin(p).ovr).toBe(60)
    expect(Object.keys(world.players)).toHaveLength(72)
  })
})
