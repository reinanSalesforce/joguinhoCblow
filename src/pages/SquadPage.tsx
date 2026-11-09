import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { OvrBadge, PageHeader, RoleBadge } from '../components/ui'
import { playerValue } from '../domain/ratings'
import { money } from '../domain/transfers'
import { ROLES } from '../domain/types'
import type { Player, Role } from '../domain/types'
import { useMyTeam } from '../hooks/useGameData'
import { useGameStore } from '../store/gameStore'
import { useToastStore } from '../store/toastStore'

type SortKey = 'role' | 'ovr' | 'age' | 'morale' | 'salary'

const kda = (p: Player): string =>
  p.stats.deaths === 0 ? (p.stats.kills + p.stats.assists).toFixed(1) : ((p.stats.kills + p.stats.assists) / p.stats.deaths).toFixed(2)

export default function SquadPage() {
  const { game, roster } = useMyTeam()
  const [role, setRole] = useState<Role | 'Todos'>('Todos')
  const [sort, setSort] = useState<SortKey>('role')
  const renew = useGameStore((s) => s.renew)
  const release = useGameStore((s) => s.release)
  const sell = useGameStore((s) => s.sell)
  const show = useToastStore((s) => s.show)

  const rows = useMemo(() => {
    const filtered = roster.filter((p) => role === 'Todos' || p.role === role)
    const cmp: Record<SortKey, (a: Player, b: Player) => number> = {
      role: (a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || b.ovr - a.ovr,
      ovr: (a, b) => b.ovr - a.ovr,
      age: (a, b) => a.age - b.age,
      morale: (a, b) => b.morale - a.morale,
      salary: (a, b) => b.salary - a.salary,
    }
    return [...filtered].sort(cmp[sort])
  }, [roster, role, sort])

  const payroll = roster.reduce((s, p) => s + p.salary, 0)

  return (
    <>
      <PageHeader
        title="Elenco"
        subtitle={`${roster.length}/12 jogadores · folha de ${money(payroll)} por rodada`}
        actions={
          <>
            <label>
              Posição
              <select value={role} onChange={(e) => setRole(e.target.value as Role | 'Todos')}>
                <option>Todos</option>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label>
              Ordenar por
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="role">Posição</option>
                <option value="ovr">Overall</option>
                <option value="age">Idade</option>
                <option value="morale">Moral</option>
                <option value="salary">Salário</option>
              </select>
            </label>
          </>
        }
      />
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Jogador</th><th>Pos.</th><th className="num">OVR</th><th className="num">POT</th>
              <th className="num">Idade</th><th className="num">Moral</th><th className="num">KDA</th>
              <th className="num">Salário</th><th>Contrato</th><th>Status</th><th><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const expiring = p.contractEnd <= game.season
              return (
                <tr key={p.id}>
                  <td><Link to={`/elenco/${p.id}`}>{p.name}</Link></td>
                  <td><RoleBadge role={p.role} /></td>
                  <td className="num"><OvrBadge value={p.ovr} /></td>
                  <td className="num muted">{p.potential}</td>
                  <td className="num">{p.age}</td>
                  <td className="num">{Math.round(p.morale)}</td>
                  <td className="num">{p.stats.games ? kda(p) : '—'}</td>
                  <td className="num">{money(p.salary)}</td>
                  <td>{expiring ? <span className="tag bad">vence nesta temporada</span> : `até T${p.contractEnd}`}</td>
                  <td>{p.outRounds > 0 ? <span className="tag bad">{p.outReason}</span> : <span className="tag ok">apto</span>}</td>
                  <td>
                    <div className="row">
                      <button className="btn small" onClick={() => show(renew(p.id, 1))}>Renovar</button>
                      <button className="btn small" title={`Vender por ${money(playerValue(p) * 0.8)}`} onClick={() => show(sell(p.id))}>Vender</button>
                      <button className="btn small danger" onClick={() => show(release(p.id))}>Dispensar</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
