import { produce } from 'immer'
import { getConfig } from './config'
import { createRng } from './rng'
import { bestLineup, playerValue, salaryFor } from './ratings'
import { createSchedule } from './season'
import { buildPlayer, createWorld, slugify } from './seed'
import type { AdminPlayer } from './seed'
import { addNews, rosterOf } from './transfers'
import type { GameData, Player, Role, Style, Team } from './types'
import { ROLES, ROSTER_MAX, ROSTER_MIN } from './types'

export const startBudget = (): number => getConfig().league.startBudget
export const TEAM_COLORS = ['#d79c6d', '#5fd39a', '#6bb5d7', '#8f6bd7', '#ef5f6b', '#f0b429', '#e07ac2', '#9ad94f'] as const

export type JoinMode = { kind: 'add' } | { kind: 'replace'; teamId: string }

export interface CustomPlayerInput {
  name: string
  role: Role
  age: number
  ovr: number
}

export interface CustomTeamConfig {
  name: string
  tag: string
  presidents: string
  color: string
  tactic: Style
  mode: JoinMode
  /** ids de jogadores do pool (agentes livres ou do clube substituído) */
  signedIds: string[]
  created: CustomPlayerInput[]
}

export const CUSTOM_OVR_MIN = 38
export const CUSTOM_OVR_MAX = 62

/** Preço de fundação: contratar do pool custa metade do valor; criar um jogador custa 70%. */
export const foundingCost = (p: Pick<Player, 'ovr' | 'potential' | 'age'>): number => Math.round(playerValue(p) * 0.5)
export const creationCost = (input: Pick<CustomPlayerInput, 'ovr' | 'age'>): number =>
  Math.round(playerValue({ ovr: input.ovr, potential: input.ovr + 4, age: input.age }) * 0.7)

/** Pool determinístico de agentes livres para montar o elenco inicial. */
export function generatePool(seed: number, count = 30): Player[] {
  const rng = createRng(seed ^ 0x9e3779b9)
  const first = ['Zed', 'Kai', 'Lulu', 'Nox', 'Pip', 'Rek', 'Tux', 'Yuri', 'Bia', 'Dan', 'Fay', 'Gui']
  const last = ['Gamer', 'Ferro', 'Bronze', 'Solo', 'Lag', 'Feed', 'Carry', 'Noob', 'Top1', 'BR', 'Mage', 'Tank']
  const pool: Player[] = []
  for (let i = 0; i < count; i++) {
    const role = ROLES[i % ROLES.length]!
    const name = `${rng.pick(first)}${rng.pick(last)}${rng.int(1, 99)}`
    const p = buildPlayer(name, role, null, 45, 1)
    p.ovr = rng.int(38, 58)
    p.potential = Math.min(80, p.ovr + rng.int(0, 12))
    p.salary = salaryFor(p.ovr)
    if (!pool.some((x) => x.id === p.id)) pool.push(p)
  }
  return pool
}

/** Jogadores disponíveis para o draft inicial: pool + elenco do clube que será substituído. */
export function availablePool(seed: number, mode: JoinMode, db?: AdminPlayer[] | null): Player[] {
  const pool = generatePool(seed)
  if (mode.kind !== 'replace') return pool
  const base = createWorld(mode.teamId, seed, db)
  return [...rosterOf(base, mode.teamId), ...pool]
}

