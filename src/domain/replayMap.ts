import { BASE, junglePos, lanePos, spread } from './mapGeometry'
import type { GameResult, Role, Side } from './types'

export type ReplayPhase = 'travel' | 'clash'

export interface Token {
  playerId: string
  side: Side
  role: Role
  champ: string
  x: number
  y: number
  /** morreu neste momento (caveira no local) */
  skull: boolean
  /** aguardando renascimento na base */
  respawning: boolean
  /** participa do evento atual */
  active: boolean
}

export interface MapState {
  tokens: Token[]
  /** torres derrubadas por lado dono da torre (índices da lista em mapGeometry.towerPositions) */
  towersDown: Record<Side, number[]>
  place: string | null
}

const RESPAWN_EVENTS = 2

/**
 * Estado do minimapa para um ponto da reprodução.
 * eventIdx = evento em andamento; em "travel" os participantes caminham até o local,
 * em "clash" a luta acontece (abates aparecem) e a narração é exibida.
 */
export function computeMapState(game: GameResult, eventIdx: number, phase: ReplayPhase): MapState {
  const events = game.events
  const current = eventIdx >= 0 ? events[eventIdx] : undefined
  const scene = current?.scene
  const participants = new Set([...(scene?.home ?? []), ...(scene?.away ?? [])])
  const placed = new Map<string, number>()
  const inScene = [...(scene?.home ?? []), ...(scene?.away ?? [])]
  inScene.forEach((id, i) => placed.set(id, i))

  // Última morte de cada jogador até o ponto atual
  const lastDeath = new Map<string, number>()
  const limit = phase === 'clash' ? eventIdx : eventIdx - 1
  for (let i = 0; i <= limit; i++) {
    for (const k of events[i]?.scene?.kills ?? []) lastDeath.set(k.victim, i)
  }

  const towersDown: Record<Side, number[]> = { home: [], away: [] }
  for (let i = 0; i <= limit; i++) {
    const e = events[i]
    if (e?.kind === 'tower' && e.scene?.tower !== undefined && e.side !== 'none') {
      towersDown[e.side === 'home' ? 'away' : 'home'].push(e.scene.tower)
    }
  }

  const tokens: Token[] = []
  game.picks.forEach((picks, sideIdx) => {
    const side: Side = sideIdx === 0 ? 'home' : 'away'
    for (const pick of picks) {
      const death = lastDeath.get(pick.playerId)
      const sinceDeath = death === undefined ? Infinity : eventIdx - death
      const skull = death === eventIdx && phase === 'clash'
      const respawning = !skull && death !== undefined && sinceDeath <= RESPAWN_EVENTS
      const active = participants.has(pick.playerId)

      let pos: { x: number; y: number }
      if (skull && scene) pos = spread({ x: scene.x, y: scene.y }, placed.get(pick.playerId) ?? 0, inScene.length)
      else if (respawning) pos = spread(BASE[side], pick.role === 'Jungle' ? 0 : placeIndex(pick.role), 5)
      else if (active && scene) pos = spread({ x: scene.x, y: scene.y }, placed.get(pick.playerId) ?? 0, inScene.length)
      else pos = pick.role === 'Jungle' ? junglePos(side, Math.max(eventIdx, 0)) : lanePos(side, pick.role)

      tokens.push({ playerId: pick.playerId, side, role: pick.role, champ: pick.champ, x: pos.x, y: pos.y, skull, respawning, active })
    }
  })

  return { tokens, towersDown, place: scene?.place ?? null }
}

const placeIndex = (role: Role): number => ['Top', 'Jungle', 'Mid', 'ADC', 'Suporte'].indexOf(role)
