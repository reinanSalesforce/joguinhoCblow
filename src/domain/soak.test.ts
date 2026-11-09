import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, setConfig } from './config'
import { createCustomGame, availablePool } from './customTeam'
import { resolveSlots } from './ratings'
import { nextDay, playNextDay, seasonPhase, startNewGame, startNextSeason } from './season'
import { TEAM_SEEDS } from './seed'
import { rosterOf } from './transfers'
import type { GameData } from './types'
import { ROLES } from './types'

vi.setConfig({ testTimeout: 120000 })

/** Verifica invariantes que, se quebrarem, derrubam o jogo (motor, calendário, elencos, contratos). */
function checkInvariants(g: GameData): void {
  for (const team of Object.values(g.teams)) {
    const roster = rosterOf(g, team.id)
    expect(roster.length, `${team.name} ficou com menos de 5 jogadores`).toBeGreaterThanOrEqual(5)
    const slots = resolveSlots(team, roster)
    expect(slots, `${team.name} sem 5 titulares`).toHaveLength(5)
    expect(new Set(slots.map((s) => s.player.id)).size).toBe(5)
    expect(slots.map((s) => s.role).sort()).toEqual([...ROLES].sort())
  }
  for (const p of Object.values(g.players)) {
    expect(Number.isFinite(p.ovr) && p.ovr >= 20 && p.ovr <= 95, `ovr inválido ${p.name}`).toBe(true)
    expect(Number.isNaN(p.salary)).toBe(false)
    if (p.teamId) expect(g.teams[p.teamId], `${p.name} em time inexistente`).toBeDefined()
  }
  for (const t of Object.values(g.teams)) expect(Number.isFinite(t.cash)).toBe(true)
}

function playSeason(g: GameData): GameData {
  let d = g
  let guard = 0
  while (nextDay(d) !== null) {
    d = playNextDay(d).data
    checkInvariants(d)
    if (++guard > 40) throw new Error('calendário não termina')
  }
  return d
}

describe('teste de estresse (várias temporadas sem intervenção)', () => {
  it.each(TEAM_SEEDS.map((t) => t.id))('5 temporadas como %s', (teamId) => {
    setConfig(DEFAULT_SETTINGS)
    let g = startNewGame(teamId, 1000 + teamId.length)
    for (let s = 1; s <= 5; s++) {
      g = playSeason(g)
      expect(seasonPhase(g)).toBe('finished')
      expect(g.history).toHaveLength(s)
      g = startNextSeason(g)
      checkInvariants(g)
    }
  })

  it('time criado (9º clube) sobrevive a várias temporadas', () => {
    const seed = 77
    const pool = availablePool(seed, { kind: 'add' })
    const pick = (role: string) => pool.filter((p) => p.role === role).slice(0, 1).map((p) => p.id)
    let g = createCustomGame(
      { name: 'Teste FC', tag: 'TFC', presidents: 'Eu', color: '#fff', tactic: 'early', mode: { kind: 'add' }, signedIds: ROLES.flatMap(pick), created: [] },
      seed,
    )
    for (let s = 1; s <= 4; s++) {
      g = playSeason(g)
      g = startNextSeason(g)
      checkInvariants(g)
    }
  })

  it('configurações extremas não quebram a simulação', () => {
    setConfig({
      ...DEFAULT_SETTINGS,
      sim: { towersToWin: 4, eventChance: 0.4, skill: 0.3, leadFootPenalty: 30 },
      league: { ...DEFAULT_SETTINGS.league, doubleRoundRobin: true, semiBestOf: 5, finalBestOf: 5, thirdBestOf: 1 },
    })
    let g = startNewGame('sktenis', 5)
    g = playSeason(g)
    expect(seasonPhase(g)).toBe('finished')
    setConfig(DEFAULT_SETTINGS)
  })
})
