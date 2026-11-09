import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Imagens enviadas pelo admin (ex.: fundo do minimapa). Guardadas como data URL no navegador. */
interface AssetState {
  minimap: string | null
  setMinimap: (dataUrl: string | null) => void
}

export const useAssetStore = create<AssetState>()(
  persist(
    (set) => ({ minimap: null, setMinimap: (minimap) => set({ minimap }) }),
    { name: 'cblow-assets', version: 1 },
  ),
)
