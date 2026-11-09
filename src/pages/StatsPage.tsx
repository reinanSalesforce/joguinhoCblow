import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, RoleBadge } from '../components/ui'
import type { Player } from '../domain/types'
import { useGame } from '../store/gameStore'

const kda = (p: Player): number => (p.stats.deaths === 0 ? p.stats.kills + p.stats.assists : (p.stats.kills + p.stats.assists) / p.stats.deaths)

function Board({ title, rows, fmt }: { title: string; rows: Player[]; fmt: (p: Player) => string }) {
  const game = useGame()
  return (
    <section className="card">
      <h3>{title}</h3>
      <ol style={{ margin: 0, paddingLeft: '1.2rem' }} className="stack">
        {rows.map((p) => (
          <li key={p.id}>
            <span className="row between">
              <span className="row"><Link to={`/elenco/${p.id}`}>{p.name}</Link><RoleBadge role={p.role} /><span className="muted">{game.teams[p.teamId ?? '']?.name}</span></span>
              <strong className="mono">{fmt(p)}</strong>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function StatsPage() {
  const game = useGame()
  const { played, boards, champs, totals } = useMemo(() => {
    const players = Object.values(game.players).filter((p) => p.stats.games > 0)
    const top = (cmp: (a: Player, b: Player) => number, filter: (p: Player) => boolean = () => true) =>
      players.filter(filter).sort(cmp).slice(0, 8)
    const champMap = new Map<string, { games: number; wins: number }>()
    let games = 0
    let kills = 0
    let minutes = 0
    for (const m of game.matches) {
      for (const g of m.games) {
        games++
        kills += g.kills[0] + g.kills[1]
        minutes += g.minutes
        g.picks.forEach((picks, i) => {
          for (const p of picks) {
            const c = champMap.get(p.champ) ?? { games: 0, wins: 0 }
            c.games++
            if (g.winner === (i === 0 ? 'home' : 'away')) c.wins++
            champMap.set(p.champ, c)
          }
        })
      }
    }
    return {
      played: players.length,
      boards: {
        kills: top((a, b) => b.stats.kills - a.stats.kills),
        kda: top((a, b) => kda(b) - kda(a), (p) => p.stats.games >= 2),
        cs: top((a, b) => b.stats.cs / b.stats.games - a.stats.cs / a.stats.games, (p) => p.stats.games >= 2),
        mvp: top((a, b) => b.stats.mvps - a.stats.mvps, (p) => p.stats.mvps > 0),
      },
      champs: [...champMap.entries()].sort((a, b) => b[1].games - a[1].games).slice(0, 12),
      totals: { games, kills, avg: games ? Math.round(minutes / games) : 0 },
    }
  }, [game])

  if (played === 0) return <div className="empty">As estatísticas aparecem após a primeira rodada.</div>

  return (
    <>
      <PageHeader title="Estatísticas" subtitle={`${totals.games} jogos · ${totals.kills} abates · duração média de ${totals.avg} min`} />
      <div className="grid cols-2">
        <Board title="Mais abates" rows={boards.kills} fmt={(p) => String(p.stats.kills)} />
        <Board title="Melhor KDA (mín. 2 jogos)" rows={boards.kda} fmt={(p) => kda(p).toFixed(2)} />
        <Board title="CS por jogo" rows={boards.cs} fmt={(p) => String(Math.round(p.stats.cs / p.stats.games))} />
        <Board title="MVPs" rows={boards.mvp} fmt={(p) => String(p.stats.mvps)} />
      </div>
      <section className="card table-wrap" style={{ marginTop: '1rem' }}>
        <h3>Campeões mais jogados</h3>
        <table>
          <thead><tr><th>Campeão</th><th className="num">Jogos</th><th className="num">Vitórias</th><th className="num">Win rate</th></tr></thead>
          <tbody>
            {champs.map(([name, c]) => (
              <tr key={name}><td>{name}</td><td className="num">{c.games}</td><td className="num">{c.wins}</td><td className="num">{Math.round((c.wins / c.games) * 100)}%</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
