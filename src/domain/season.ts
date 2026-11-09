import { produce } from 'immer'
import type { Draft } from 'immer'
import { getConfig } from './config'
import type { BestOf } from './config'
import { simulateSeries } from './engine'
import { createRng } from './rng'
import type { Rng } from './rng'
import { bestLineup, resolveSlots, salaryFor, teamOverall } from './ratings'
import { buildPlayer, createWorld, emptyStats } from './seed'
import type { AdminPlayer } from './seed'
import { addNews, aiTransfer, generateOffers, rosterOf } from './transfers'
import { ROLES, ROSTER_MIN } from './types'
import type { DraftResult, GameData, GameResult, Match, Player, PlayerStats, SeasonPhase, Side } from './types'

export const isRegular = (m: { stage: string }): boolean => m.stage.startsWith('Rodada')
const PRIZES = [30000, 15000, 8000, 4000]
const OUT_REASONS = ['Queda de internet', 'Problema pessoal', 'Doente', 'Sem energia elétrica', 'Suspenso por toxicidade']

export interface StandingRow {
  teamId: string
  played: number
  wins: number
  losses: number
  diff: number
}

export function computeStandings(data: Pick<GameData, 'matches' | 'teams'>): StandingRow[] {
  const rows = new Map<string, StandingRow>(
    Object.keys(data.teams).map((id) => [id, { teamId: id, played: 0, wins: 0, losses: 0, diff: 0 }]),
  )
  const regular = data.matches.filter((m) => isRegular(m) && m.played)
  for (const m of regular) {
    const h = rows.get(m.homeId)
    const a = rows.get(m.awayId)
    if (!h || !a) continue
    h.played++
    a.played++
    h.diff += m.score[0] - m.score[1]
    a.diff += m.score[1] - m.score[0]
    if (m.score[0] > m.score[1]) {
      h.wins++
      a.losses++
    } else {
      a.wins++
      h.losses++
    }
  }
  const h2h = (x: string, y: string): number => {
    const m = regular.find((r) => (r.homeId === x && r.awayId === y) || (r.homeId === y && r.awayId === x))
    if (!m) return 0
    const homeWon = m.score[0] > m.score[1]
    const winner = homeWon ? m.homeId : m.awayId
    return winner === x ? -1 : 1
  }
  return [...rows.values()].sort(
    (a, b) => b.wins - a.wins || b.diff - a.diff || h2h(a.teamId, b.teamId) || a.teamId.localeCompare(b.teamId),
  )
}

export function seasonPhase(data: Pick<GameData, 'matches'>): SeasonPhase {
  if (data.matches.length === 0) return 'regular'
  if (data.matches.every((m) => m.played) && data.matches.some((m) => m.stage === 'Grande Final')) return 'finished'
  const next = nextDay(data)
  const upcoming = data.matches.find((m) => m.day === next)
  return upcoming && !isRegular(upcoming) ? 'playoffs' : 'regular'
}

export function nextDay(data: Pick<GameData, 'matches'>): number | null {
  const pending = data.matches.filter((m) => !m.played).map((m) => m.day)
  return pending.length ? Math.min(...pending) : null
}

export function userMatchOnDay(data: GameData, day: number): Match | undefined {
  return data.matches.find((m) => m.day === day && (m.homeId === data.userTeamId || m.awayId === data.userTeamId))
}

function roundRobin(teamIds: string[]): [string, string][][] {
  const BYE = '__bye__'
  const arr = teamIds.length % 2 === 0 ? [...teamIds] : [...teamIds, BYE]
  const n = arr.length
  const rounds: [string, string][][] = []
  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = []
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i]!
      const b = arr[n - 1 - i]!
      pairs.push(r % 2 === 0 ? [a, b] : [b, a])
    }
    rounds.push(pairs.filter(([a, b]) => a !== BYE && b !== BYE))
    arr.splice(1, 0, arr.pop()!)
  }
  return rounds
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(0, i)
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

