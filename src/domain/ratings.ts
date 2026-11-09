import { getConfig } from './config'
import type { Lineup, Phase, Player, Role, Team } from './types'
import { ROLES } from './types'

export const PHASE_WEIGHTS: Record<Phase, Record<Role, number>> = {
  early: { Top: 0.9, Jungle: 1.4, Mid: 1.1, ADC: 0.9, Suporte: 0.9 },
  mid: { Top: 1, Jungle: 1.1, Mid: 1.2, ADC: 1, Suporte: 0.9 },
  late: { Top: 0.9, Jungle: 0.9, Mid: 1.1, ADC: 1.4, Suporte: 0.8 },
  teamfight: { Top: 0.9, Jungle: 1, Mid: 1.1, ADC: 1.2, Suporte: 1.1 },
}

export const STYLE_MULT: Record<string, Record<Phase, number>> = {
  balanced: { early: 1, mid: 1, late: 1, teamfight: 1 },
  early: { early: 1.05, mid: 1.01, late: 0.96, teamfight: 1 },
  scaling: { early: 0.96, mid: 1, late: 1.05, teamfight: 1.01 },
  teamfight: { early: 0.98, mid: 1.01, late: 1.01, teamfight: 1.05 },
}

export const OFF_ROLE_PENALTY = 0.8

export interface Slot {
  role: Role
  player: Player
}

export function isAvailable(p: Player): boolean {
  return p.outRounds <= 0
}

/** Força efetiva considerando moral (±12%) e posição improvisada. */
export function effectiveOvr(p: Player, slot: Role): number {
  const moraleFactor = 1 + (p.morale - 50) / 400
  const roleFactor = p.role === slot ? 1 : OFF_ROLE_PENALTY
  return p.ovr * moraleFactor * roleFactor * (p.leadFoot ? 1 - getConfig().sim.leadFootPenalty / 100 : 1)
}

export interface PowerExtra {
  /** ajuste por posição vindo do draft (conforto, encaixe) */
  adj?: Partial<Record<Role, number>>
  /** bônus de composição por fase */
  phase?: Partial<Record<Phase, number>>
}

export function sidePower(slots: readonly Slot[], team: Team, phase: Phase, extra?: PowerExtra): number {
  const weights = PHASE_WEIGHTS[phase]
  let sum = 0
  let total = 0
  for (const s of slots) {
    sum += weights[s.role] * (effectiveOvr(s.player, s.role) + (extra?.adj?.[s.role] ?? 0))
    total += weights[s.role]
  }
  const chemistry = 1 + (team.chemistry - 50) / 800
  const style = STYLE_MULT[team.tactic]?.[phase] ?? 1
  return total === 0 ? 0 : (sum / total) * chemistry * style + (extra?.phase?.[phase] ?? 0)
}

/** Monta a melhor escalação possível entre os jogadores disponíveis. */
export function bestLineup(roster: readonly Player[]): Lineup {
  const available = roster.filter(isAvailable)
  const used = new Set<string>()
  const lineup: Lineup = {}
  for (const role of ROLES) {
    const best = available
      .filter((p) => p.role === role && !used.has(p.id))
      .sort((a, b) => b.ovr - a.ovr)[0]
    if (best) {
      lineup[role] = best.id
      used.add(best.id)
    }
  }
  for (const role of ROLES) {
    if (lineup[role]) continue
    const fill = available
      .filter((p) => !used.has(p.id))
      .sort((a, b) => b.ovr - a.ovr)[0]
    if (fill) {
      lineup[role] = fill.id
      used.add(fill.id)
    }
  }
  return lineup
}

/** Valida a escalação salva; substitui ausentes/indisponíveis automaticamente. */
export function resolveSlots(team: Team, roster: readonly Player[]): Slot[] {
  const byId = new Map(roster.map((p) => [p.id, p]))
  const auto = bestLineup(roster)
  const used = new Set<string>()
  const slots: Slot[] = []
  for (const role of ROLES) {
    const saved = team.lineup[role] ? byId.get(team.lineup[role]) : undefined
    if (saved && isAvailable(saved) && !used.has(saved.id)) {
      used.add(saved.id)
      slots.push({ role, player: saved })
    }
  }
  for (const role of ROLES) {
    if (slots.some((s) => s.role === role)) continue
    const candidate =
      roster
        .filter((p) => isAvailable(p) && !used.has(p.id) && p.role === role)
        .sort((a, b) => b.ovr - a.ovr)[0] ??
      roster
        .filter((p) => isAvailable(p) && !used.has(p.id))
        .sort((a, b) => b.ovr - a.ovr)[0] ??
      // último recurso: com menos de 5 jogadores aptos, escala quem está ausente (o time nunca joga incompleto)
      roster
        .filter((p) => !used.has(p.id))
        .sort((a, b) => b.ovr - a.ovr)[0]
    const id = candidate?.id ?? auto[role]
    const player = id ? byId.get(id) : undefined
    if (player && !used.has(player.id)) {
      used.add(player.id)
      slots.push({ role, player })
    }
  }
  return slots.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role))
}

export function teamOverall(slots: readonly Slot[]): number {
  if (slots.length === 0) return 0
  const sum = slots.reduce((acc, s) => acc + effectiveOvr(s.player, s.role), 0)
  return Math.round((sum / slots.length) * 10) / 10
}

export function playerValue(p: Pick<Player, 'ovr' | 'potential' | 'age'>): number {
  const base = Math.max(0, p.ovr - 35) ** 2 * 60
  const youth = Math.max(0, p.potential - p.ovr) * 350
  const agePenalty = p.age > 27 ? (p.age - 27) * 0.05 : 0
  return Math.round(((base + youth) * (1 - Math.min(0.4, agePenalty))) / 100) * 100
}

export function salaryFor(ovr: number): number {
  return Math.round(Math.max(0, ovr - 35) * 12)
}
