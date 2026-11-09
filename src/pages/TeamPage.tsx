import { Link, useParams } from 'react-router-dom'
import { PlayerCard } from '../components/PlayerCard'
import { Empty, PageHeader, TeamCrest } from '../components/ui'
import { resolveSlots, teamOverall } from '../domain/ratings'
import { money, rosterOf } from '../domain/transfers'
import { ROLES } from '../domain/types'
import { useStandings } from '../hooks/useGameData'
import { useGame } from '../store/gameStore'

export default function TeamPage() {
  const { teamId } = useParams()
  const game = useGame()
  const standings = useStandings()
  const team = teamId ? game.teams[teamId] : undefined
  if (!team) return <Empty>Time não encontrado. <Link to="/times">Ver times</Link></Empty>

  const roster = rosterOf(game, team.id).sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || b.ovr - a.ovr)
  const row = standings.find((r) => r.teamId === team.id)
  const position = standings.findIndex((r) => r.teamId === team.id) + 1
  const ovr = teamOverall(resolveSlots(team, roster))

  return (
    <>
      <div className="hero mb-6">
        <div className="flex flex-wrap items-center gap-6">
          <TeamCrest name={team.name} size={110} color={team.color} tag={team.tag} />
          <div>
            <div className="eyebrow">{position}º na tabela · {row?.wins ?? 0}V {row?.losses ?? 0}D</div>
            <h1 className="!mb-2 !text-5xl">{team.name}</h1>
            <p className="muted !mb-0">Presidentes: {team.presidents} · Overall {ovr} · Caixa {money(team.cash)}</p>
          </div>
        </div>
      </div>
      <PageHeader title="Elenco" subtitle={`${roster.length} jogadores`} actions={<Link className="btn" to="/times">← Times</Link>} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {roster.map((p) => <PlayerCard key={p.id} player={p} teamName={team.name} />)}
      </div>
    </>
  )
}
