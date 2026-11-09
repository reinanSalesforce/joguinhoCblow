import type { Role, Side } from './types'

/** Coordenadas do minimapa em % (0–100). Casa = lado azul (base embaixo à esquerda), visitante = vermelho. */
export interface Point {
  x: number
  y: number
}

export const BASE: Record<Side, Point> = { home: { x: 11, y: 88 }, away: { x: 89, y: 12 } }
export const DRAGON_PIT: Point = { x: 66, y: 69 }
export const BARON_PIT: Point = { x: 34, y: 30 }
export const CENTER: Point = { x: 50, y: 50 }

const mirror = (p: Point): Point => ({ x: 100 - p.x, y: 100 - p.y })

const HOME_LANE: Record<Role, Point> = {
  Top: { x: 6, y: 27 },
  Jungle: { x: 28, y: 68 },
  Mid: { x: 42, y: 58 },
  ADC: { x: 73, y: 94 },
  Suporte: { x: 66, y: 92 },
}

export const lanePos = (side: Side, role: Role): Point => (side === 'home' ? HOME_LANE[role] : mirror(HOME_LANE[role]))

/** Pontos de descanso do caçador na selva, alternados conforme o andamento da partida. */
const HOME_JUNGLE: Point[] = [{ x: 28, y: 68 }, { x: 22, y: 50 }, { x: 40, y: 78 }, { x: 36, y: 46 }]
export const junglePos = (side: Side, step: number): Point => {
  const p = HOME_JUNGLE[step % HOME_JUNGLE.length]!
  return side === 'home' ? p : mirror(p)
}

/** Torres do lado azul, da mais externa (perto do rio) para a base; o vermelho é espelhado. */
const HOME_TOWERS: Point[] = [
  { x: 6, y: 35 }, { x: 43, y: 57 }, { x: 65, y: 94 },
  { x: 6, y: 52 }, { x: 36, y: 64 }, { x: 48, y: 94 },
  { x: 6, y: 70 }, { x: 28, y: 72 }, { x: 30, y: 94 },
]
export const towerPositions = (side: Side): Point[] => (side === 'home' ? HOME_TOWERS : HOME_TOWERS.map(mirror))

export const LANE_LABEL: Record<Role, string> = { Top: 'top', Jungle: 'selva', Mid: 'mid', ADC: 'bot', Suporte: 'bot' }

/** Pequeno desvio determinístico para os personagens não se sobreporem. */
export function spread(p: Point, i: number, total: number): Point {
  const angle = (i / Math.max(total, 1)) * Math.PI * 2
  return { x: clamp(p.x + Math.cos(angle) * 4.5), y: clamp(p.y + Math.sin(angle) * 4.5) }
}

const clamp = (n: number): number => Math.max(4, Math.min(96, n))
