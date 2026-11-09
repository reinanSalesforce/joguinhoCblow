import { hashString } from './rng'
import { playerValue, salaryFor } from './ratings'
import type { GameData, Player, PlayerStats, Role, Team } from './types'

/**
 * Dados reais extraídos do site cblow.xyz (times, presidentes e jogadores).
 * ATENÇÃO: o site não publica overall/idade. Esses valores são GERADOS de forma
 * determinística a partir do nome, com bônus para líderes das estatísticas públicas.
 */
interface TeamSeed {
  id: string
  name: string
  presidents: string
  reputation: number
}

export const TEAM_SEEDS: TeamSeed[] = [
  { id: 'amigosdomylennzy', name: 'AMIGOS DO MYLENNZY', presidents: 'Kennzy e Mylon', reputation: 76 },
  { id: 'gayneyryodan', name: 'GAYNEY RYODAN', presidents: 'Minerva e Brucer', reputation: 80 },
  { id: 'lestrolls', name: 'LES TROLLS', presidents: 'Rodil e Dioud', reputation: 50 },
  { id: 'lullagaming', name: 'LULLA GAMING', presidents: 'Yulla e Luma', reputation: 40 },
  { id: 'pitbronzes', name: 'PIT BRONZES', presidents: 'Ayel e Asteek', reputation: 62 },
  { id: 'sktenis', name: 'SKTENIS', presidents: 'Revolta e Yetz', reputation: 32 },
  { id: 'sucatainbox', name: 'SUCATA IN BOX', presidents: 'Jukes e Dynquedo', reputation: 66 },
  { id: 'vosbronzes', name: 'VOS BRONZES', presidents: 'Absolut e Lord Semi', reputation: 58 },
]

type PlayerSeed = [name: string, role: Role, teamId: string]

const T = {
  A: 'amigosdomylennzy',
  G: 'gayneyryodan',
  L: 'lestrolls',
  U: 'lullagaming',
  P: 'pitbronzes',
  S: 'sktenis',
  C: 'sucatainbox',
  V: 'vosbronzes',
} as const

export const PLAYER_SEEDS: PlayerSeed[] = [
  ['Jessyjbr', 'Suporte', T.A], ['LODE', 'ADC', T.A], ['Raposinha', 'Suporte', T.A],
  ['SATAANDAGI', 'Top', T.A], ['ThunderTchuck', 'Jungle', T.A], ['TiXE', 'Mid', T.A],
  ['TioZhaoLOL', 'ADC', T.A], ['edy', 'Jungle', T.A], ['idosodolol', 'Jungle', T.A],
  ['DAEMON', 'Top', T.G], ['DNS', 'ADC', T.G], ['Diana Bate Bife', 'Top', T.G],
  ['LoLDiahmond', 'Suporte', T.G], ['SUKUNA YI', 'Jungle', T.G], ['Solletto', 'Suporte', T.G],
  ['Tifa', 'ADC', T.G], ['Ussgust', 'Jungle', T.G], ['Xaanden', 'Jungle', T.G],
  ['Zayros', 'Top', T.G], ['gORDOx', 'Mid', T.G], ['iloveHusky', 'Top', T.G],
  ['Lua', 'Suporte', T.L], ['NightKnighth', 'Suporte', T.L], ['Quequel', 'Suporte', T.L],
  ['VelhinhoDoTFT', 'Top', T.L], ['Vô Corvo', 'Jungle', T.L],
  ['Wandersondantas (Tio Chico)', 'ADC', T.L], ['cal kestis (Franclipse)', 'Mid', T.L],
  ['feeermara69 (LOS Rochelle)', 'Suporte', T.L],
  ['Avelar', 'ADC', T.U], ['Famigerada', 'Suporte', T.U], ['Mr Zul', 'Jungle', T.U],
  ['N00XBLAD3', 'Suporte', T.U], ['Rakketsu', 'ADC', T.U], ['Serphiroth', 'ADC', T.U],
  ['noobzim', 'Top', T.U], ['umanana', 'Mid', T.U],
  ['Bronahh', 'Jungle', T.P], ['GMZAO', 'Mid', T.P], ['Peuvinii', 'Top', T.P],
  ['Sacisde', 'Suporte', T.P], ['Visao', 'ADC', T.P], ['flordelotus18', 'ADC', T.P],
  ['superclt', 'Top', T.P], ['takaruplay', 'Jungle', T.P], ['tutuespalhalixo', 'Top', T.P],
  ['Ceyf', 'Top', T.S], ['ExC4mBau', 'Jungle', T.S], ['KarlinRox', 'Top', T.S],
  ['PastorDeCalcinha', 'Suporte', T.S], ['SK4RAVELHO', 'ADC', T.S], ['SrTaveira', 'Suporte', T.S],
  ['VosUzz', 'Jungle', T.S], ['Ynercias', 'Mid', T.S], ['drytski', 'Mid', T.S],
  ['Aninha Gameplay', 'Top', T.C], ['CoelhaPistoleira', 'Suporte', T.C],
  ['Gabis Koersen', 'Suporte', T.C], ['Lyer', 'Mid', T.C], ['RAMMUS', 'Jungle', T.C],
  ['YouGlubGlub', 'Mid', T.C], ['mychamaqueeuvou', 'ADC', T.C], ['yasuocadeirante', 'Top', T.C],
  ['Chender', 'Top', T.V], ['Jozika', 'Jungle', T.V], ['KAMIMAE', 'Mid', T.V],
  ['REXPEITA O VOVÔ', 'Mid', T.V], ['VOS Pirulito', 'Suporte', T.V], ['calvo aos 25', 'Jungle', T.V],
  ['mahthor', 'Mid', T.V], ['pedrin', 'Top', T.V],
]

