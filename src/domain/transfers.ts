import type { Draft } from 'immer'
import type { Rng } from './rng'
import { playerValue, salaryFor } from './ratings'
import type { ActionResult, GameData, NewsItem, Player, Role } from './types'
import { ROLES, ROSTER_MAX, ROSTER_MIN } from './types'

export function rosterOf(data: Pick<GameData, 'players'>, teamId: string): Player[] {
  return Object.values(data.players).filter((p) => p.teamId === teamId)
}

export function freeAgents(data: Pick<GameData, 'players'>): Player[] {
  return Object.values(data.players).filter((p) => p.teamId === null)
}

export const money = (n: number): string =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export type BidStatus =
  | { status: 'accepted' }
  | { status: 'counter'; counter: number; reason: string }
  | { status: 'rejected'; reason: string }

/** O clube vendedor protege jogadores-chave e nunca fica sem uma posição ou abaixo do elenco mínimo. */
export function evaluateBid(data: GameData, playerId: string, fee: number): BidStatus {
  const player = data.players[playerId]
  if (!player || !player.teamId) return { status: 'rejected', reason: 'Jogador indisponível.' }
  const roster = rosterOf(data, player.teamId)
  if (roster.length <= ROSTER_MIN) {
    return { status: 'rejected', reason: 'O clube não pode ficar com menos de 5 jogadores.' }
  }
  const sameRole = roster.filter((p) => p.role === player.role)
  const isBest = sameRole.every((p) => p.ovr <= player.ovr)
  if (sameRole.length <= 1) {
    return { status: 'rejected', reason: 'É o único da posição no clube.' }
  }
  const minPrice = Math.round(playerValue(player) * (1.1 + (isBest ? 0.3 : 0)))
  if (fee >= minPrice) return { status: 'accepted' }
  if (fee >= minPrice * 0.7) {
    return { status: 'counter', counter: minPrice, reason: `Pedem ${money(minPrice)} pelo jogador.` }
  }
  return { status: 'rejected', reason: 'Proposta muito abaixo do valor pedido.' }
}

function dropFromLineup(team: Draft<GameData>['teams'][string] | undefined, playerId: string): void {
  if (!team) return
  for (const role of ROLES) {
    if (team.lineup[role] === playerId) delete team.lineup[role]
  }
}

function addNews(draft: Draft<GameData>, text: string, kind: NewsItem['kind'] = 'mercado', day = 0): void {
  draft.news.unshift({ id: draft.nextId++, season: draft.season, day, kind, text })
  if (draft.news.length > 60) draft.news.length = 60
}

export { addNews }

export function moveTransfer(draft: Draft<GameData>, playerId: string, buyerId: string, fee: number): void {
  const player = draft.players[playerId]
  if (!player) return
  const sellerId = player.teamId
  const seller = sellerId ? draft.teams[sellerId] : undefined
  const buyer = draft.teams[buyerId]
  if (!buyer) return
  if (seller) {
    seller.cash += fee
    seller.chemistry = Math.max(0, seller.chemistry - 6)
    dropFromLineup(seller, playerId)
  }
  buyer.cash -= fee
  buyer.chemistry = Math.max(0, buyer.chemistry - 6)
  player.teamId = buyerId
  player.contractEnd = draft.season + 2
  player.morale = 60
  addNews(draft, `${player.name} (${player.role}) vai de ${seller?.name ?? 'agente livre'} para ${buyer.name} por ${money(fee)}.`)
}

export function buyPlayer(draft: Draft<GameData>, playerId: string, fee: number): ActionResult {
  const me = draft.teams[draft.userTeamId]
  const player = draft.players[playerId]
  if (!me || !player) return { ok: false, message: 'Jogador não encontrado.' }
  if (player.teamId === me.id) return { ok: false, message: 'Já é do seu clube.' }
  if (rosterOf(draft, me.id).length >= ROSTER_MAX) {
    return { ok: false, message: `Elenco cheio (máximo ${ROSTER_MAX}).` }
  }
  if (fee > me.cash) return { ok: false, message: 'Caixa insuficiente.' }
  const verdict = evaluateBid(draft as GameData, playerId, fee)
  if (verdict.status === 'rejected') return { ok: false, message: verdict.reason }
  if (verdict.status === 'counter') return { ok: false, message: `Contraproposta: ${verdict.reason}` }
  moveTransfer(draft, playerId, me.id, fee)
  return { ok: true, message: `${player.name} contratado por ${money(fee)}.` }
}

