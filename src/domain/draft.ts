import { CHAMPIONS } from './champions'
import type { Champion } from './champions'
import type { Rng } from './rng'
import type { Slot } from './ratings'
import type { DraftResult, Role, Style } from './types'
import { ROLES } from './types'

export type DraftSide = 'blue' | 'red'
export interface DraftStep {
  side: DraftSide
  type: 'ban' | 'pick'
}

const B = (type: DraftStep['type']): DraftStep => ({ side: 'blue', type })
const R = (type: DraftStep['type']): DraftStep => ({ side: 'red', type })

/** Ordem do draft competitivo: 6 bans, 6 picks, 4 bans, 4 picks. */
export const DRAFT_ORDER: readonly DraftStep[] = [
  B('ban'), R('ban'), B('ban'), R('ban'), B('ban'), R('ban'),
  B('pick'), R('pick'), R('pick'), B('pick'), B('pick'), R('pick'),
  R('ban'), B('ban'), R('ban'), B('ban'),
  R('pick'), B('pick'), B('pick'), R('pick'),
]

export interface DraftState {
  step: number
  bans: { blue: (string | null)[]; red: (string | null)[] }
  /** escolhas na ORDEM do draft (B1, B2… / R1, R2…); as posições são definidas depois */
  picks: { blue: string[]; red: string[] }
  /** campeões já usados em jogos anteriores da série (fearless) */
  used: string[]
  /** última jogada (usada para a animação de "BANIDO"/"ESCOLHIDO") */
  last?: { type: 'ban' | 'pick'; side: DraftSide; champ: string | null }
}

export interface DraftContext {
  slots: Record<DraftSide, Slot[]>
  tactic: Record<DraftSide, Style>
}

export const CHAMP_BY_ID: ReadonlyMap<string, Champion> = new Map(CHAMPIONS.map((c) => [c.id, c]))
const CHAMP_BY_NAME: ReadonlyMap<string, Champion> = new Map(CHAMPIONS.map((c) => [c.name.toLowerCase(), c]))

export function findChampion(idOrName: string): Champion | undefined {
  return CHAMP_BY_ID.get(idOrName) ?? CHAMP_BY_NAME.get(idOrName.toLowerCase())
}

export const initDraft = (used: string[] = []): DraftState => ({
  step: 0,
  bans: { blue: [], red: [] },
  picks: { blue: [], red: [] },
  used,
})

export const isDraftComplete = (s: DraftState): boolean => s.step >= DRAFT_ORDER.length
export const currentStep = (s: DraftState): DraftStep | undefined => DRAFT_ORDER[s.step]

export function bannedIds(s: DraftState): Set<string> {
  return new Set([...s.bans.blue, ...s.bans.red].filter((x): x is string => !!x))
}
export function pickedIds(s: DraftState): Set<string> {
  return new Set([...Object.values(s.picks.blue), ...Object.values(s.picks.red)])
}
export function isAvailable(s: DraftState, id: string): boolean {
  return !bannedIds(s).has(id) && !pickedIds(s).has(id) && !s.used.includes(id)
}

export function applyBan(s: DraftState, champ: string | null): DraftState {
  const step = currentStep(s)
  if (!step || step.type !== 'ban') return s
  if (champ !== null && !isAvailable(s, champ)) return s
  return { ...s, step: s.step + 1, bans: { ...s.bans, [step.side]: [...s.bans[step.side], champ] }, last: { type: 'ban', side: step.side, champ } }
}

export function applyPick(s: DraftState, champ: string): DraftState {
  const step = currentStep(s)
  if (!step || step.type !== 'pick' || !isAvailable(s, champ) || s.picks[step.side].length >= 5) return s
  return { ...s, step: s.step + 1, picks: { ...s.picks, [step.side]: [...s.picks[step.side], champ] }, last: { type: 'pick', side: step.side, champ } }
}

const TIER_SCORE = { S: 3, A: 2, B: 1, C: 0 } as const
const opposite = (side: DraftSide): DraftSide => (side === 'blue' ? 'red' : 'blue')