/** Líderes das estatísticas públicas do cblow.xyz → bônus de overall. */
const KILL_LEADERS = ['Chender', 'cal kestis (Franclipse)', 'superclt', 'edy', 'calvo aos 25', 'Serphiroth', 'Wandersondantas (Tio Chico)', 'Diana Bate Bife', 'noobzim', 'GMZAO']
const KDA_LEADERS = ['Bronahh', 'LoLDiahmond', 'Raposinha', 'DNS', 'idosodolol', 'LODE', 'feeermara69 (LOS Rochelle)', 'Ussgust', 'REXPEITA O VOVÔ', 'mahthor']
const CS_LEADERS = ['Diana Bate Bife', 'DNS', 'Zayros', 'LODE', 'Ceyf', 'gORDOx', 'ThunderTchuck', 'idosodolol', 'SK4RAVELHO', 'superclt']

function leaderBonus(name: string): number {
  const bonus = (list: string[], max: number) => {
    const i = list.indexOf(name)
    return i < 0 ? 0 : max - i * 0.3
  }
  return bonus(KILL_LEADERS, 6) + bonus(KDA_LEADERS, 5) + bonus(CS_LEADERS, 4)
}

export const CHAMP_POOLS: Record<Role, string[]> = {
  Top: ['Shyvana', 'Illaoi', 'Mordekaiser', 'Garen', 'Malphite', 'Yorick', 'Volibear'],
  Jungle: ['Shyvana', 'Amumu', 'Volibear', 'Malphite'],
  Mid: ['Swain', 'Brand', 'Mel', 'Mordekaiser'],
  ADC: ['MissFortune', 'Ashe'],
  Suporte: ['Seraphine', 'Taric', 'Brand', 'Swain'],
}

export function emptyStats(): PlayerStats {
  return { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, mvps: 0, minutes: 0 }
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildPlayer(
  name: string,
  role: Role,
  teamId: string | null,
  rep: number,
  season: number,
): Player {
  const h = hashString(name)
  const teamBonus = (rep - 55) / 10
  const ovr = Math.round(Math.min(78, 40 + (h % 22) + leaderBonus(name) + teamBonus))
  const age = 17 + ((h >>> 8) % 17)
  const potential = Math.min(88, ovr + (age < 24 ? 3 + ((h >>> 16) % 9) : (h >>> 16) % 3))
  const pool = CHAMP_POOLS[role]
  const champs = [pool[h % pool.length], pool[(h >>> 4) % pool.length]].filter(
    (c, i, arr): c is string => c !== undefined && arr.indexOf(c) === i,
  )
  return {
    id: slugify(name),
    name,
    role,
    teamId,
    age,
    ovr,
    potential,
    morale: 55,
    salary: salaryFor(ovr),
    contractEnd: season + 1 + ((h >>> 20) % 2),
    outRounds: 0,
    outReason: '',
    champs,
    stats: emptyStats(),
    career: emptyStats(),
  }
}

/** Registro editável de jogador (painel admin). Salvo fora do save do jogo e reaplicado em todo novo jogo. */
export interface AdminPlayer {
  id: string
  name: string
  role: Role
  teamId: string | null
  age: number
  ovr: number
  potential: number
  leadFoot?: boolean
  photo?: string
}

export function toAdmin(p: Player): AdminPlayer {
  const a: AdminPlayer = { id: p.id, name: p.name, role: p.role, teamId: p.teamId, age: p.age, ovr: p.ovr, potential: p.potential }
  if (p.leadFoot) a.leadFoot = true
  if (p.photo) a.photo = p.photo
  return a
}

export function playerFromAdmin(a: AdminPlayer, season: number, rep = 50): Player {
  const p = buildPlayer(a.name, a.role, a.teamId, rep, season)
  p.id = a.id
  p.age = a.age
  p.ovr = a.ovr
  p.potential = Math.max(a.potential, a.ovr)
  p.salary = salaryFor(a.ovr)
  if (a.leadFoot) p.leadFoot = true
  if (a.photo) p.photo = a.photo
  return p
}

/** Banco padrão (jogadores do cblow.xyz com overall gerado). */
export function defaultAdminDb(): AdminPlayer[] {
  const rep = Object.fromEntries(TEAM_SEEDS.map((t) => [t.id, t.reputation]))
  return PLAYER_SEEDS.map(([name, role, teamId]) => toAdmin(buildPlayer(name, role, teamId, rep[teamId] ?? 50, 1)))
}

export function createWorld(userTeamId: string, seed: number, db?: AdminPlayer[] | null): GameData {
  const season = 1
  const teams: Record<string, Team> = {}
  for (const t of TEAM_SEEDS) {
    teams[t.id] = {
      id: t.id,
      name: t.name,
      presidents: t.presidents,
      cash: 60000 + t.reputation * 1200,
      reputation: t.reputation,
      tactic: 'balanced',
      lineup: {},
      chemistry: 50,
    }
  }
  const players: Record<string, Player> = {}
  if (db && db.length > 0) {
    for (const a of db) {
      const p = playerFromAdmin(a, season, a.teamId ? (teams[a.teamId]?.reputation ?? 50) : 45)
      if (p.teamId && !teams[p.teamId]) p.teamId = null
      players[p.id] = p
    }
  } else {
    for (const [name, role, teamId] of PLAYER_SEEDS) {
      const rep = teams[teamId]?.reputation ?? 50
      const p = buildPlayer(name, role, teamId, rep, season)
      players[p.id] = p
    }
  }
  return {
    version: 1,
    seed,
    season,
    userTeamId,
    confidence: 60,
    fired: false,
    teams,
    players,
    matches: [],
    news: [],
    offers: [],
    history: [],
    nextId: 1,
    finalPosition: {},
  }
}

export { playerValue }
