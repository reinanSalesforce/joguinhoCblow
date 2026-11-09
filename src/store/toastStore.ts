import { create } from 'zustand'
import type { ActionResult } from '../domain/types'

interface ToastState {
  message: string
  error: boolean
  seq: number
  show: (result: ActionResult) => void
  clear: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: '',
  error: false,
  seq: 0,
  show: (result) => {
    if (!result.message) return
    set((s) => ({ message: result.message, error: !result.ok, seq: s.seq + 1 }))
  },
  clear: () => set({ message: '' }),
}))
