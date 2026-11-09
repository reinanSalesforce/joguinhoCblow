import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Empty, OvrBadge, PageHeader, RoleBadge } from '../components/ui'
import { playerValue } from '../domain/ratings'
import { freeAgents, money, signingBonus } from '../domain/transfers'
import { ROLES } from '../domain/types'
import type { Player, Role } from '../domain/types'
import { useMyTeam } from '../hooks/useGameData'
import { useGameStore } from '../store/gameStore'
import { useToastStore } from '../store/toastStore'

type Tab = 'mercado' | 'livres' | 'ofertas'

function BidRow({ player, clubName }: { player: Player; clubName: string }) {
  const { team } = useMyTeam()
  const buy = useGameStore((s) => s.buy)
  const show = useToastStore((s) => s.show)
  const [fee, setFee] = useState(Math.round(playerValue(player) * 1.2))
  return (
    <tr>
      <td><Link to={`/elenco/${player.id}`}>{player.name}</Link></td>
      <td><RoleBadge role={player.role} /></td>
      <td className="num"><OvrBadge value={player.ovr} /></td>
      <td className="num muted">{player.potential}</td>
      <td className="num">{player.age}</td>
      <td>{clubName}</td>
      <td className="num">{money(playerValue(player))}</td>
      <td>
        <div className="row">
          <label>
            <span className="sr-only">Valor da proposta para {player.name}</span>
            <input type="number" min={0} step={500} value={fee} onChange={(e) => setFee(Number(e.target.value))} style={{ width: 100 }} />
          </label>
          <button className="btn small primary" disabled={fee > team.cash} onClick={() => show(buy(player.id, fee))}>Propor</button>
        </div>
      </td>
    </tr>
  )
}

export default function MarketPage() {
  const { game, team } = useMyTeam()
  const [tab, setTab] = useState<Tab>('mercado')
  const [role, setRole] = useState<Role | 'Todos'>('Todos')
  const [query, setQuery] = useState('')
  const signFree = useGameStore((s) => s.signFree)
  const acceptOffer = useGameStore((s) => s.acceptOffer)
  const rejectOffer = useGameStore((s) => s.rejectOffer)
  const show = useToastStore((s) => s.show)

  const others = useMemo(
    () =>
      Object.values(game.players)
        .filter((p) => p.teamId && p.teamId !== team.id)
        .filter((p) => (role === 'Todos' || p.role === role) && p.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.ovr - a.ovr),
    [game.players, team.id, role, query],
  )
  const free = useMemo(
    () => freeAgents(game).filter((p) => (role === 'Todos' || p.role === role) && p.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.ovr - a.ovr),
    [game, role, query],
  )

  const tabs: [Tab, string][] = [['mercado', 'Jogadores de outros clubes'], ['livres', `Agentes livres (${freeAgents(game).length})`], ['ofertas', `Ofertas recebidas (${game.offers.length})`]]

  return (
    <>
      <PageHeader title="Mercado de transferências" subtitle="Clubes protegem titulares: a proposta precisa superar o valor pedido." />
      <div className="tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className="tab" onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab !== 'ofertas' && (
        <div className="row" style={{ marginBottom: '1rem' }}>
          <label>Busca<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome do jogador" /></label>
          <label>
            Posição
            <select value={role} onChange={(e) => setRole(e.target.value as Role | 'Todos')}>
              <option>Todos</option>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
        </div>
      )}

      {tab === 'mercado' && (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Jogador</th><th>Pos.</th><th className="num">OVR</th><th className="num">POT</th><th className="num">Idade</th><th>Clube</th><th className="num">Valor</th><th>Proposta</th></tr></thead>
            <tbody>
              {others.map((p) => <BidRow key={p.id} player={p} clubName={game.teams[p.teamId ?? '']?.name ?? ''} />)}
            </tbody>
          </table>
          {others.length === 0 && <Empty>Nenhum jogador encontrado.</Empty>}
        </div>
      )}

      {tab === 'livres' && (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Jogador</th><th>Pos.</th><th className="num">OVR</th><th className="num">POT</th><th className="num">Idade</th><th className="num">Luvas</th><th /></tr></thead>
            <tbody>
              {free.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td><RoleBadge role={p.role} /></td>
                  <td className="num"><OvrBadge value={p.ovr} /></td>
                  <td className="num muted">{p.potential}</td>
                  <td className="num">{p.age}</td>
                  <td className="num">{money(signingBonus(p))}</td>
                  <td><button className="btn small primary" onClick={() => show(signFree(p.id))}>Contratar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {free.length === 0 && <Empty>Sem agentes livres com esse filtro.</Empty>}
        </div>
      )}

      {tab === 'ofertas' && (
        <div className="stack">
          {game.offers.length === 0 && <Empty>Ninguém fez proposta pelos seus jogadores ainda.</Empty>}
          {game.offers.map((o) => (
            <div key={o.id} className="card row between">
              <span>
                <strong>{game.teams[o.fromTeamId]?.name}</strong> oferece <strong className="gold">{money(o.fee)}</strong> por{' '}
                <strong>{game.players[o.playerId]?.name}</strong> (valor {money(playerValue(game.players[o.playerId]!))})
              </span>
              <span className="row">
                <button className="btn small primary" onClick={() => show(acceptOffer(o.id))}>Aceitar</button>
                <button className="btn small" onClick={() => rejectOffer(o.id)}>Recusar</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
