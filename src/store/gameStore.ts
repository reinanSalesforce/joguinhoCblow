import { produce } from 'immer'
import type { Draft } from 'immer'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createCustomGame } from '../domain/customTeam'
import { playerFromAdmin } from '../domain/seed'
import type { AdminPlayer } from '../domain/seed'
import { salaryFor } from '../domain/ratings'
import { useAdminStore } from './adminStore'
import type { CustomTeamConfig } from '../domain/customTeam'
import { bestLineup } from '../domain/ratings'
import { changeTeam, playNextDay, startNewGame, startNextSeason } from '../domain/season'
import {
  acceptOffer,
  buyPlayer,
  rejectOffer,
  releasePlayer,
  renewContract,
  rosterOf,
  sellToMarket,
  signFreeAgent,
} from '../domain/transfers'
import type { ActionResult, DraftResult, GameData, Role, Style } from '../domain/types'
import { ROLES } from '../domain/types'

interface GameStore {
  game: GameData | null
  lastMatchId: number | null
  newGame: (teamId: string) => void
  chooseTeam: (teamId: string) => void
  startCustom: (cfg: CustomTeamConfig, seed: number) => ActionResult
  playDay: (drafts?: readonly DraftResult[]) => number | null
  nextSeason: () => void
  setTactic: (style: Style) => void
  setSlot: (role: Role, playerId: string) => void
  autoLineup: () => void
  buy: (playerId: string, fee: number) => ActionResult
  signFree: (playerId: string) => ActionResult
  release: (playerId: string) => ActionResult
  renew: (playerId: string, years: 1 | 2) => ActionResult
  sell: (playerId: string) => ActionResult
  acceptOffer: (offerId: number) => ActionResult
  rejectOffer: (offerId: number) => void
  adminUpsertPlayer: (player: AdminPlayer) => ActionResult
  adminRemovePlayer: (id: string) => ActionResult
  reset: () => void
}