export function signingBonus(p: Player): number {
  return Math.round(playerValue(p) * 0.15)
}

export function signFreeAgent(draft: Draft<GameData>, playerId: string): ActionResult {
  const me = draft.teams[draft.userTeamId]
  const player = draft.players[playerId]
  if (!me || !player || player.teamId !== null) return { ok: false, message: 'Agente livre indisponível.' }
  if (rosterOf(draft, me.id).length >= ROSTER_MAX) return { ok: false, message: `Elenco cheio (máximo ${ROSTER_MAX}).` }
  const bonus = signingBonus(player)
  if (bonus > me.cash) return { ok: false, message: 'Caixa insuficiente para as luvas.' }
  me.cash -= bonus
  player.teamId = me.id
  player.contractEnd = draft.season + 1
  player.salary = salaryFor(player.ovr)
  player.morale = 60
  me.chemistry = Math.max(0, me.chemistry - 4)
  addNews(draft, `${me.name} contrata o agente livre ${player.name}.`)
  return { ok: true, message: `${player.name} assinou por ${money(bonus)} de luvas.` }
}

export function releasePlayer(draft: Draft<GameData>, playerId: string): ActionResult {
  const me = draft.teams[draft.userTeamId]
  const player = draft.players[playerId]
  if (!me || !player || player.teamId !== me.id) return { ok: false, message: 'Jogador inválido.' }
  const roster = rosterOf(draft, me.id)
  if (roster.length <= ROSTER_MIN) return { ok: false, message: 'Mantenha ao menos 5 jogadores.' }
  if (roster.filter((p) => p.role === player.role).length <= 1) {
    return { ok: false, message: 'Você ficaria sem ninguém nessa posição.' }
  }
  const severance = player.salary * 2
  if (severance > me.cash) return { ok: false, message: 'Caixa insuficiente para a rescisão.' }
  me.cash -= severance
  dropFromLineup(me, playerId)
  player.teamId = null
  return { ok: true, message: `${player.name} dispensado (rescisão ${money(severance)}).` }
}

export function renewContract(draft: Draft<GameData>, playerId: string, years: 1 | 2): ActionResult {
  const me = draft.teams[draft.userTeamId]
  const player = draft.players[playerId]
  if (!me || !player || player.teamId !== me.id) return { ok: false, message: 'Jogador inválido.' }
  if (player.morale < 35) return { ok: false, message: `${player.name} recusou: está insatisfeito.` }
  const salary = Math.round(salaryFor(player.ovr) * (1.1 + (years === 2 ? 0.05 : 0)))
  player.salary = salary
  player.contractEnd = Math.max(player.contractEnd, draft.season) + years
  return { ok: true, message: `${player.name} renovou por ${years} temporada(s) com salário ${money(salary)}/rodada.` }
}

export function sellToMarket(draft: Draft<GameData>, playerId: string): ActionResult {
  const me = draft.teams[draft.userTeamId]
  const player = draft.players[playerId]
  if (!me || !player || player.teamId !== me.id) return { ok: false, message: 'Jogador inválido.' }
  const roster = rosterOf(draft, me.id)
  if (roster.length <= ROSTER_MIN) return { ok: false, message: 'Mantenha ao menos 5 jogadores.' }
  if (roster.filter((p) => p.role === player.role).length <= 1) {
    return { ok: false, message: 'Você ficaria sem ninguém nessa posição.' }
  }
  const fee = Math.round(playerValue(player) * 0.8)
  me.cash += fee
  dropFromLineup(me, playerId)
  player.teamId = null
  addNews(draft, `${me.name} vende ${player.name} ao mercado por ${money(fee)}.`)
  return { ok: true, message: `${player.name} vendido por ${money(fee)}.` }
}

