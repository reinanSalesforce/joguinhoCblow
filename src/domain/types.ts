export const ROLES = ['Top', 'Jungle', 'Mid', 'ADC', 'Suporte'] as const
export type Role = (typeof ROLES)[number]

export type Style = 'balanced' | 'early' | 'scaling' | 'teamfight'
export type Phase = 'early' | 'mid' | 'late' | 'teamfight'
export type Side = 'home' | 'away'
export type Lineup = Partial<Record<Role, string>>

export interface PlayerStats {
  games: number
  wins: number
  kills: number
  deaths: number
  assists: number
  cs: number
  mvps: number
  minutes: number
}

export interface Player {
  id: string
  name: string
  role: Role
  teamId: string | null
  age: number
  ovr: number
  potential: number
  morale: number
  salary: number
  contractEnd: number
  outRounds: number
  outReason: string
  champs: string[]
  /** "pé de chumbo": jogador fraco/propenso a morrer */
  leadFoot?: boolean
  /** foto (data URL) cadastrada no painel admin */
  photo?: string
  stats: PlayerStats
  career: PlayerStats
}

export interface Team {
  id: string
  name: string
  presidents: string
  cash: number
  reputation: number
  tactic: Style
  lineup: Lineup
  chemistry: number
  tag?: string
  color?: string
  custom?: boolean
}

export interface Scene {
  /** local do evento no minimapa (0–100) */
  x: number
  y: number
  place: string
  /** jogadores que participam (inclui quem morre) */
  home: string[]
  away: string[]
  kills: { killer: string; victim: string }[]
  /** índice da torre derrubada (lado atacado = oposto de event.side) */
  tower?: number
}

export interface GameEvent {
  minute: number
  side: Side | 'none'
  kind: 'kill' | 'tower' | 'dragon' | 'baron' | 'info' | 'end'
  text: string
  amount?: number
  scene?: Scene
}

export interface GamePick {
  playerId: string
  role: Role
  champ: string
  kills: number
  deaths: number
  assists: number
  cs: number
}

export interface DraftResult {
  bans: { blue: (string | null)[]; red: (string | null)[] }
  picks: { blue: Record<Role, string>; red: Record<Role, string> }
}

export interface GameResult {
  winner: Side
  minutes: number
  towers: [number, number]
  dragons: [number, number]
  barons: [number, number]
  kills: [number, number]
  gold: [number, number]
  events: GameEvent[]
  picks: [GamePick[], GamePick[]]
  mvpId: string
  draft?: DraftResult
}

export interface Match {
  id: number
  day: number
  stage: string
  homeId: string
  awayId: string
  bestOf: 1 | 3 | 5
  games: GameResult[]
  score: [number, number]
  played: boolean
}

export interface NewsItem {
  id: number
  season: number
  day: number
  kind: 'resultado' | 'mercado' | 'clube' | 'jogador'
  text: string
}

export interface Offer {
  id: number
  playerId: string
  fromTeamId: string
  fee: number
  expiresDay: number
}

export interface SeasonRecord {
  season: number
  championId: string
  runnerUpId: string
  thirdId: string
  topKillerId: string
  userPosition: number
}

export type SeasonPhase = 'regular' | 'playoffs' | 'finished'

export interface GameData {
  version: number
  seed: number
  season: number
  userTeamId: string
  confidence: number
  fired: boolean
  teams: Record<string, Team>
  players: Record<string, Player>
  matches: Match[]
  news: NewsItem[]
  offers: Offer[]
  history: SeasonRecord[]
  nextId: number
  finalPosition: Record<string, number>
}

export interface ActionResult {
  ok: boolean
  message: string
}

export const ROSTER_MAX = 12
export const ROSTER_MIN = 5
export const STYLE_LABEL: Record<Style, string> = {
  balanced: 'Equilibrado',
  early: 'Agressivo (early game)',
  scaling: 'Escalonamento (late game)',
  teamfight: 'Foco em teamfight',
}
