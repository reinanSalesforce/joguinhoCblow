import { describe, expect, it } from 'vitest'
import { applyBan, applyPick, assignRoles, draftTimeline, initDraft, toResult } from './draft'
import { resolveSlots } from './ratings'
import { createRng } from './rng'
import { startNewGame } from './season'
import { rosterOf } from './transfers'
import { ROLES } from './types'

const game = startNewGame('sktenis', 12)
const m = game.matches.find((x) => x.homeId === 'sktenis' || x.awayId === 'sktenis')!
const slots = (id: string) => resolveSlots(game.teams[id]!, rosterOf(game, id))
const ctx = { slots: { blue: slots(m.homeId), red: slots(m.awayId) }, tactic: { blue: 'balanced', red: 'balanced' } as const }

describe('picks em ordem e definição de posições', () => {
  it('as escolhas entram na ordem do draft (B1, B2…) sem posição', () => {
    let s = initDraft()
    for (const c of ['Ahri', 'Akali', 'Alistar', 'Amumu', 'Anivia', 'Annie']) s = applyBan(s, c)
    s = applyPick(s, 'Ashe') // B1
    s = applyPick(s, 'Lux') // R1
    s = applyPick(s, 'Thresh') // R2
    expect(s.picks.blue).toEqual(['Ashe'])
    expect(s.picks.red).toEqual(['Lux', 'Thresh'])
  })

  it('assignRoles distribui os campeões nas lanes certas', () => {
    const map = assignRoles(['Thresh', 'Ashe', 'Ahri', 'Malphite', 'Amumu'], ctx.slots.blue)
    expect(map.Suporte).toBe('Thresh')
    expect(map.ADC).toBe('Ashe')
    expect(Object.values(map)).toHaveLength(5)
  })

  it('o resultado final aceita a escolha manual de posições do usuário', () => {
    const final = draftTimeline(ctx, [], createRng(2)).at(-1)!
    const manual = Object.fromEntries(ROLES.map((r, i) => [r, final.picks.blue[(i + 1) % 5]!])) as Record<(typeof ROLES)[number], string>
    const result = toResult(final, ctx, { blue: manual })
    expect(result.picks.blue).toEqual(manual)
    expect(new Set(Object.values(result.picks.red)).size).toBe(5)
  })
})
