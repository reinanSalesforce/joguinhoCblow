import { PageHeader } from '../components/ui'
import { useGame } from '../store/gameStore'

export default function CalendarPage() {
  const game = useGame()
  const days = [...new Set(game.matches.map((m) => m.day))].sort((a, b) => a - b)
  return (
    <>
      <PageHeader title="Calendário" subtitle={`Temporada ${game.season}`} />
      <div className="grid cols-2">
        {days.map((day) => {
          const matches = game.matches.filter((m) => m.day === day)
          return (
            <section key={day} className="card">
              <h2>{matches[0]?.stage}</h2>
              <ul className="feed">
                {matches.map((m) => {
                  const mine = m.homeId === game.userTeamId || m.awayId === game.userTeamId
                  return (
                    <li key={m.id} className={mine ? 'clube' : undefined}>
                      <span className="row between">
                        <span>
                          {game.teams[m.homeId]?.name} <span className="muted">x</span> {game.teams[m.awayId]?.name}
                        </span>
                        <strong className="mono">{m.played ? `${m.score[0]} – ${m.score[1]}` : 'a jogar'}</strong>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}