const NO_GAME: ActionResult = { ok: false, message: 'Nenhum jogo em andamento.' }

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => {
      /** Aplica uma mutação (imutável via immer) e devolve o resultado da ação. */
      const mutate = (fn: (draft: Draft<GameData>) => ActionResult): ActionResult => {
        const game = get().game
        if (!game) return NO_GAME
        let result: ActionResult = NO_GAME
        const next = produce(game, (draft) => {
          result = fn(draft)
        })
        if (result.ok) set({ game: next })
        return result
      }

      return {
        game: null,
        lastMatchId: null,
        newGame: (teamId) => set({ game: startNewGame(teamId, Date.now() >>> 0, useAdminStore.getState().db), lastMatchId: null }),
        startCustom: (cfg, seed) => {
          try {
            set({ game: createCustomGame(cfg, seed, useAdminStore.getState().db), lastMatchId: null })
            return { ok: true, message: 'Time criado!' }
          } catch (e) {
            return { ok: false, message: e instanceof Error ? e.message : 'Não foi possível criar o time.' }
          }
        },
        chooseTeam: (teamId) => {
          const game = get().game
          if (game) set({ game: changeTeam(game, teamId) })
        },
        playDay: (drafts = []) => {
          const game = get().game
          if (!game) return null
          const { data, userMatchId } = playNextDay(game, drafts)
          set({ game: data, lastMatchId: userMatchId })
          return userMatchId
        },
        nextSeason: () => {
          const game = get().game
          if (game) set({ game: startNextSeason(game), lastMatchId: null })
        },
        setTactic: (style) => {
          mutate((d) => {
            const team = d.teams[d.userTeamId]
            if (team) team.tactic = style
            return { ok: true, message: '' }
          })
        },
        setSlot: (role, playerId) => {
          mutate((d) => {
            const team = d.teams[d.userTeamId]
            if (!team) return NO_GAME
            const previous = { ...team.lineup }
            for (const r of ROLES) if (team.lineup[r] === playerId) team.lineup[r] = previous[role]
            team.lineup[role] = playerId
            const changed = ROLES.filter((r) => previous[r] !== team.lineup[r]).length
            team.chemistry = Math.max(0, team.chemistry - changed * 2)
            return { ok: true, message: '' }
          })
        },
        autoLineup: () => {
          mutate((d) => {
            const team = d.teams[d.userTeamId]
            if (!team) return NO_GAME
            team.lineup = bestLineup(rosterOf(d as GameData, team.id))
            return { ok: true, message: '' }
          })
        },
        buy: (playerId, fee) => mutate((d) => buyPlayer(d, playerId, fee)),
        signFree: (playerId) => mutate((d) => signFreeAgent(d, playerId)),
        release: (playerId) => mutate((d) => releasePlayer(d, playerId)),
        renew: (playerId, years) => mutate((d) => renewContract(d, playerId, years)),
        sell: (playerId) => mutate((d) => sellToMarket(d, playerId)),
        acceptOffer: (offerId) => mutate((d) => acceptOffer(d, offerId)),
        rejectOffer: (offerId) => {
          mutate((d) => {
            rejectOffer(d, offerId)
            return { ok: true, message: '' }
          })
        },
        adminUpsertPlayer: (a) =>
          mutate((d) => {
            const name = a.name.trim()
            if (name.length < 2) return { ok: false, message: 'Informe o nome do jogador.' }
            const existing = d.players[a.id]
            if (a.teamId && !d.teams[a.teamId]) return { ok: false, message: 'Time inválido.' }
            if (existing) {
              if (existing.teamId && existing.teamId !== a.teamId && rosterOf(d as GameData, existing.teamId).length <= 5) {
                return { ok: false, message: 'O time de origem ficaria com menos de 5 jogadores.' }
              }
              if (existing.teamId && existing.teamId !== a.teamId) {
                const old = d.teams[existing.teamId]
                if (old) for (const r of ROLES) if (old.lineup[r] === existing.id) delete old.lineup[r]
              }
              existing.name = name
              existing.role = a.role
              existing.teamId = a.teamId
              existing.age = a.age
              if (existing.ovr !== a.ovr) existing.salary = salaryFor(a.ovr)
              existing.ovr = a.ovr
              existing.potential = Math.max(a.potential, a.ovr)
              existing.leadFoot = !!a.leadFoot
              if (a.photo) existing.photo = a.photo
              else delete existing.photo
            } else {
              const rep = a.teamId ? (d.teams[a.teamId]?.reputation ?? 50) : 45
              const p = playerFromAdmin({ ...a, name }, d.season, rep)
              p.contractEnd = d.season + 1
              d.players[p.id] = p
            }
            return { ok: true, message: existing ? 'Jogador atualizado.' : 'Jogador adicionado.' }
          }),
        adminRemovePlayer: (id) =>
          mutate((d) => {
            const p = d.players[id]
            if (!p) return { ok: false, message: 'Jogador não encontrado.' }
            if (p.teamId) {
              if (rosterOf(d as GameData, p.teamId).length <= 5) return { ok: false, message: 'O time ficaria com menos de 5 jogadores.' }
              const t = d.teams[p.teamId]
              if (t) for (const r of ROLES) if (t.lineup[r] === id) delete t.lineup[r]
            }
            d.offers = d.offers.filter((o) => o.playerId !== id)
            delete d.players[id]
            return { ok: true, message: 'Jogador removido.' }
          }),
        reset: () => set({ game: null, lastMatchId: null }),
      }
    },
    {
      name: 'cblow-manager-save',
      version: 2,
      migrate: () => ({ game: null, lastMatchId: null }),
      partialize: (state) => ({ game: state.game, lastMatchId: state.lastMatchId }),
    },
  ),
)

export function useGame(): GameData {
  const game = useGameStore((s) => s.game)
  if (!game) throw new Error('useGame só pode ser usado com um jogo ativo.')
  return game
}