export function validateCustomTeam(cfg: CustomTeamConfig, seed: number, db?: AdminPlayer[] | null): string[] {
  const errors: string[] = []
  const base = createWorld('amigosdomylennzy', seed, db)
  const name = cfg.name.trim()
  if (name.length < 3) errors.push('O nome do time precisa ter ao menos 3 caracteres.')
  const taken = Object.values(base.teams).some(
    (t) => t.name.toLowerCase() === name.toLowerCase() && !(cfg.mode.kind === 'replace' && t.id === cfg.mode.teamId),
  )
  if (taken) errors.push('Já existe um time com esse nome.')
  if (cfg.presidents.trim().length < 2) errors.push('Informe o(s) presidente(s) do time.')
  if (cfg.mode.kind === 'replace' && !base.teams[cfg.mode.teamId]) errors.push('Escolha qual time será substituído.')

  const pool = availablePool(seed, cfg.mode, db)
  const signed = cfg.signedIds.map((id) => pool.find((p) => p.id === id)).filter((p): p is Player => !!p)
  const roles: Role[] = [...signed.map((p) => p.role), ...cfg.created.map((p) => p.role)]
  const total = roles.length
  if (total < ROSTER_MIN) errors.push(`Monte um elenco com ao menos ${ROSTER_MIN} jogadores (hoje: ${total}).`)
  if (total > ROSTER_MAX) errors.push(`O elenco pode ter no máximo ${ROSTER_MAX} jogadores.`)
  for (const role of ROLES) if (!roles.includes(role)) errors.push(`Falta um jogador de ${role}.`)
  const names = cfg.created.map((p) => p.name.trim())
  if (names.some((n) => n.length < 2)) errors.push('Todo jogador criado precisa de um nome.')
  const allNames = [...signed.map((p) => p.name.toLowerCase()), ...names.map((n) => n.toLowerCase())]
  if (new Set(allNames).size !== allNames.length) errors.push('Há jogadores com nomes repetidos no elenco.')
  const existing = new Set(Object.values(base.players).map((p) => p.id))
  if (cfg.created.some((p) => existing.has(slugify(p.name)))) errors.push('Um jogador criado usa o nome de um jogador do campeonato.')
  const spent = totalCost(cfg, pool)
  if (spent > startBudget()) errors.push('O elenco ultrapassa o orçamento inicial.')
  return errors
}

export function totalCost(cfg: Pick<CustomTeamConfig, 'signedIds' | 'created'>, pool: Player[]): number {
  const signed = cfg.signedIds.reduce((sum, id) => {
    const p = pool.find((x) => x.id === id)
    return sum + (p ? foundingCost(p) : 0)
  }, 0)
  return signed + cfg.created.reduce((sum, c) => sum + creationCost(c), 0)
}

/** Cria o mundo do jogo com o novo clube (como 9º time ou no lugar de um existente). */
export function createCustomGame(cfg: CustomTeamConfig, seed: number, db?: AdminPlayer[] | null): GameData {
  const errors = validateCustomTeam(cfg, seed, db)
  if (errors.length) throw new Error(errors[0])
  const rng = createRng(seed)
  const pool = availablePool(seed, cfg.mode, db)
  const base = createWorld('amigosdomylennzy', seed, db)
  const baseTeamIds = new Set(Object.keys(base.teams))

  let teamId = slugify(cfg.name.trim())
  if (baseTeamIds.has(teamId) && !(cfg.mode.kind === 'replace' && cfg.mode.teamId === teamId)) teamId += '-fc'

  return produce(base, (draft) => {
    if (cfg.mode.kind === 'replace') {
      const old = cfg.mode.teamId
      for (const p of Object.values(draft.players)) if (p.teamId === old) p.teamId = null
      delete draft.teams[old]
    }
    const team: Team = {
      id: teamId,
      name: cfg.name.trim().toUpperCase(),
      presidents: cfg.presidents.trim(),
      cash: startBudget() - totalCost(cfg, pool),
      reputation: 40,
      tactic: cfg.tactic,
      lineup: {},
      chemistry: 40,
      tag: (cfg.tag.trim() || cfg.name.trim().slice(0, 3)).toUpperCase().slice(0, 4),
      color: cfg.color,
      custom: true,
    }
    draft.teams[teamId] = team
    draft.userTeamId = teamId

    // Pool de agentes livres (inclui quem não foi contratado)
    for (const p of pool) if (!draft.players[p.id]) draft.players[p.id] = p
    for (const id of cfg.signedIds) {
      const p = draft.players[id]
      if (!p) continue
      p.teamId = teamId
      p.contractEnd = 2
      p.salary = salaryFor(p.ovr)
    }
    for (const input of cfg.created) {
      const p = buildPlayer(input.name.trim(), input.role, teamId, 40, 1)
      p.age = input.age
      p.ovr = input.ovr
      p.potential = Math.min(85, input.ovr + (input.age < 22 ? 8 : 3))
      p.salary = salaryFor(p.ovr)
      p.contractEnd = 2
      draft.players[p.id] = p
    }

    draft.confidence = 55
    createSchedule(draft, rng)
    for (const t of Object.values(draft.teams)) {
      t.lineup = bestLineup(Object.values(draft.players).filter((p) => p.teamId === t.id))
    }
    addNews(
      draft,
      cfg.mode.kind === 'replace'
        ? `${team.name} assume a vaga de um clube e estreia no CBLOW!`
        : `${team.name} chega como 9º clube do CBLOW — haverá folga em uma rodada para cada time.`,
      'clube',
    )
    draft.seed = rng.state()
  })
}
