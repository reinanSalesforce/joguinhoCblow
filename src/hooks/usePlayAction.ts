import { useCallback } from 'react'
import { nextDay } from '../domain/season'
import { useGameStore } from '../store/gameStore'
import { useDraftUi } from '../store/draftStore'
import { useToastStore } from '../store/toastStore'

/** Botão "Jogar": abre o draft quando o clube tem partida; senão simula o dia. */
export function usePlayAction(): () => void {
  const openDraft = useDraftUi((s) => s.openDraft)
  const playDay = useGameStore((s) => s.playDay)
  const show = useToastStore((s) => s.show)
  return useCallback(() => {
    const game = useGameStore.getState().game
    if (!game) return
    const day = nextDay(game)
    const mine = game.matches.some((m) => m.day === day && (m.homeId === game.userTeamId || m.awayId === game.userTeamId))
    if (mine) openDraft()
    else {
      playDay()
      show({ ok: true, message: 'Dia simulado. Seu clube não jogou.' })
    }
  }, [openDraft, playDay, show])
}
