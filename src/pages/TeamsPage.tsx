import { Link } from 'react-router-dom'
import { PageHeader, TeamCrest } from '../components/ui'
import { resolveSlots, teamOverall } from '../domain/ratings'
import { rosterOf } from '../domain/transfers'
import { useStandings } from '../hooks/useGameData'
import { useGame } from '../store/gameStore'

export default function TeamsPage() {
  const game = useGame()
  const standings = useStandings()
  return (
    <>
      <PageHeader title="Times" subtitle="Os 8 clubes do CBLOW" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {standings.map((row, i) => {
          const team = game.teams[row.teamId]!
          const roster = rosterOf(game, team.id)
          const ovr = teamOverall(resolveSlots(team, roster))
          return (
            <Link key={team.id} to={`/times/${team.id}`} className={`card team-card block !text-fg ${team.id === game.userTeamId ? '!border-accent' : ''}`}>
              <div className="mb-4 flex items-center justify-between">
                <TeamCrest name={team.name} size={56} color={team.color} tag={team.tag} />
                <span className="font-display text-3xl font-bold text-line-2">{i + 1}º</span>
              </div>
              <h2 className="!mb-1">{team.name}</h2>
              <p className="muted !mb-3 text-sm">Pres.: {team.presidents}</p>
              <div className="flex justify-between border-t border-line pt-3 text-sm">
                <span className="muted">{row.wins}V · {row.losses}D</span>
                <span>OVR <strong className="text-accent">{ovr}</strong></span>
              </div>
            </Link>
          )
        })}
      </div>
    </>
  )
}
