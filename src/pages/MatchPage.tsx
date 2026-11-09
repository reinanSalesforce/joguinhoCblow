import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChampIcon } from '../components/ChampIcon'
import { Minimap } from '../components/Minimap'
import { MinimapUpload } from '../components/MinimapUpload'
import { ADMIN_ENABLED } from '../lib/flags'
import { Empty, PageHeader, RoleBadge, TeamCrest } from '../components/ui'
import { champName } from '../domain/champName'
import type { Match } from '../domain/types'
import { useSettingsStore } from '../store/settingsStore'
import { useReplay } from '../hooks/useReplay'
import type { Speed } from '../hooks/useReplay'
import { useGame, useGameStore } from '../store/gameStore'

export default function MatchPage() {
  const game = useGame()
  const lastMatchId = useGameStore((s) => s.lastMatchId)
  const match = game.matches.find((m) => m.id === lastMatchId)
  const [gameIdx, setGameIdx] = useState(0)
  if (!match || !match.games[gameIdx]) {
    return (
      <Empty>
        Nenhuma partida recente. <Link to="/painel">Voltar ao painel</Link>
      </Empty>
    )
  }
  return <GameView key={`${match.id}-${gameIdx}`} match={match} gameIdx={gameIdx} onSelect={setGameIdx} />
}

const SPEEDS: Speed[] = [0.5, 1, 2, 4]