function laneFit(c: Champion, role: Role): number {
  const i = c.lanes.indexOf(role)
  return i < 0 ? -Infinity : i === 0 ? 2 : 1
}

function pickScore(c: Champion, role: Role, side: DraftSide, s: DraftState, ctx: DraftContext): number {
  const fit = laneFit(c, role)
  if (fit === -Infinity) return -Infinity
  const player = ctx.slots[side].find((sl) => sl.role === role)?.player
  const comfort = player && player.champs.includes(c.id) ? 4 : 0
  const mine = Object.values(s.picks[side]).map((id) => CHAMP_BY_ID.get(id)).filter((x): x is Champion => !!x)
  const apCount = mine.filter((m) => m.ap).length
  const adCount = mine.filter((m) => !m.ap && !m.tags.includes('Tank')).length
  const balance = c.ap ? (apCount >= 2 ? -2.5 : 0.4) : adCount >= 3 ? -2.5 : 0.4
  const t = ctx.tactic[side]
  const style = t === 'early' ? (c.early - 5) * 0.4 : t === 'scaling' ? (c.late - 5) * 0.4 : t === 'teamfight' ? (c.tf - 5) * 0.4 : 0
  return TIER_SCORE[c.tier] + fit + comfort + balance + style
}

function banScore(c: Champion, side: DraftSide, ctx: DraftContext): number {
  const enemy = ctx.slots[opposite(side)]
  // preferência: tirar o campeão de conforto do inimigo e os mais fortes do meta
  const comfortHit = enemy.some((sl) => sl.player.champs.includes(c.id)) ? 5 : 0
  const power = TIER_SCORE[c.tier] * 1.2
  const relevant = enemy.some((sl) => c.lanes.includes(sl.role)) ? 0.5 : 0
  return comfortHit + power + relevant
}

/** Nota de encaixe de um campeão em uma posição (lane, conforto do jogador e força no meta). */
function roleScore(champId: string, role: Role, slots: readonly Slot[]): number {
  const c = CHAMP_BY_ID.get(champId)
  if (!c) return -6
  const i = c.lanes.indexOf(role)
  const fit = i < 0 ? -6 : i === 0 ? 2 : 1
  const comfort = slots.find((s) => s.role === role)?.player.champs.includes(c.id) ? 4 : 0
  return fit + comfort + TIER_SCORE[c.tier] * 0.5
}

/** Melhor distribuição dos campeões escolhidos pelas posições (testa todas as combinações). */
export function assignRoles(champs: readonly string[], slots: readonly Slot[]): Partial<Record<Role, string>> {
  let best: { score: number; map: Partial<Record<Role, string>> } = { score: -Infinity, map: {} }
  const walk = (i: number, used: Set<Role>, score: number, map: Partial<Record<Role, string>>): void => {
    if (i === champs.length) {
      if (score > best.score) best = { score, map: { ...map } }
      return
    }
    for (const role of ROLES) {
      if (used.has(role)) continue
      used.add(role)
      map[role] = champs[i]!
      walk(i + 1, used, score + roleScore(champs[i]!, role, slots), map)
      delete map[role]
      used.delete(role)
    }
  }
  walk(0, new Set(), 0, {})
  return best.map
}

export const rolesLeft = (picks: readonly string[], slots: readonly Slot[]): Role[] => {
  const assigned = assignRoles(picks, slots)
  return ROLES.filter((r) => !assigned[r])
}

export type AiAction = { type: 'ban'; champ: string } | { type: 'pick'; champ: string }

/** Escolha automática do draft: bane conforto/meta do rival e pega o melhor campeão por posição livre. */
export function aiAction(s: DraftState, ctx: DraftContext, rng: Rng): AiAction | null {
  const step = currentStep(s)
  if (!step) return null
  const available = CHAMPIONS.filter((c) => isAvailable(s, c.id))
  if (step.type === 'ban') {
    let best: { id: string; score: number } | null = null
    for (const c of available) {
      const score = banScore(c, step.side, ctx) + rng.next() * 0.6
      if (!best || score > best.score) best = { id: c.id, score }
    }
    return best ? { type: 'ban', champ: best.id } : null
  }
  let best: { role: Role; id: string; score: number } | null = null
  for (const role of rolesLeft(s.picks[step.side], ctx.slots[step.side])) {
    for (const c of available) {
      const score = pickScore(c, role, step.side, s, ctx) + rng.next() * 0.6
      if (Number.isFinite(score) && (!best || score > best.score)) best = { role, id: c.id, score }
    }
  }
  return best ? { type: 'pick', champ: best.id } : null
}

