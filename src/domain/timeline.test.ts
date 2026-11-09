import { describe, expect, it } from 'vitest'
import { DRAFT_ORDER, applyBan, draftTimeline, initDraft, isDraftComplete } from './draft'
import { resolveSlots } from './ratings'
import { createRng } from './rng'
import { startNewGame } from './season'
import { rosterOf } from './transfers'

const game = startNewGame('sktenis', 12)
const m = game.matches.find((x) => x.homeId === 'sktenis' || x.awayId === 'sktenis')!
const slots = (id: string) => resolveSlots(game.teams[id]!, rosterOf(game, id))
const ctx = { slots: { blue: slots(m.homeId), red: slots(m.awayId) }, tactic: { blue: 'balanced', red: 'scaling' } as const }

describe('gerar draft completo', () => {
  it('gera os 20 passos (bans e picks dos dois times) até concluir', () => {
    const steps = draftTimeline(ctx, [], createRng(1))
    expect(steps).toHaveLength(DRAFT_ORDER.length)
    const final = steps.at(-1)!
    expect(isDraftComplete(final)).toBe(true)
    expect(final.bans.blue.length + final.bans.red.length).toBe(10)
    expect(Object.keys(final.picks.blue)).toHaveLength(5)
    expect(Object.keys(final.picks.red)).toHaveLength(5)
    steps.forEach((s, i) => expect(s.step).toBe(i + 1))
  })

  it('sementes diferentes geram drafts diferentes', () => {
    const a = draftTimeline(ctx, [], createRng(1)).at(-1)!
    const b = draftTimeline(ctx, [], createRng(999)).at(-1)!
    expect(JSON.stringify(a.picks)).not.toBe(JSON.stringify(b.picks))
  })

  it('cada jogada registra a última ação para a animação', () => {
    const s = applyBan(initDraft(), 'Ahri')
    expect(s.last).toEqual({ type: 'ban', side: 'blue', champ: 'Ahri' })
  })
})