export function createSchedule(draft: Draft<GameData>, rng: Rng): void {
  const single = roundRobin(shuffle(Object.keys(draft.teams), rng))
  const rounds: [string, string][][] = getConfig().league.doubleRoundRobin
    ? [...single, ...single.map((r) => r.map(([a, b]) => [b, a] as [string, string]))]
    : single
  draft.matches = []
  rounds.forEach((pairs, r) => {
    for (const [homeId, awayId] of pairs) {
      draft.matches.push({
        id: draft.nextId++, day: r + 1, stage: `Rodada ${r + 1}`, homeId, awayId,
        bestOf: 1, games: [], score: [0, 0], played: false,
      })
    }
  })
}

const FIRST_NAMES = ['Zed', 'Kai', 'Lulu', 'Nox', 'Pip', 'Rek', 'Tux', 'Yuri', 'Bia', 'Dan', 'Fay', 'Gui']
const LAST_NAMES = ['Gamer', 'Ferro', 'Bronze', 'Solo', 'Lag', 'Feed', 'Carry', 'Noob', 'Top1', 'BR', 'Mage', 'Tank']

function freeAgentPool(draft: Draft<GameData>, rng: Rng, count: number): void {
  const roles = ['Top', 'Jungle', 'Mid', 'ADC', 'Suporte'] as const
  for (let i = 0; i < count; i++) {
    const name = `${rng.pick(FIRST_NAMES)}${rng.pick(LAST_NAMES)}${rng.int(1, 99)}`
    const p = buildPlayer(name, roles[i % roles.length]!, null, 45, draft.season)
    p.ovr = rng.int(38, 56)
    p.potential = Math.min(80, p.ovr + rng.int(0, 12))
    p.salary = salaryFor(p.ovr)
    if (!draft.players[p.id]) draft.players[p.id] = p
  }
}

function setAiLineups(draft: Draft<GameData>): void {
  for (const team of Object.values(draft.teams)) {
    if (team.id === draft.userTeamId) continue
    team.lineup = bestLineup(rosterOf(draft, team.id))
  }
}

export function startNewGame(userTeamId: string, seed: number, db?: AdminPlayer[] | null): GameData {
  const rng = createRng(seed)
  const base = createWorld(userTeamId, seed, db)
  const data = produce(base, (draft) => {
    createSchedule(draft, rng)
    freeAgentPool(draft, rng, 10)
    for (const t of Object.values(draft.teams)) t.lineup = bestLineup(rosterOf(draft, t.id))
    addNews(draft, 'A temporada 1 do CBLOW está prestes a começar! Boa sorte, presidente.', 'clube')
    draft.seed = rng.state()
  })
  return data
}

function addStats(target: PlayerStats, pick: { kills: number; deaths: number; assists: number; cs: number }, won: boolean, mvp: boolean, minutes: number): void {
  target.games++
  target.wins += won ? 1 : 0
  target.kills += pick.kills
  target.deaths += pick.deaths
  target.assists += pick.assists
  target.cs += pick.cs
  target.mvps += mvp ? 1 : 0
  target.minutes += minutes
}

function applyGame(draft: Draft<GameData>, game: GameResult): void {
  game.picks.forEach((picks, i) => {
    const side: Side = i === 0 ? 'home' : 'away'
    for (const pick of picks) {
      const p = draft.players[pick.playerId]
      if (!p) continue
      const won = game.winner === side
      const mvp = pick.playerId === game.mvpId
      addStats(p.stats, pick, won, mvp, game.minutes)
      addStats(p.career, pick, won, mvp, game.minutes)
      p.morale = Math.max(0, Math.min(100, p.morale + (won ? 4 : -4) + (mvp ? 3 : 0)))
    }
  })
}

function teamName(draft: Draft<GameData>, id: string): string {
  return draft.teams[id]?.name ?? id
}

