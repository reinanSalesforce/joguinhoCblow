import { describe, expect, it } from 'vitest'
import { CHAMPIONS } from './champions'
import { DRAFT_ORDER, aiAction, applyAi, autoDraft, currentStep, initDraft, isAvailable, isDraftComplete } from './draft'
import { resolveSlots } from './ratings'
import { createRng } from './rng'
import { previewUserSeries, startNewGame } from './season'
import { rosterOf } from './transfers'

describe('draft', () => {
  const game = startNewGame('sktenis', 11)
  const m = game.matches.find((x) => x.homeId === 'sktenis' || x.awayId === 'sktenis')!
  const slots = (id: string) => resolveSlots(game.teams[id]!, rosterOf(game, id))
  const ctx = { slots: { blue: slots(m.homeId), red: slots(m.awayId) }, tactic: { blue: 'balanced', red: 'early' } as const }

  it('tem todos os campeões e a ordem profissional (10 bans, 10 picks)', () => {
    expect(CHAMPIONS.length).toBeGreaterThan(150)
    expect(DRAFT_ORDER.filter((s) => s.type === 'ban')).toHaveLength(10)
    expect(DRAFT_ORDER.filter((s) => s.type === 'pick')).toHaveLength(10)
  })

  it('IA conclui o draft sem repetir campeões e respeita bans', () => {
    const rng = createRng(3)
    let s = initDraft()
    while (!isDraftComplete(s)) s = applyAi(s, aiAction(s, ctx, rng))
    const picks = [...Object.values(s.picks.blue), ...Object.values(s.picks.red)]
    expect(picks).toHaveLength(10)
    expect(new Set(picks).size).toBe(10)
    const bans = [...s.bans.blue, ...s.bans.red].filter(Boolean) as string[]
    expect(bans.some((b) => picks.includes(b))).toBe(false)
    expect(isAvailable(s, bans[0]!)).toBe(false)
    expect(currentStep(s)).toBeUndefined()
  })

  it('draft automático não usa campeões da série anterior (fearless)', () => {
    const first = autoDraft(ctx, [], createRng(5))
    const used = [...Object.values(first.picks.blue), ...Object.values(first.picks.red)]
    const second = autoDraft(ctx, used, createRng(6))
    const again = [...Object.values(second.picks.blue), ...Object.values(second.picks.red)]
    expect(again.some((c) => used.includes(c))).toBe(false)
  })

  it('o draft do usuário é usado na simulação da série', () => {
    const d = autoDraft(ctx, [], createRng(9))
    const match = previewUserSeries(game, [d])
    expect(match?.games[0]?.draft).toEqual(d)
    expect(match?.games[0]?.picks[0][0]?.champ).toBe(d.picks.blue.Top)
  })
})
