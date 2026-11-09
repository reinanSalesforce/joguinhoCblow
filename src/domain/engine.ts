import type { Rng } from './rng'
import { getConfig } from './config'
import { autoDraft, championMods, findChampion } from './draft'
import { effectiveOvr, sidePower } from './ratings'
import type { PowerExtra } from './ratings'
import type { Slot } from './ratings'
import { champName } from './champName'
import { BARON_PIT, CENTER, DRAGON_PIT, LANE_LABEL, lanePos, towerPositions } from './mapGeometry'
import type { DraftResult, GameEvent, GamePick, GameResult, Phase, Role, Scene, Side, Team } from './types'
import { ROLES } from './types'

export interface SideSetup {
  team: Team
  slots: Slot[]
}

const KILL_WEIGHT: Record<Role, number> = { Top: 0.18, Jungle: 0.24, Mid: 0.25, ADC: 0.25, Suporte: 0.08 }
const DEATH_WEIGHT: Record<Role, number> = { Top: 0.2, Jungle: 0.2, Mid: 0.18, ADC: 0.2, Suporte: 0.22 }
const CS_RATE: Record<Role, number> = { Top: 7.2, Jungle: 5.4, Mid: 7.6, ADC: 8.2, Suporte: 1.2 }

const MAX_MINUTES = 70

const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x))
const idx = (side: Side): 0 | 1 => (side === 'home' ? 0 : 1)
const other = (side: Side): Side => (side === 'home' ? 'away' : 'home')

function phaseAt(minute: number): Phase {
  if (minute < 15) return 'early'
  if (minute < 28) return 'mid'
  return 'late'
}

function weightedPick(slots: Slot[], weights: Record<Role, number>, rng: Rng, power: boolean): number {
  const w = slots.map((s) => weights[s.role] * (power ? (effectiveOvr(s.player, s.role) / 60) ** 2 : s.player.leadFoot ? 1.7 : 1))
  const total = w.reduce((a, b) => a + b, 0)
  let r = rng.next() * total
  for (let i = 0; i < w.length; i++) {
    r -= w[i] ?? 0
    if (r <= 0) return i
  }
  return w.length - 1
}

/**
 * Simula uma partida (um jogo) minuto a minuto.
 * Cada minuto pode gerar um evento (luta, dragão, barão). Quem vence leva ouro,
 * abates e chance de derrubar torre; o primeiro a derrubar 8 torres vence.
 */
