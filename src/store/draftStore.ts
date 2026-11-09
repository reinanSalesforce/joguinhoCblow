import { create } from 'zustand'

/** Estado efêmero (não persistido): controla o pop-up de draft. */
interface DraftUiState {
  open: boolean
  openDraft: () => void
  closeDraft: () => void
}

export const useDraftUi = create<DraftUiState>((set) => ({
  open: false,
  openDraft: () => set({ open: true }),
  closeDraft: () => set({ open: false }),
}))
