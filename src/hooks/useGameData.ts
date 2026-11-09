import { useMemo } from 'react'
import { resolveSlots, teamOverall } from '../domain/ratings'
import { computeStandings, nextDay, seasonPhase } from '../domain/season'
import { rosterOf } from '../domain/transfers'
import { useGame } from '../store/gameStore'

export function useMyTeam() {
  const game = useGame()
  const team = game.teams[game.userTeamId]!
  const roster = useMemo(() => rosterOf(game, team.id), [game, team.id])
  const slots = useMemo(() => resolveSlots(team, roster), [team, roster])
  return { game, team, roster, slots, overall: teamOverall(slots) }
}

export function useStandings() {
  const game = useGame()
  return useMemo(() => computeStandings(game), [game])
}

export function useSeasonInfo() {
  const game = useGame()
  return useMemo(() => {
    const day = nextDay(game)
    return { day, phase: seasonPhase(game) }
  }, [game])
}

export function useTeamOverall(teamId: string): number {
  const game = useGame()
  return useMemo(() => {
    const team = game.teams[teamId]
    return team ? teamOverall(resolveSlots(team, rosterOf(game, teamId))) : 0
  }, [game, teamId])
}
