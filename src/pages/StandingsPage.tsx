import { PageHeader, TeamCrest } from '../components/ui'
import type { Match } from '../domain/types'
import { useStandings } from '../hooks/useGameData'
import { useGame } from '../store/gameStore'

function Tie({ match, names }: { match: Match | undefined; names: Record<string, string> }) {
  if (!match) return <div className="tie muted">A definir</div>
  const winnerHome = match.played && match.score[0] > match.score[1]
  const winnerAway = match.played && match.score[1] > match.score[0]
  return (
    <div className="tie">
      <div className={`team-line${winnerHome ? ' winner' : ''}`}><span>{names[match.homeId]}</span><span className="mono">{match.played ? match.score[0] : '–'}</span></div>
      <div className={`team-line${winnerAway ? ' winner' : ''}`}><span>{names[match.awayId]}</span><span className="mono">{match.played ? match.score[1] : '–'}</span></div>
      <small className="muted">{match.stage} · MD{match.bestOf}</small>
    </div>
  )
}

export default function StandingsPage() {
  const game = useGame()
  const standings = useStandings()
  const names = Object.fromEntries(Object.values(game.teams).map((t) => [t.id, t.name]))
  const semis = game.matches.filter((m) => m.stage === 'Semifinal')
  const final = game.matches.find((m) => m.stage === 'Grande Final')
  const third = game.matches.find((m) => m.stage === 'Disputa do 3º lugar')

  return (
    <>
      <PageHeader title="Tabela & Playoffs" subtitle="Pontos corridos em turno único (melhor de 1). Os 4 primeiros disputam os playoffs." />
      <section className="card table-wrap">
        <table>
          <thead><tr><th>#</th><th>Time</th><th className="num">J</th><th className="num">V</th><th className="num">D</th><th className="num">Saldo</th></tr></thead>
          <tbody>
            {standings.map((r, i) => (
              <tr key={r.teamId} className={r.teamId === game.userTeamId ? 'me' : undefined}>
                <td>{i + 1}{i < 4 ? <span className="tag ok" style={{ marginLeft: 6 }}>playoffs</span> : null}</td>
                <td><span className="row"><TeamCrest name={names[r.teamId] ?? ''} size={26} />{names[r.teamId]}</span></td>
                <td className="num">{r.played}</td>
                <td className="num">{r.wins}</td>
                <td className="num">{r.losses}</td>
                <td className="num">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card" style={{ marginTop: '1rem' }}>
        <h3>Chaveamento</h3>
        <div className="bracket">
          <div className="stack"><Tie match={semis[0]} names={names} /><Tie match={semis[1]} names={names} /></div>
          <div className="stack"><Tie match={final} names={names} /></div>
          <div className="stack"><Tie match={third} names={names} /></div>
        </div>
        <p className="muted" style={{ marginTop: '0.6rem' }}>Semifinais (MD3) → Grande Final (MD5) e Disputa do 3º lugar (MD3).</p>
      </section>
    </>
  )
}
