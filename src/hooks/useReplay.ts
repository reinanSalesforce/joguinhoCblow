import { useCallback, useEffect, useMemo, useState } from 'react'
import { getConfig } from '../domain/config'
import { computeMapState } from '../domain/replayMap'
import type { MapState, ReplayPhase } from '../domain/replayMap'
import type { GameResult } from '../domain/types'

export type Speed = 0.5 | 1 | 2 | 4

export interface ReplayState {
  minute: number
  playing: boolean
  finished: boolean
  speed: Speed
  /** narração já revelada (sincronizada com o minimapa) */
  visibleEvents: GameResult['events']
  kills: [number, number]
  towers: [number, number]
  dragons: [number, number]
  barons: [number, number]
  map: MapState
  eventIdx: number
  phase: ReplayPhase
  setSpeed: (s: Speed) => void
  play: () => void
  pause: () => void
  skip: () => void
}

const START_MS = 1200

/**
 * Reprodução por etapas, dois passos por evento:
 *  1) "travel": os personagens caminham até o local (suspense, narração ainda oculta)
 *  2) "clash": a luta acontece, abates aparecem e a narração é revelada.
 * Os temporizadores são sempre limpos ao pausar/desmontar. Use `key` no componente para reiniciar.
 */
export function useReplay(game: GameResult | undefined): ReplayState {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<Speed>(() => getConfig().replay.defaultSpeed)
  const events = useMemo(() => game?.events ?? [], [game])
  const total = events.length * 2

  useEffect(() => {
    if (!playing || !game || step >= total) return
    const eventIdx = Math.floor((step - 1) / 2)
    const hasKills = (events[eventIdx]?.scene?.kills.length ?? 0) > 0
    const { travelMs, clashMs } = getConfig().replay
    const base = step === 0 ? START_MS : step % 2 === 1 ? travelMs : hasKills ? clashMs : Math.round(clashMs * 0.55)
    const id = window.setTimeout(() => setStep((s) => s + 1), base / speed)
    return () => window.clearTimeout(id)
  }, [playing, game, step, total, speed, events])

  const finished = !!game && step >= total
  const eventIdx = step === 0 ? -1 : Math.floor((step - 1) / 2)
  const phase: ReplayPhase = step % 2 === 1 ? 'travel' : 'clash'
  const revealed = Math.floor(step / 2)

  const visibleEvents = useMemo(() => events.slice(0, revealed), [events, revealed])

  const counts = useMemo(() => {
    const kills: [number, number] = [0, 0]
    const towers: [number, number] = [0, 0]
    const dragons: [number, number] = [0, 0]
    const barons: [number, number] = [0, 0]
    for (const e of visibleEvents) {
      if (e.side === 'none') continue
      const i = e.side === 'home' ? 0 : 1
      if (e.kind === 'kill') kills[i] += e.amount ?? 0
      if (e.kind === 'tower') towers[i]++
      if (e.kind === 'dragon') dragons[i]++
      if (e.kind === 'baron') barons[i]++
    }
    return { kills, towers, dragons, barons }
  }, [visibleEvents])

  const map = useMemo<MapState>(() => {
    if (!game) return { tokens: [], towersDown: { home: [], away: [] }, place: null }
    return computeMapState(game, Math.min(eventIdx, events.length - 1), phase)
  }, [game, eventIdx, phase, events.length])

  const minute = visibleEvents.at(-1)?.minute ?? 0

  const play = useCallback(() => setPlaying(true), [])
  const pause = useCallback(() => setPlaying(false), [])
  const skip = useCallback(() => {
    setStep(total)
    setPlaying(false)
  }, [total])

  return { minute, playing, finished, speed, visibleEvents, ...counts, map, eventIdx, phase, setSpeed, play, pause, skip }
}
