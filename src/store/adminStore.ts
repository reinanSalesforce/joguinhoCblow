import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultAdminDb } from '../domain/seed'
import type { AdminPlayer } from '../domain/seed'

/**
 * Banco de jogadores editável pelo painel admin. Fica separado do save do jogo:
 * vale para todo novo jogo. `null` = usar o banco padrão (cblow.xyz).
 */
interface AdminState {
  db: AdminPlayer[] | null
  upsert: (player: AdminPlayer) => void
  remove: (id: string) => void
  replaceAll: (db: AdminPlayer[]) => void
  reset: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      db: null,
      upsert: (player) => {
        const base = get().db ?? defaultAdminDb()
        const exists = base.some((p) => p.id === player.id)
        set({ db: exists ? base.map((p) => (p.id === player.id ? player : p)) : [...base, player] })
      },
      remove: (id) => set({ db: (get().db ?? defaultAdminDb()).filter((p) => p.id !== id) }),
      replaceAll: (db) => set({ db }),
      reset: () => set({ db: null }),
    }),
    { name: 'cblow-admin-db', version: 1 },
  ),
)
