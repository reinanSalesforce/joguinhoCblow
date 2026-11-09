import { Link, useParams } from 'react-router-dom'
import { Kpi, Meter, OvrBadge, PageHeader, RoleBadge } from '../components/ui'
import { playerValue } from '../domain/ratings'
import { money } from '../domain/transfers'
import type { PlayerStats } from '../domain/types'
import { useGame } from '../store/gameStore'

function Line({ label, s }: { label: string; s: PlayerStats }) {
  const kda = s.deaths === 0 ? s.kills + s.assists : (s.kills + s.assists) / s.deaths
  return (
    <tr>
      <td>{label}</td>
      <td className="num">{s.games}</td>
      <td className="num">{s.games ? Math.round((s.wins / s.games) * 100) : 0}%</td>
      <td className="num">{s.kills}/{s.deaths}/{s.assists}</td>
      <td className="num">{s.games ? kda.toFixed(2) : '—'}</td>
      <td className="num">{s.games ? Math.round(s.cs / s.games) : '—'}</td>
      <td className="num">{s.mvps}</td>
    </tr>
  )
}

export default function PlayerPage() {
  const { playerId } = useParams()
  const game = useGame()
  const p = playerId ? game.players[playerId] : undefined
  if (!p) {
    return (
      <div className="empty">
        Jogador não encontrado. <Link to="/elenco">Voltar ao elenco</Link>
      </div>
    )
  }
  const team = p.teamId ? game.teams[p.teamId] : undefined
  return (
    <>
      {p.photo && <img src={p.photo} alt={`Foto de ${p.name}`} className="mb-4 h-40 w-32 border border-line object-cover" />}
      <PageHeader title={p.name} subtitle={`${team?.name ?? 'Agente livre'} · ${p.age} anos`} actions={<Link className="btn" to="/elenco">← Elenco</Link>} />
      <div className="grid cols-4" style={{ marginBottom: '1rem' }}>
        <div className="card"><Kpi label="Overall" value={<OvrBadge value={p.ovr} />} hint={`potencial ${p.potential}`} /></div>
        <div className="card"><Kpi label="Posição" value={<RoleBadge role={p.role} />} /></div>
        <div className="card"><Kpi label="Valor de mercado" value={money(playerValue(p))} /></div>
        <div className="card"><Kpi label="Salário" value={money(p.salary)} hint={`contrato até T${p.contractEnd}`} /></div>
      </div>
      <div className="grid cols-2">
        <section className="card">
          <h3>Condição</h3>
          <p className="row between"><span>Moral</span><strong>{Math.round(p.morale)}</strong></p>
          <Meter value={p.morale} label="Moral" bad={p.morale < 30} />
          <p style={{ marginTop: '0.8rem' }}>
            Pool de campeões: {p.champs.map((c) => <span key={c} className="tag" style={{ marginRight: 4 }}>{c}</span>)}
          </p>
          {p.leadFoot && <p className="bad">Pé de chumbo: rende menos e morre mais.</p>}
          {p.outRounds > 0 && <p className="bad">Indisponível por {p.outRounds} rodada(s): {p.outReason}</p>}
        </section>
        <section className="card table-wrap">
          <h3>Estatísticas</h3>
          <table>
            <thead><tr><th /><th className="num">J</th><th className="num">Vit.</th><th className="num">K/D/A</th><th className="num">KDA</th><th className="num">CS/j</th><th className="num">MVP</th></tr></thead>
            <tbody>
              <Line label="Temporada" s={p.stats} />
              <Line label="Carreira" s={p.career} />
            </tbody>
          </table>
        </section>
      </div>
    </>
  )
}