export function acceptOffer(draft: Draft<GameData>, offerId: number): ActionResult {
  const offer = draft.offers.find((o) => o.id === offerId)
  if (!offer) return { ok: false, message: 'Oferta expirada.' }
  const player = draft.players[offer.playerId]
  const me = draft.teams[draft.userTeamId]
  const buyer = draft.teams[offer.fromTeamId]
  if (!player || !me || !buyer || player.teamId !== me.id) {
    draft.offers = draft.offers.filter((o) => o.id !== offerId)
    return { ok: false, message: 'Oferta não é mais válida.' }
  }
  const roster = rosterOf(draft, me.id)
  if (roster.length <= ROSTER_MIN || roster.filter((p) => p.role === player.role).length <= 1) {
    return { ok: false, message: 'Você ficaria sem jogadores suficientes nessa posição.' }
  }
  if (buyer.cash < offer.fee || rosterOf(draft, buyer.id).length >= ROSTER_MAX) {
    draft.offers = draft.offers.filter((o) => o.id !== offerId)
    return { ok: false, message: 'O clube comprador desistiu.' }
  }
  moveTransfer(draft, player.id, buyer.id, offer.fee)
  draft.offers = draft.offers.filter((o) => o.id !== offerId && o.playerId !== player.id)
  return { ok: true, message: `${player.name} vendido para ${buyer.name} por ${money(offer.fee)}.` }
}

export function rejectOffer(draft: Draft<GameData>, offerId: number): void {
  draft.offers = draft.offers.filter((o) => o.id !== offerId)
}

/** Movimentação dos clubes controlados pela IA: compram reforços onde o titular é fraco. */
export function aiTransfer(draft: Draft<GameData>, rng: Rng, day: number): void {
  const aiTeams = Object.values(draft.teams).filter((t) => t.id !== draft.userTeamId)
  if (aiTeams.length === 0) return
  const buyer = rng.pick(aiTeams)
  const roster = rosterOf(draft, buyer.id)
  if (roster.length >= ROSTER_MAX) return
  const role: Role = rng.pick(ROLES)
  const current = roster.filter((p) => p.role === role).sort((a, b) => b.ovr - a.ovr)[0]
  const pool = Object.values(draft.players).filter(
    (p) => p.role === role && p.teamId !== buyer.id && p.teamId !== draft.userTeamId && (!current || p.ovr > current.ovr + 2),
  )
  const target = pool.sort((a, b) => b.ovr - a.ovr)[0]
  if (!target) return
  const fee = target.teamId ? Math.round(playerValue(target) * 1.25) : Math.round(signingBonus(target))
  if (fee > buyer.cash * 0.5) return
  if (target.teamId) {
    const verdict = evaluateBid(draft as GameData, target.id, fee)
    if (verdict.status !== 'accepted') return
  }
  void day
  moveTransfer(draft, target.id, buyer.id, fee)
}

export function generateOffers(draft: Draft<GameData>, rng: Rng, day: number): void {
  if (draft.offers.length >= 3) return
  const roster = rosterOf(draft, draft.userTeamId)
  if (roster.length <= ROSTER_MIN + 1) return
  for (const p of roster) {
    if (draft.offers.some((o) => o.playerId === p.id)) continue
    if (!rng.chance(0.04 + Math.max(0, p.ovr - 55) * 0.004)) continue
    const buyers = Object.values(draft.teams).filter(
      (t) => t.id !== draft.userTeamId && t.cash > playerValue(p) && rosterOf(draft, t.id).length < ROSTER_MAX,
    )
    if (buyers.length === 0) continue
    const from = rng.pick(buyers)
    draft.offers.push({
      id: draft.nextId++,
      playerId: p.id,
      fromTeamId: from.id,
      fee: Math.round(playerValue(p) * (0.95 + rng.next() * 0.45)),
      expiresDay: day + 2,
    })
    if (draft.offers.length >= 3) return
  }
}