function finishSeason(draft: Draft<GameData>): void {
  const final = draft.matches.find((m) => m.stage === 'Grande Final')!
  const third = draft.matches.find((m) => m.stage === 'Disputa do 3º lugar')!
  const winnerOf = (m: Draft<Match>): string => (m.score[0] > m.score[1] ? m.homeId : m.awayId)
  const loserOf = (m: Draft<Match>): string => (m.score[0] > m.score[1] ? m.awayId : m.homeId)
  const order = [winnerOf(final), loserOf(final), winnerOf(third), loserOf(third)]
  const standings = computeStandings(draft)
  for (const row of standings) if (!order.includes(row.teamId)) order.push(row.teamId)
  draft.finalPosition = Object.fromEntries(order.map((id, i) => [id, i + 1]))

  order.forEach((id, i) => {
    const team = draft.teams[id]
    if (team) team.cash += Math.round((PRIZES[i] ?? 1000) * getConfig().league.prizeMultiplier)
  })
  const byReputation = Object.values(draft.teams).sort((a, b) => b.reputation - a.reputation).map((t) => t.id)
  const expected = byReputation.indexOf(draft.userTeamId) + 1
  const actual = draft.finalPosition[draft.userTeamId] ?? 8
  draft.confidence = Math.max(0, Math.min(100, draft.confidence + (expected - actual) * 6 + (actual === 1 ? 15 : 0)))
  draft.fired = draft.confidence < 20

  const topKiller = Object.values(draft.players).sort((a, b) => b.stats.kills - a.stats.kills)[0]
  draft.history.push({
    season: draft.season,
    championId: order[0]!, runnerUpId: order[1]!, thirdId: order[2]!,
    topKillerId: topKiller?.id ?? '', userPosition: actual,
  })
  addNews(draft, `${teamName(draft, order[0]!)} é o campeão da temporada ${draft.season} do CBLOW!`, 'clube', draft.matches.at(-1)?.day ?? 0)
}

function createPlayoffs(draft: Draft<GameData>, stage: string, day: number): void {
  const semiDay = Math.max(...draft.matches.map((m) => m.day)) + 1
  const finished = (stage: string): Draft<Match> | undefined => draft.matches.find((m) => m.stage === stage)
  const push = (stage: string, d: number, homeId: string, awayId: string, bestOf: BestOf): void => {
    draft.matches.push({ id: draft.nextId++, day: d, stage, homeId, awayId, bestOf, games: [], score: [0, 0], played: false })
  }
  if (isRegular({ stage })) {
    const top = computeStandings(draft).map((r) => r.teamId)
    push('Semifinal', semiDay, top[0]!, top[3]!, getConfig().league.semiBestOf)
    push('Semifinal', semiDay, top[1]!, top[2]!, getConfig().league.semiBestOf)
    addNews(draft, 'Fim da fase de classificação! Os playoffs (semifinais) estão definidos.', 'clube', day)
  } else if (stage === 'Semifinal') {
    const semis = draft.matches.filter((m) => m.stage === 'Semifinal')
    const w = semis.map((m) => (m.score[0] > m.score[1] ? m.homeId : m.awayId))
    const l = semis.map((m) => (m.score[0] > m.score[1] ? m.awayId : m.homeId))
    push('Grande Final', day + 1, w[0]!, w[1]!, getConfig().league.finalBestOf)
    push('Disputa do 3º lugar', day + 1, l[0]!, l[1]!, getConfig().league.thirdBestOf)
    void finished
  }
}

