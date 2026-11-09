import { Link } from 'react-router-dom'
import { Kpi, Meter, TeamCrest } from '../components/ui'
import { usePlayAction } from '../hooks/usePlayAction'
import { useMyTeam, useSeasonInfo, useStandings, useTeamOverall } from '../hooks/useGameData'
import { money } from '../domain/transfers'
import { useGameStore } from '../store/gameStore'
import { useToastStore } from '../store/toastStore'

function Versus({ opponentId }: { opponentId: string }) {
  const { game, team, overall } = useMyTeam()
  const theirs = useTeamOverall(opponentId)
  const opp = game.teams[opponentId]!
  const diff = overall - theirs
  return (
    <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
      <div className="flex flex-col items-center gap-2">
        <TeamCrest name={team.name} size={84} color={team.color} tag={team.tag} />
        <span className="display text-xl sm:text-3xl">{team.name}</span>
        <span className="muted text-sm">OVR <strong className="text-accent">{overall}</strong></span>
      </div>
      <span className="display text-2xl text-line-2">VS</span>
      <div className="flex flex-col items-center gap-2">
        <TeamCrest name={opp.name} size={84} color={opp.color} tag={opp.tag} />
        <span className="display text-xl sm:text-3xl">{opp.name}</span>
        <span className="muted text-sm">OVR <strong className="text-accent">{theirs}</strong></span>
      </div>
      <p className="muted col-span-3 !mb-0 text-sm">
        {diff > 1.5 ? 'Você entra como favorito.' : diff < -1.5 ? 'Você entra como azarão.' : 'Confronto equilibrado.'}
      </p>
    </div>
  )
}

export default function DashboardPage() {
  const { game, team, roster } = useMyTeam()
  const { day, phase } = useSeasonInfo()
  const standings = useStandings()
  const playDay = useGameStore((s) => s.playDay)
  const handlePlay = usePlayAction()
  const nextSeason = useGameStore((s) => s.nextSeason)
  const acceptOffer = useGameStore((s) => s.acceptOffer)
  const rejectOffer = useGameStore((s) => s.rejectOffer)
  const show = useToastStore((s) => s.show)

  const nextMatch = day === null ? undefined : game.matches.find((m) => m.day === day && (m.homeId === team.id || m.awayId === team.id))
  const opponentId = nextMatch ? (nextMatch.homeId === team.id ? nextMatch.awayId : nextMatch.homeId) : null
  const position = standings.findIndex((r) => r.teamId === team.id) + 1
  const unavailable = roster.filter((p) => p.outRounds > 0)
  const expiring = roster.filter((p) => p.contractEnd <= game.season)
  const myFinal = game.finalPosition[team.id]
  const lastResults = game.matches.filter((m) => m.played).slice(-6).reverse()

  return (
    <div className="stack !gap-6">
      {phase === 'finished' ? (
        <section className="hero text-center">
          <div className="eyebrow">Temporada {game.season} encerrada</div>
          <h1 className="!my-3 !text-5xl">{game.teams[game.history.at(-1)?.championId ?? '']?.name}</h1>
          <p className="muted">É o grande campeão. Você terminou em <strong className="text-accent">{myFinal}º lugar</strong>.</p>
          <p className="muted">Renove os contratos que vencem ({expiring.length}) antes de seguir.</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary big" onClick={() => { nextSeason(); show({ ok: true, message: 'Nova temporada iniciada.' }) }}>
              Iniciar temporada {game.season + 1}
            </button>
            <Link className="btn big" to="/elenco">Renovar contratos</Link>
          </div>
        </section>
      ) : (
        <section className="hero">
          <div className="eyebrow">Próxima partida{nextMatch ? ` · ${nextMatch.stage} · melhor de ${nextMatch.bestOf}` : ''}</div>
          {nextMatch && opponentId ? (
            <>
              <Versus opponentId={opponentId} />
              <div className="row" style={{ justifyContent: 'center' }}>
                <Link className="btn" to="/escalacao">Ajustar escalação</Link>
                <button className="btn primary big" onClick={handlePlay}>Jogar (com draft) ▶</button>
              </div>
            </>
          ) : (
            <div className="py-6 text-center">
              <p className="muted">Seu clube não joga nesta etapa dos playoffs.</p>
              <button className="btn primary" onClick={() => playDay()}>Simular próximo dia ▶</button>
            </div>
          )}
          {unavailable.length > 0 && (
            <p className="bad mt-4 text-sm">Desfalques: {unavailable.map((p) => `${p.name} (${p.outReason})`).join(', ')}</p>
          )}
        </section>
      )}

      <div className="grid cols-4">
        <div className="card"><Kpi label="Posição" value={`${position}º`} hint="fase de classificação" /></div>
        <div className="card"><Kpi label="Caixa" value={money(team.cash)} /></div>
        <div className="card">
          <Kpi label="Diretoria" value={`${Math.round(game.confidence)}%`} />
          <Meter value={game.confidence} label="Confiança da diretoria" bad={game.confidence < 30} />
        </div>
        <div className="card">
          <Kpi label="Entrosamento" value={`${Math.round(team.chemistry)}%`} />
          <Meter value={team.chemistry} label="Entrosamento do time" />
        </div>
      </div>

      <div className="grid main-side">
        <section className="card">
          <h3>Últimos resultados</h3>
          {lastResults.length === 0 ? (
            <p className="muted">Nenhuma partida disputada ainda.</p>
          ) : (
            <ul className="feed">
              {lastResults.map((m) => (
                <li key={m.id} className={m.homeId === team.id || m.awayId === team.id ? 'clube' : undefined}>
                  <span className="row between">
                    <span>{game.teams[m.homeId]?.name}</span>
                    <strong className="display">{m.score[0]} – {m.score[1]}</strong>
                    <span>{game.teams[m.awayId]?.name}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="!mt-6">Notícias</h3>
          <ul className="feed">
            {game.news.slice(0, 6).map((n) => <li key={n.id} className={n.kind}>{n.text}</li>)}
          </ul>
        </section>

        <div className="stack">
          <section className="card">
            <h3>Ofertas recebidas</h3>
            {game.offers.length === 0 ? (
              <p className="muted">Nenhuma oferta pelos seus jogadores.</p>
            ) : (
              <ul className="feed">
                {game.offers.map((o) => (
                  <li key={o.id}>
                    <strong>{game.teams[o.fromTeamId]?.name}</strong> oferece {money(o.fee)} por{' '}
                    <strong>{game.players[o.playerId]?.name}</strong>
                    <div className="row" style={{ marginTop: '0.4rem' }}>
                      <button className="btn small primary" onClick={() => show(acceptOffer(o.id))}>Aceitar</button>
                      <button className="btn small" onClick={() => rejectOffer(o.id)}>Recusar</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card">
            <h3>Classificação</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Time</th><th className="num">V</th><th className="num">D</th></tr></thead>
                <tbody>
                  {standings.map((r, i) => (
                    <tr key={r.teamId} className={r.teamId === team.id ? 'me' : undefined}>
                      <td>{i + 1}</td>
                      <td>{game.teams[r.teamId]?.name}</td>
                      <td className="num">{r.wins}</td>
                      <td className="num">{r.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
