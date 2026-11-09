import { PageHeader } from '../components/ui'
import { useGame } from '../store/gameStore'

export default function HistoryPage() {
  const game = useGame()
  const titles = game.history.filter((h) => h.championId === game.userTeamId).length
  const name = (id: string): string => game.teams[id]?.name ?? '—'
  return (
    <>
      <PageHeader title="Histórico & Troféus" subtitle={`${game.history.length} temporada(s) concluída(s) · ${titles} título(s) para ${name(game.userTeamId)}`} />
      <div className="grid main-side">
        <section className="card table-wrap">
          <h3>Galeria de campeões</h3>
          {game.history.length === 0 ? (
            <p className="muted">Termine uma temporada para registrar a história do campeonato.</p>
          ) : (
            <table>
              <thead><tr><th>Temp.</th><th>Campeão</th><th>Vice</th><th>3º</th><th>Artilheiro</th><th className="num">Você</th></tr></thead>
              <tbody>
                {[...game.history].reverse().map((h) => (
                  <tr key={h.season} className={h.championId === game.userTeamId ? 'me' : undefined}>
                    <td>{h.season}</td>
                    <td className="gold">🏆 {name(h.championId)}</td>
                    <td>{name(h.runnerUpId)}</td>
                    <td>{name(h.thirdId)}</td>
                    <td>{game.players[h.topKillerId]?.name ?? '—'}</td>
                    <td className="num">{h.userPosition}º</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="card">
          <h3>Arquivo de notícias</h3>
          <ul className="feed">{game.news.map((n) => <li key={n.id} className={n.kind}>{n.text}</li>)}</ul>
        </section>
      </div>
    </>
  )
}