export function applyAi(s: DraftState, action: AiAction | null): DraftState {
  if (!action) return s
  return action.type === 'ban' ? applyBan(s, action.champ) : applyPick(s, action.champ)
}

/**
 * Resultado final do draft. As posições do lado do usuário podem vir da tela de definição
 * (overrides); as demais são distribuídas automaticamente pela melhor combinação.
 */
export function toResult(s: DraftState, ctx: DraftContext, overrides: Partial<Record<DraftSide, Record<Role, string>>> = {}): DraftResult {
  const full = (side: DraftSide): Record<Role, string> => {
    const chosen = overrides[side]
    if (chosen) return chosen
    const auto = assignRoles(s.picks[side], ctx.slots[side])
    return Object.fromEntries(ROLES.map((r) => [r, auto[r] ?? 'Garen'])) as Record<Role, string>
  }
  return { bans: s.bans, picks: { blue: full('blue'), red: full('red') } }
}

/** Gera, passo a passo, todos os estados de um draft completo (bans e picks dos dois times) decidido pela IA. */
export function draftTimeline(ctx: DraftContext, used: string[], rng: Rng): DraftState[] {
  const states: DraftState[] = []
  let s = initDraft(used)
  while (!isDraftComplete(s)) {
    const next = applyAi(s, aiAction(s, ctx, rng))
    s = next === s ? (currentStep(s)?.type === 'ban' ? applyBan(s, null) : { ...s, step: s.step + 1 }) : next
    states.push(s)
  }
  return states
}

/** Draft completo decidido pela IA dos dois lados (partidas simuladas / botão automático). */
export function autoDraft(ctx: DraftContext, used: string[], rng: Rng): DraftResult {
  let s = initDraft(used)
  while (!isDraftComplete(s)) {
    const next = applyAi(s, aiAction(s, ctx, rng))
    if (next === s) {
      // salvaguarda: sem opção válida, pula o passo
      s = currentStep(s)?.type === 'ban' ? applyBan(s, null) : { ...s, step: s.step + 1 }
    } else s = next
  }
  return toResult(s, ctx)
}

/** Efeito do draft na simulação: conforto, encaixe de lane e composição do time. */
export function championMods(
  champs: Record<Role, string>,
  slots: readonly Slot[],
): { adj: Partial<Record<Role, number>>; phase: { early: number; mid: number; late: number; teamfight: number } } {
  const adj: Partial<Record<Role, number>> = {}
  const list: Champion[] = []
  for (const slot of slots) {
    const champ = findChampion(champs[slot.role] ?? '')
    if (!champ) continue
    list.push(champ)
    let a = TIER_SCORE[champ.tier] * 0.6 - 1
    if (slot.player.champs.includes(champ.id)) a += 3
    if (!champ.lanes.includes(slot.role)) a -= 5
    adj[slot.role] = a
  }
  if (list.length === 0) return { adj, phase: { early: 0, mid: 0, late: 0, teamfight: 0 } }
  const avg = (k: 'early' | 'late' | 'tf'): number => list.reduce((s, c) => s + c[k], 0) / list.length - 5.2
  const ap = list.filter((c) => c.ap).length
  const ad = list.filter((c) => !c.ap && !c.tags.includes('Tank')).length
  const balance = ap === 0 || ad === 0 || ap >= 4 || ad >= 4 ? -2 : 0
  const early = avg('early') * 1.5
  const late = avg('late') * 1.5
  return {
    adj,
    phase: { early: early + balance, mid: (early + late) / 2 + balance, late: late + balance, teamfight: avg('tf') * 1.5 + balance },
  }
}