export function simulateGame(home: SideSetup, away: SideSetup, rng: Rng, draft?: DraftResult): GameResult {
  const cfg = getConfig().sim
  const setups: [SideSetup, SideSetup] = [home, away]
  const mods: [PowerExtra, PowerExtra] = [
    draft ? championMods(draft.picks.blue, home.slots) : {},
    draft ? championMods(draft.picks.red, away.slots) : {},
  ]
  const events: GameEvent[] = []
  const towers: [number, number] = [0, 0]
  const dragons: [number, number] = [0, 0]
  const barons: [number, number] = [0, 0]
  const kills: [number, number] = [0, 0]
  const gold: [number, number] = [2500 * 5, 2500 * 5]
  const baronBuffUntil: [number, number] = [0, 0]
  let nextDragon = 6
  let nextBaron = 20
  let minute = 1

  const picks: [GamePick[], GamePick[]] = [0, 1].map((i) =>
    setups[i as 0 | 1].slots.map((s) => ({
      playerId: s.player.id,
      role: s.role,
      champ: draft ? (draft.picks[i === 0 ? 'blue' : 'red'][s.role] ?? '—') : s.player.champs.length ? rng.pick(s.player.champs) : '—',
      kills: 0,
      deaths: 0,
      assists: 0,
      cs: 0,
    })),
  ) as [GamePick[], GamePick[]]

  const teamName = (side: Side): string => setups[idx(side)].team.name
  const nameOf = (side: Side, i: number): string => {
    const slot = setups[idx(side)].slots[i]!
    const champ = picks[idx(side)][i]?.champ
    return champ && champ !== '—' ? `${slot.player.name} (${champName(champ)})` : slot.player.name
  }
  const pid = (side: Side, i: number): string => setups[idx(side)].slots[i]!.player.id
  const slotIdx = (side: Side, role: Role): number => setups[idx(side)].slots.findIndex((s) => s.role === role)
  const log = (kind: GameEvent['kind'], side: Side | 'none', text: string, amount?: number, scene?: Scene): void => {
    const ev: GameEvent = { minute, side, kind, text }
    if (amount !== undefined) ev.amount = amount
    if (scene) ev.scene = scene
    events.push(ev)
  }
  const subset = (total: number, n: number, must: number[] = []): number[] => {
    const s = new Set(must.filter((i) => i >= 0))
    while (s.size < Math.min(n, total)) s.add(rng.int(0, total - 1))
    return [...s]
  }
  const pickFrom = (side: Side, pool: number[], weights: Record<Role, number>, power: boolean): number => {
    const sl = setups[idx(side)].slots
    const sub = pool.map((i) => sl[i]!)
    return pool[weightedPick(sub, weights, rng, power)]!
  }

  interface KillRec {
    killer: number
    victim: number
  }
  const recordKill = (winSide: Side, killer: number, victim: number, assistPool: number[]): KillRec => {
    const win = idx(winSide)
    const lose = idx(other(winSide))
    picks[win][killer]!.kills++
    picks[lose][victim]!.deaths++
    kills[win]++
    const pool = assistPool.filter((i) => i !== killer)
    const n = Math.min(pool.length, rng.int(1, 3))
    for (let a = 0; a < n; a++) {
      const j = rng.int(0, pool.length - 1)
      picks[win][pool[j]!]!.assists++
      pool.splice(j, 1)
    }
    return { killer, victim }
  }

  const buildScene = (
    place: string,
    pt: { x: number; y: number },
    homeIdx: number[],
    awayIdx: number[],
    recs: { winSide: Side; rec: KillRec }[],
  ): Scene => ({
    x: pt.x,
    y: pt.y,
    place,
    home: homeIdx.map((i) => pid('home', i)),
    away: awayIdx.map((i) => pid('away', i)),
    kills: recs.map(({ winSide, rec }) => ({ killer: pid(winSide, rec.killer), victim: pid(other(winSide), rec.victim) })),
  })

  let winner: Side | null = null

  for (; minute <= MAX_MINUTES && winner === null; minute++) {
    if (!rng.chance(cfg.eventChance)) continue

    const baronReady = minute >= nextBaron
    const dragonReady = minute >= nextDragon
    const kind: 'baron' | 'dragon' | 'fight' =
      baronReady && rng.chance(0.5) ? 'baron' : dragonReady && rng.chance(0.45) ? 'dragon' : 'fight'
    const teamfight = minute >= 15 && rng.chance(0.55)
    const phase: Phase = teamfight || kind === 'baron' ? 'teamfight' : phaseAt(minute)

    const buff = (side: Side): number => (baronBuffUntil[idx(side)] > minute ? 2.5 : 0)
    const diff =
      sidePower(home.slots, home.team, phase, mods[0]) + buff('home') - (sidePower(away.slots, away.team, phase, mods[1]) + buff('away'))
    const goldLead = (gold[0] - gold[1]) / 5000
    const side: Side = rng.chance(sigmoid(diff * cfg.skill + goldLead)) ? 'home' : 'away'
    const loser = other(side)
    const w = idx(side)
    const firstBlood = kills[0] + kills[1] === 0
    const prefix = (): string => (firstBlood ? 'PRIMEIRO SANGUE! ' : '')

    let participants: [number[], number[]] = [[], []] // [casa, visitante]
    let place = { name: 'rio', pt: { x: CENTER.x + rng.int(-14, 14), y: CENTER.y + rng.int(-14, 14) } }
    const recs: { winSide: Side; rec: KillRec }[] = []
    let text = ''

    if (kind === 'fight' && !teamfight && minute < 15) {
      // Gank do caçador em uma lane
      const lane = rng.pick(['Top', 'Mid', 'ADC'] as const)
      const attacker: Side = rng.chance(0.5) ? side : loser
      const defender = other(attacker)
      const jg = slotIdx(attacker, 'Jungle')
      const aIdx = [jg, slotIdx(attacker, lane), lane === 'ADC' ? slotIdx(attacker, 'Suporte') : -1].filter((i) => i >= 0)
      const dIdx = [slotIdx(defender, lane), lane === 'ADC' ? slotIdx(defender, 'Suporte') : -1].filter((i) => i >= 0)
      const laneName = LANE_LABEL[lane]
      place = { name: laneName, pt: lanePos(defender, lane) }
      if (attacker === side) {
        const victims = dIdx.slice(0, rng.chance(0.3) ? 2 : 1)
        for (const v of victims) {
          recs.push({ winSide: attacker, rec: recordKill(attacker, pickFrom(attacker, aIdx, KILL_WEIGHT, true), v, aIdx) })
        }
        text = `${prefix()}${nameOf(attacker, jg)} foi gankar o ${laneName} e abateu ${victims.map((v) => nameOf(defender, v)).join(' e ')}!`
      } else {
        const killer = dIdx[rng.int(0, dIdx.length - 1)]!
        recs.push({ winSide: defender, rec: recordKill(defender, killer, jg, dIdx) })
        text = `${prefix()}${nameOf(attacker, jg)} foi gankar o ${laneName} e acabou morrendo para ${nameOf(defender, killer)}!`
      }
      participants = attacker === 'home' ? [aIdx, dIdx] : [dIdx, aIdx]
    } else {
      const all = [0, 1, 2, 3, 4]
      const full = teamfight || kind === 'baron'
      const winIdx = full ? all : subset(5, rng.int(2, 3))
      const loseIdx = full ? all : subset(5, rng.int(2, 3))
      participants = side === 'home' ? [winIdx, loseIdx] : [loseIdx, winIdx]
      const count = kind === 'baron' ? rng.int(2, 4) : kind === 'dragon' ? rng.int(1, 3) : teamfight ? rng.int(2, 5) : rng.int(1, 2)
      const victimsLeft = [...loseIdx]
      for (let k = 0; k < count; k++) {
        const vPool = victimsLeft.length ? victimsLeft : loseIdx
        const victim = pickFrom(loser, vPool, DEATH_WEIGHT, false)
        const vi = victimsLeft.indexOf(victim)
        if (vi >= 0) victimsLeft.splice(vi, 1)
        recs.push({ winSide: side, rec: recordKill(side, pickFrom(side, winIdx, KILL_WEIGHT, true), victim, winIdx) })
      }
      if (kind === 'baron') place = { name: 'Barão', pt: BARON_PIT }
      else if (kind === 'dragon') place = { name: 'Dragão', pt: DRAGON_PIT }
      else if (teamfight) place = { name: rng.pick(['meio do mapa', 'rio', 'selva']), pt: place.pt }
      const list = recs.map(({ winSide, rec }) => `${nameOf(winSide, rec.killer)} abateu ${nameOf(other(winSide), rec.victim)}`).join('; ')
      const head =
        kind === 'baron' ? 'Luta no Barão!' : kind === 'dragon' ? 'Disputa de dragão:' : teamfight ? `Teamfight no ${place.name}!` : `Escaramuça no ${place.name}:`
      text = `${prefix()}${head} ${list}.`
    }

    const scene = buildScene(place.name, place.pt, participants[0], participants[1], recs)
    log('kill', side, text, recs.length, scene)

    if (kind === 'baron') {
      barons[w]++
      baronBuffUntil[w] = minute + 3
      gold[w] += 1500
      nextBaron = minute + 7
      log('baron', side, `${teamName(side)} derruba o Barão Nashor!`, undefined, { ...scene, kills: [] })
    } else if (kind === 'dragon') {
      dragons[w]++
      gold[w] += 500
      nextDragon = minute + 5
      log('dragon', side, `${teamName(side)} garante o dragão (${dragons[w]}).`, undefined, { ...scene, kills: [] })
    }
    gold[w] += 300 * rng.int(1, 3)

    if (minute >= 7 && rng.chance(0.55 + (baronBuffUntil[w] > minute ? 0.25 : 0))) {
      const towerIndex = Math.min(towers[w], 8)
      const pt = towerPositions(loser)[towerIndex]!
      const siege = subset(5, rng.int(2, 3), side === 'home' ? participants[0] : participants[1])
      towers[w]++
      gold[w] += 450
      const t: Scene = {
        x: pt.x,
        y: pt.y,
        place: 'torre',
        kills: [],
        tower: towerIndex,
        home: side === 'home' ? siege.map((i) => pid('home', i)) : [],
        away: side === 'away' ? siege.map((i) => pid('away', i)) : [],
      }
      log('tower', side, `${teamName(side)} derruba uma torre (${towers[w]}/${cfg.towersToWin}).`, undefined, t)
      if (towers[w] >= cfg.towersToWin) winner = side
    }
  }

  const minutes = Math.min(minute - 1, MAX_MINUTES)
  if (winner === null) {
    winner =
      towers[0] !== towers[1] ? (towers[0] > towers[1] ? 'home' : 'away') : gold[0] >= gold[1] ? 'home' : 'away'
  }
  log('end', winner, `NEXUS DESTRUÍDO! ${teamName(winner)} vence aos ${minutes} minutos.`)

  for (const i of [0, 1] as const) {
    setups[i].slots.forEach((s, j) => {
      const pick = picks[i][j]!
      const eff = effectiveOvr(s.player, s.role)
      pick.cs = Math.round(CS_RATE[s.role] * minutes * (0.55 + eff / 150) * (0.9 + rng.next() * 0.2))
    })
  }

  const score = (p: GamePick): number => p.kills * 2 + p.assists - p.deaths * 1.5 + p.cs / 60
  const winnerPicks = picks[idx(winner)]
  const mvp = winnerPicks.reduce((best, p) => (score(p) > score(best) ? p : best), winnerPicks[0]!)

  const result: GameResult = { winner, minutes, towers, dragons, barons, kills, gold, events, picks, mvpId: mvp.playerId }
  if (draft) result.draft = draft
  return result
}

export function simulateSeries(
  home: SideSetup,
  away: SideSetup,
  bestOf: 1 | 3 | 5,
  rng: Rng,
  drafts: readonly DraftResult[] = [],
): { games: GameResult[]; score: [number, number] } {
  const need = Math.floor(bestOf / 2) + 1
  const games: GameResult[] = []
  const score: [number, number] = [0, 0]
  while (score[0] < need && score[1] < need) {
    const gameIdx = games.length
    const used = bestOf > 1 && getConfig().draft.fearless ? games.flatMap((x) => (x.draft ? [...Object.values(x.draft.picks.blue), ...Object.values(x.draft.picks.red)] : [])) : []
    const draft =
      drafts[gameIdx] ??
      autoDraft(
        { slots: { blue: home.slots, red: away.slots }, tactic: { blue: home.team.tactic, red: away.team.tactic } },
        used,
        rng,
      )
    const g = simulateGame(home, away, rng, draft)
    games.push(g)
    score[idx(g.winner)]++
  }
  return { games, score }
}

export { ROLES, findChampion }
