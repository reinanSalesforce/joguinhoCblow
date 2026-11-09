/** Configurações do site/jogo editáveis no painel Admin. Os padrões reproduzem o comportamento original. */
export type BestOf = 1 | 3 | 5

export interface AppSettings {
  draft: {
    /** mostra e aplica o temporizador do draft */
    timerEnabled: boolean
    banSeconds: number
    pickSeconds: number
    /** ao zerar, confirma a seleção atual ou joga automático */
    autoOnTimeout: boolean
    /** campeões usados em jogos anteriores da série ficam indisponíveis */
    fearless: boolean
    /** atraso (ms) das jogadas do adversário */
    aiDelayMs: number
  }
  replay: {
    defaultSpeed: 0.5 | 1 | 2 | 4
    /** ms que os personagens levam para chegar ao local (suspense) */
    travelMs: number
    /** ms de duração da luta antes do próximo evento */
    clashMs: number
    showMinimap: boolean
  }
  sim: {
    towersToWin: number
    /** chance de acontecer um evento por minuto (0–1) */
    eventChance: number
    /** quanto a diferença de overall pesa nas lutas (maior = menos acaso) */
    skill: number
    /** penalidade % de desempenho do "pé de chumbo" */
    leadFootPenalty: number
  }
  league: {
    doubleRoundRobin: boolean
    semiBestOf: BestOf
    finalBestOf: BestOf
    thirdBestOf: BestOf
    startBudget: number
    prizeMultiplier: number
    salaryMultiplier: number
  }
  admin: {
    /** PIN opcional para abrir o painel Admin (proteção local, não é segurança real) */
    pin: string
  }
}

export const DEFAULT_SETTINGS: AppSettings = {
  draft: { timerEnabled: true, banSeconds: 30, pickSeconds: 30, autoOnTimeout: true, fearless: true, aiDelayMs: 650 },
  replay: { defaultSpeed: 1, travelMs: 2400, clashMs: 4200, showMinimap: true },
  sim: { towersToWin: 8, eventChance: 0.8, skill: 0.1, leadFootPenalty: 6 },
  league: {
    doubleRoundRobin: false,
    semiBestOf: 3,
    finalBestOf: 5,
    thirdBestOf: 3,
    startBudget: 120000,
    prizeMultiplier: 1,
    salaryMultiplier: 1,
  },
  admin: { pin: '' },
}

let current: AppSettings = DEFAULT_SETTINGS

/** Lido pelo motor e pelas regras de temporada (módulo, para não repassar config em toda função). */
export const getConfig = (): AppSettings => current
export const setConfig = (settings: AppSettings): void => {
  current = settings
}

/** Mescla configurações salvas (possivelmente antigas) com os padrões, descartando valores inválidos. */
export function mergeSettings(saved: unknown): AppSettings {
  const base = structuredClone(DEFAULT_SETTINGS) as unknown as Record<string, Record<string, unknown>>
  if (saved && typeof saved === 'object') {
    for (const [group, values] of Object.entries(saved as Record<string, unknown>)) {
      const target = base[group]
      if (!target || !values || typeof values !== 'object') continue
      for (const [key, value] of Object.entries(values as Record<string, unknown>)) {
        if (key in target && typeof value === typeof target[key]) target[key] = value
      }
    }
  }
  return base as unknown as AppSettings
}
