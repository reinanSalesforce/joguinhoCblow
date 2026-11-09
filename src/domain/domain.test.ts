import { describe, expect, it } from 'vitest'
import { simulateGame } from './engine'
import { createRng } from './rng'
import { resolveSlots } from './ratings'
import { computeStandings, nextDay, playNextDay, seasonPhase, startNewGame, startNextSeason } from './season'
import { rosterOf } from './transfers'
import type { GameData } from './types'

function play(data: GameData): GameData {
  let d = data
  while (nextDay(d) !== null) d = playNextDay(d).data
  return d
}

describe('motor de partida', () => {
  it('produz jogos com duração e placar plausíveis', () => {
    const data = startNewGame('gayneyryodan', 7)
    const rng = createRng(1)
    const side = (id: string) => ({
      team: data.teams[id]!,
      slots: resolveSlots(data.teams[id]!, rosterOf(data, id)),
    })
    let total = 0
    const n = 200
    let strongWins = 0
    for (let i = 0; i < n; i++) {
      const g = simulateGame(side('gayneyryodan'), side('sktenis'), rng)
      total += g.minutes
      if (g.winner === 'home') strongWins++
      expect(g.picks[0]).toHaveLength(5)
    }
    const avg = total / n
    expect(avg).toBeGreaterThan(22)
    expect(avg).toBeLessThan(45)
    expect(strongWins / n).toBeGreaterThan(0.55)
  })
})

describe('temporada', () => {
  it('é determinística para a mesma semente', () => {
    const a = play(startNewGame('lestrolls', 99))
    const b = play(startNewGame('lestrolls', 99))
    expect(a.history[0]).toEqual(b.history[0])
  })

  it('percorre regular + playoffs e fecha a temporada', () => {
    const start = startNewGame('pitbronzes', 5)
    expect(start.matches).toHaveLength(28)
    const end = play(start)
    expect(seasonPhase(end)).toBe('finished')
    expect(end.history).toHaveLength(1)
    expect(Object.keys(end.finalPosition)).toHaveLength(8)
    const table = computeStandings(end)
    expect(table.reduce((s, r) => s + r.wins, 0)).toBe(28)
    expect(end.matches.some((m) => m.stage === 'Grande Final' && m.played)).toBe(true)
  })

  it('inicia nova temporada resetando calendário e estatísticas', () => {
    const next = startNextSeason(play(startNewGame('sktenis', 3)))
    expect(next.season).toBe(2)
    expect(next.matches.every((m) => !m.played)).toBe(true)
    expect(Object.values(next.players).every((p) => p.stats.games === 0)).toBe(true)
    expect(rosterOf(next, 'gayneyryodan').length).toBeGreaterThanOrEqual(5)
  })
})

import { availablePool, createCustomGame, validateCustomTeam } from './customTeam'
import type { CustomTeamConfig } from './customTeam'

describe('criar time', () => {
  const seed = 42
  const build = (mode: CustomTeamConfig['mode']): CustomTeamConfig => {
    const pool = availablePool(seed, mode)
    const pick = (role: string) => pool.filter((p) => p.role === role).slice(0, 1).map((p) => p.id)
    return {
      name: 'Os Invocadores', tag: 'OSI', presidents: 'Eu', color: '#5fd39a', tactic: 'balanced', mode,
      signedIds: ['Top', 'Jungle', 'Mid', 'ADC', 'Suporte'].flatMap(pick), created: [],
    }
  }

  it('valida requisitos mínimos', () => {
    const cfg = { ...build({ kind: 'add' }), name: 'ab', signedIds: [] }
    const errors = validateCustomTeam(cfg, seed)
    expect(errors.length).toBeGreaterThan(2)
    expect(validateCustomTeam(build({ kind: 'add' }), seed)).toEqual([])
  })

  it('9º time: calendário com folgas e temporada completa', () => {
    const game = createCustomGame(build({ kind: 'add' }), seed)
    expect(Object.keys(game.teams)).toHaveLength(9)
    expect(game.matches).toHaveLength(36)
    expect(game.userTeamId).toBe('os-invocadores')
    const end = play(game)
    expect(seasonPhase(end)).toBe('finished')
    expect(Object.keys(end.finalPosition)).toHaveLength(9)
  })

  it('substituir time: 8 clubes e jogadores antigos viram agentes livres', () => {
    const game = createCustomGame(build({ kind: 'replace', teamId: 'sktenis' }), seed)
    expect(Object.keys(game.teams)).toHaveLength(8)
    expect(game.teams['sktenis']).toBeUndefined()
    expect(game.matches).toHaveLength(28)
    const old = ['ceyf', 'exc4mbau', 'karlinrox', 'pastordecalcinha', 'sk4ravelho', 'srtaveira', 'vosuzz', 'ynercias', 'drytski']
    expect(old.filter((id) => game.players[id]?.teamId === null).length).toBeGreaterThan(3)
  })

  it('rejeita nome já existente', () => {
    const cfg = { ...build({ kind: 'add' }), name: 'sktenis' }
    expect(validateCustomTeam(cfg, seed).join()).toContain('Já existe')
  })
})
