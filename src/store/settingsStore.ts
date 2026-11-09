import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_SETTINGS, mergeSettings, setConfig } from '../domain/config'
import type { AppSettings } from '../domain/config'

interface SettingsState {
  settings: AppSettings
  /** Atualiza um grupo de configurações (ex.: 'draft'). */
  update: <G extends keyof AppSettings>(group: G, patch: Partial<AppSettings[G]>) => void
  replace: (settings: AppSettings) => void
  reset: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      update: (group, patch) => {
        const next = { ...get().settings, [group]: { ...get().settings[group], ...patch } }
        setConfig(next)
        set({ settings: next })
      },
      replace: (settings) => {
        const merged = mergeSettings(settings)
        setConfig(merged)
        set({ settings: merged })
      },
      reset: () => {
        setConfig(DEFAULT_SETTINGS)
        set({ settings: DEFAULT_SETTINGS })
      },
    }),
    {
      name: 'cblow-settings',
      version: 2,
      migrate: (persisted, version) => {
        const p = persisted as { settings?: { replay?: Record<string, unknown> } } | undefined
        if (version < 2 && p?.settings?.replay) {
          p.settings.replay.travelMs = DEFAULT_SETTINGS.replay.travelMs
          p.settings.replay.clashMs = DEFAULT_SETTINGS.replay.clashMs
        }
        return p as never
      },
      merge: (persisted, current) => {
        const settings = mergeSettings((persisted as Partial<SettingsState> | undefined)?.settings)
        setConfig(settings)
        return { ...current, settings }
      },
    },
  ),
)