function GameView({ match, gameIdx, onSelect }: { match: Match; gameIdx: number; onSelect: (i: number) => void }) {
  const game = useGame()
  const current = match.games[gameIdx]!
  const replay = useReplay(current)
  const showMinimap = useSettingsStore((s) => s.settings.replay.showMinimap)
  const logRef = useRef<HTMLDivElement>(null)

  const home = game.teams[match.homeId]!
  const away = game.teams[match.awayId]!
  const names = useMemo(() => Object.fromEntries(Object.values(game.players).map((p) => [p.id, p.name])), [game.players])

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [replay.visibleEvents.length, replay.phase])

  const seriesDone = replay.finished && gameIdx === match.games.length - 1
  const shownScore: [number, number] = [0, 0]
  match.games.forEach((g, i) => {
    if (i < gameIdx || (i === gameIdx && replay.finished)) shownScore[g.winner === 'home' ? 0 : 1]++
  })

  // Evento em andamento (fase de deslocamento): mostra suspense sem revelar o resultado
  const pending = !replay.finished && replay.phase === 'travel' ? current.events[replay.eventIdx] : undefined

  return (
    <>
      <PageHeader
        title={match.stage}
        subtitle={`Melhor de ${match.bestOf} · Jogo ${gameIdx + 1} de ${match.games.length}`}
        actions={
          <>
            <div className="tabs" role="group" aria-label="Velocidade" style={{ margin: 0 }}>
              {SPEEDS.map((s) => (
                <button key={s} type="button" className="tab" aria-pressed={replay.speed === s} onClick={() => replay.setSpeed(s)}>{s}x</button>
              ))}
            </div>
            {replay.playing ? (
              <button className="btn" onClick={replay.pause}>⏸ Pausar</button>
            ) : (
              !replay.finished && <button className="btn" onClick={replay.play}>▶ Continuar</button>
            )}
            {!replay.finished && <button className="btn" onClick={replay.skip}>⏭ Pular</button>}
            {replay.finished && gameIdx < match.games.length - 1 && (
              <button className="btn primary" onClick={() => onSelect(gameIdx + 1)}>Próximo jogo ▶</button>
            )}
          </>
        }
      />

      <section className="card" aria-live="polite">
        <div className="scoreboard">
          <div><TeamCrest name={home.name} color={home.color} tag={home.tag} /><h2>{home.name}</h2><div className="big mono">{shownScore[0]}</div></div>
          <div>
            <div className="muted">Minuto</div>
            <div className="stat-big mono">{replay.minute}'</div>
          </div>
          <div><TeamCrest name={away.name} color={away.color} tag={away.tag} /><h2>{away.name}</h2><div className="big mono">{shownScore[1]}</div></div>
        </div>
        <div className="grid cols-4" style={{ marginTop: '1rem', textAlign: 'center' }}>
          {(
            [
              ['Abates', replay.kills],
              ['Torres', replay.towers],
              ['Dragões', replay.dragons],
              ['Barões', replay.barons],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="kpi">
              <small>{label}</small>
              <span className="stat-big mono">{v[0]} – {v[1]}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid mt-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {showMinimap && (
        <section className="card">
          <h3>Minimapa</h3>
          <Minimap map={replay.map} names={names} />
          <p className="muted mt-2 text-center text-xs">Azul: {home.name} · Vermelho: {away.name}</p>
          {ADMIN_ENABLED && <MinimapUpload />}
        </section>
        )}

        <section className="card">
          <h3>Narração</h3>
          <div className="log" ref={logRef} style={{ maxHeight: 460 }}>
            {replay.visibleEvents.length === 0 && !pending && <span className="muted">Os times entram no Summoner’s Rift…</span>}
            {replay.visibleEvents.map((e, i) => (
              <div key={`${e.minute}-${i}`} className={`log-line ${e.kind === 'end' ? 'end' : e.side}`}>
                <span className="muted mono">{e.minute}'</span>
                <span>{e.text}</span>
              </div>
            ))}
            {pending && (
              <div className="replay-pending">
                <span className="mono">{pending.minute}'</span>
                <span>
                  {pending.kind === 'end' ? 'Os times avançam para o Nexus' : `Movimentação ${pending.scene ? `no ${pending.scene.place}` : 'no mapa'}`}
                  <span className="replay-dots" />
                </span>
              </div>
            )}
          </div>
          <div className="mt-3 stack">
            {match.games.length > 1 &&
              match.games.map((g, i) => (
                <button key={i} className="btn small" onClick={() => onSelect(i)} aria-pressed={i === gameIdx}>
                  Jogo {i + 1} — {g.winner === 'home' ? home.name : away.name} ({g.minutes} min)
                </button>
              ))}
          </div>
        </section>
      </div>

      {current.draft && (
        <section className="card" style={{ marginTop: '1rem' }}>
          <h3>Banimentos</h3>
          <div className="grid cols-2">
            {(['blue', 'red'] as const).map((side) => (
              <div key={side} className="row">
                <strong>{side === 'blue' ? home.name : away.name}:</strong>
                {current.draft!.bans[side].map((b, i) => (b ? <ChampIcon key={i} champ={b} size={30} /> : <span key={i} className="muted">—</span>))}
              </div>
            ))}
          </div>
        </section>
      )}

      {replay.finished && (
        <section className="card" style={{ marginTop: '1rem' }}>
          <h3>Desempenho dos jogadores</h3>
          {[0, 1].map((side) => (
            <div key={side} className="table-wrap" style={{ marginBottom: '1rem' }}>
              <h2>{side === 0 ? home.name : away.name}{(current.winner === 'home') === (side === 0) ? ' 🏆' : ''}</h2>
              <table>
                <thead><tr><th>Jogador</th><th>Pos.</th><th>Campeão</th><th className="num">K/D/A</th><th className="num">CS</th></tr></thead>
                <tbody>
                  {current.picks[side as 0 | 1].map((p) => (
                    <tr key={p.playerId}>
                      <td>{game.players[p.playerId]?.name}{p.playerId === current.mvpId ? ' ⭐ MVP' : ''}</td>
                      <td><RoleBadge role={p.role} /></td>
                      <td><span className="row"><ChampIcon champ={p.champ} size={28} />{champName(p.champ)}</span></td>
                      <td className="num">{p.kills}/{p.deaths}/{p.assists}</td>
                      <td className="num">{p.cs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {seriesDone && <Link className="btn primary" to="/painel">Voltar ao painel</Link>}
        </section>
      )}
    </>
  )
}