function postDayProcessing(draft: Draft<GameData>, day: number, played: Match[], rng: Rng): void {
  const playingTeams = new Set(played.flatMap((m) => [m.homeId, m.awayId]))
  const winners = new Set(played.map((m) => (m.score[0] > m.score[1] ? m.homeId : m.awayId)))

  for (const p of Object.values(draft.players)) {
    if (p.outRounds > 0) {
      p.outRounds--
      if (p.outRounds === 0) p.outReason = ''
    } else if (p.teamId && playingTeams.has(p.teamId) && rng.chance(0.03)) {
      p.outRounds = rng.int(1, 2)
      p.outReason = rng.pick(OUT_REASONS)
      if (p.teamId === draft.userTeamId) addNews(draft, `${p.name} está fora: ${p.outReason}.`, 'jogador', day)
    }
    if (p.teamId && !playingTeams.has(p.teamId)) p.morale += Math.sign(50 - p.morale)
    if (p.teamId && p.age <= 24 && p.ovr < p.potential && rng.chance(0.08)) p.ovr++
  }

  for (const id of playingTeams) {
    const team = draft.teams[id]
    if (!team) continue
    const payroll = rosterOf(draft, id).reduce((sum, p) => sum + Math.round(p.salary * getConfig().league.salaryMultiplier), 0)
    const income = team.reputation * 45 + (winners.has(id) ? 900 : 0) + 1200
    team.cash += income - payroll
    team.chemistry = Math.min(100, team.chemistry + 3)
  }

  setAiLineups(draft)
  for (const m of played) {
    const [h, a] = m.score
    const w = h > a ? m.homeId : m.awayId
    const l = h > a ? m.awayId : m.homeId
    const wp = draft.teams[w]!
    const lp = draft.teams[l]!
    const ovrW = teamOverall(resolveSlots(wp, rosterOf(draft, w)))
    const ovrL = teamOverall(resolveSlots(lp, rosterOf(draft, l)))
    const upset = ovrW + 3 < ovrL
    const mvp = draft.players[m.games.at(-1)?.mvpId ?? '']
    addNews(
      draft,
      `${upset ? 'ZEBRA! ' : ''}${wp.name} vence ${lp.name} por ${Math.max(h, a)}x${Math.min(h, a)} (${m.stage})${mvp ? ` — MVP: ${mvp.name}` : ''}.`,
      'resultado',
      day,
    )
  }

  draft.offers = draft.offers.filter((o) => o.expiresDay >= day)
  generateOffers(draft, rng, day)
  if (rng.chance(0.3)) aiTransfer(draft, rng, day)

  const mine = played.find((m) => m.homeId === draft.userTeamId || m.awayId === draft.userTeamId)
  if (mine) {
    const iAmHome = mine.homeId === draft.userTeamId
    const won = iAmHome ? mine.score[0] > mine.score[1] : mine.score[1] > mine.score[0]
    draft.confidence = Math.max(0, Math.min(100, draft.confidence + (won ? 3 : -3)))
  }
}

export interface DayResult {
  data: GameData
  day: number | null
  userMatchId: number | null
}

/** Simula todas as partidas do próximo dia do calendário. */
export function playNextDay(data: GameData, userDrafts: readonly DraftResult[] = []): DayResult {
  const day = nextDay(data)
  if (day === null) return { data, day: null, userMatchId: null }
  const rng = createRng(data.seed)
  let userMatchId: number | null = null
  const next = produce(data, (draft) => {
    setAiLineups(draft)
    const played: Match[] = []
    for (const match of draft.matches.filter((m) => m.day === day)) {
      const sides = [match.homeId, match.awayId].map((id) => {
        const team = draft.teams[id]!
        return { team: team as GameData['teams'][string], slots: resolveSlots(team as GameData['teams'][string], rosterOf(draft as GameData, id)) }
      }) as [{ team: GameData['teams'][string]; slots: ReturnType<typeof resolveSlots> }, { team: GameData['teams'][string]; slots: ReturnType<typeof resolveSlots> }]
      const isMine = match.homeId === draft.userTeamId || match.awayId === draft.userTeamId
      const result = simulateSeries(sides[0], sides[1], match.bestOf, rng, isMine ? userDrafts : [])
      match.games = result.games
      match.score = result.score
      match.played = true
      for (const g of result.games) applyGame(draft, g)
      played.push(match as Match)
      if (match.homeId === draft.userTeamId || match.awayId === draft.userTeamId) userMatchId = match.id
    }
    postDayProcessing(draft, day, played, rng)
    const stage = played[0]?.stage ?? ''
    const regularLeft = draft.matches.some((m) => isRegular(m) && !m.played)
    if ((isRegular({ stage }) && !regularLeft) || stage === 'Semifinal') createPlayoffs(draft, stage, day)
    if (played.some((m) => m.stage === 'Grande Final')) finishSeason(draft)
    draft.seed = rng.state()
  })
  return { data: next, day, userMatchId }
}

