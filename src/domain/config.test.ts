import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, getConfig, mergeSettings, setConfig } from './config'
import { simulateGame } from './engine'
import { resolveSlots } from './ratings'
import { createRng } from './rng'
import { nextDay, playNextDay, startNewGame } from './season'
import { rosterOf } from './transfers'
import type { GameData } from './types'

afterEach(() => setConfig(DEFAULT_SETTINGS))

const withConfig = (patch: (c: typeof DEFAULT_SETTINGS) => typeof DEFAULT_SETTINGS) => setConfig(patch(structuredClone(DEFAULT_SETTINGS)))

describe('configurações do admin', () => {
  it('mescla valores salvos com padrões e descarta inválidos', () => {
    const merged = mergeSettings({ draft: { banSeconds: 45, pickSeconds: 'x', lixo: 1 }, inexistente: { a: 1 } })
    expect(merged.draft.banSeconds).toBe(45)
    expect(merged.draft.pickSeconds).toBe(DEFAULT_SETTINGS.draft.pickSeconds)
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('torres para vencer altera a duração das partidas', () => {
    const game = startNewGame('gayneyryodan', 5)
    const side = (id: string) => ({ team: game.teams[id]!, slots: resolveSlots(game.teams[id]!, rosterOf(game, id)) })
    const avg = (): number => {
      let total = 0
      for (let i = 0; i < 40; i++) total += simulateGame(side('gayneyryodan'), side('sktenis'), createRng(i)).minutes
      return total / 40
    }
    const normal = avg()
    withConfig((c) => ({ ...c, sim: { ...c.sim, towersToWin: 5 } }))
    expect(getConfig().sim.towersToWin).toBe(5)
    expect(avg()).toBeLessThan(normal)
  })

  it('turno e returno dobra o calendário; formato dos playoffs vem da configuração', () => {
    withConfig((c) => ({ ...c, league: { ...c.league, doubleRoundRobin: true, semiBestOf: 1, finalBestOf: 3 } }))
    let game: GameData = startNewGame('pitbronzes', 9)
    expect(game.matches).toHaveLength(56)
    while (nextDay(game) !== null) game = playNextDay(game).data
    expect(game.matches.filter((m) => m.stage === 'Semifinal').every((m) => m.bestOf === 1)).toBe(true)
    expect(game.matches.find((m) => m.stage === 'Grande Final')?.bestOf).toBe(3)
  })

  it('multiplicador de prêmios muda o caixa do campeão', () => {
    const run = (): number => {
      let game: GameData = startNewGame('gayneyryodan', 3)
      while (nextDay(game) !== null) game = playNextDay(game).data
      const champ = game.history[0]!.championId
      return game.teams[champ]!.cash
    }
    const base = run()
    withConfig((c) => ({ ...c, league: { ...c.league, prizeMultiplier: 3 } }))
    expect(run()).toBeGreaterThan(base)
  })
})