export function startNextSeason(data: GameData): GameData {
  const rng = createRng(data.seed)
  return produce(data, (draft) => {
    draft.season++
    const fresh = (): PlayerStats => emptyStats()
    // Contratos vencidos do usuário: saem, exceto o mínimo para manter o time jogável
    // (uma pessoa por posição e pelo menos ROSTER_MIN jogadores) — esses são renovados automaticamente.
    const autoRenew = new Set<string>()
    {
      const mine = Object.values(draft.players).filter((p) => p.teamId === draft.userTeamId)
      const kept = mine.filter((p) => p.contractEnd >= draft.season)
      const expiring = mine.filter((p) => p.contractEnd < draft.season).sort((a, b) => b.ovr - a.ovr)
      const keep = (p: Draft<Player>): void => {
        autoRenew.add(p.id)
        kept.push(p)
      }
      for (const role of ROLES) {
        if (kept.some((p) => p.role === role)) continue
        const best = expiring.find((p) => p.role === role && !autoRenew.has(p.id))
        if (best) keep(best)
      }
      for (const p of expiring) {
        if (kept.length >= ROSTER_MIN) break
        if (!autoRenew.has(p.id)) keep(p)
      }
    }

    for (const p of Object.values(draft.players) as Draft<Player>[]) {
      p.age++
      const delta = p.age <= 23 ? rng.int(0, 3) : p.age <= 27 ? rng.int(-1, 2) : p.age <= 30 ? rng.int(-2, 1) : rng.int(-3, 0)
      p.ovr = Math.max(25, Math.min(p.age <= 23 ? p.potential : 90, p.ovr + delta))
      p.potential = Math.max(p.potential, p.ovr)
      p.stats = fresh()
      p.outRounds = 0
      p.outReason = ''
      p.morale = 55
      if (p.teamId && p.contractEnd < draft.season) {
        if (p.teamId === draft.userTeamId && autoRenew.has(p.id)) {
          p.salary = salaryFor(p.ovr)
          p.contractEnd = draft.season
          addNews(draft, `${p.name} teve o contrato renovado automaticamente por mais uma temporada.`, 'jogador')
        } else if (p.teamId === draft.userTeamId) {
          p.teamId = null
          addNews(draft, `${p.name} deixou o clube: contrato expirado.`, 'jogador')
        } else {
          p.salary = salaryFor(p.ovr)
          p.contractEnd = draft.season + rng.int(0, 1)
        }
      }
    }
    const pool = Object.values(draft.players).filter((p) => p.teamId === null).sort((a, b) => b.ovr - a.ovr)
    for (const worst of pool.slice(14)) delete draft.players[worst.id]
    freeAgentPool(draft, rng, 8)
    draft.matches = []
    draft.offers = []
    draft.finalPosition = {}
    for (const t of Object.values(draft.teams)) {
      t.chemistry = Math.round(t.chemistry * 0.6 + 20)
      t.reputation = Math.max(10, Math.min(95, t.reputation + (t.id === draft.userTeamId ? 0 : 0)))
    }
    createSchedule(draft, rng)
    setAiLineups(draft)
    addNews(draft, `Começa a temporada ${draft.season} do CBLOW!`, 'clube')
    draft.seed = rng.state()
  })
}

/** Simula o dia sem gravar: usado pelo draft para saber quantos jogos a série terá. */
export function previewUserSeries(data: GameData, drafts: readonly DraftResult[]): Match | undefined {
  const { data: after, userMatchId } = playNextDay(data, drafts)
  return after.matches.find((m) => m.id === userMatchId)
}

export function changeTeam(data: GameData, teamId: string): GameData {
  return produce(data, (draft) => {
    draft.userTeamId = teamId
    draft.fired = false
    draft.confidence = 55
    draft.offers = []
  })
}
