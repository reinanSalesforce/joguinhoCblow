import { useMemo, useState } from 'react'
import { PlayerCard } from '../components/PlayerCard'
import { Empty, Tabs } from '../components/ui'
import { ROLES } from '../domain/types'
import type { Role } from '../domain/types'
import { useGame } from '../store/gameStore'

type Filter = Role | 'Todos'
const OPTIONS: readonly (readonly [Filter, string])[] = [['Todos', 'Todos'], ...ROLES.map((r) => [r, r] as const)]

export default function PlayersPage() {
  const game = useGame()
  const [role, setRole] = useState<Filter>('Todos')
  const [teamId, setTeamId] = useState('todos')
  const [query, setQuery] = useState('')

  const players = useMemo(() => {
    const q = query.trim().toLowerCase()
    return Object.values(game.players)
      .filter((p) => (role === 'Todos' || p.role === role) && (teamId === 'todos' || p.teamId === teamId))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (game.teams[p.teamId ?? '']?.name.toLowerCase().includes(q) ?? false))
      .sort((a, b) => (a.teamId ?? 'z').localeCompare(b.teamId ?? 'z') || b.ovr - a.ovr)
  }, [game.players, game.teams, role, teamId, query])

  return (
    <>
      <div className="mb-8 text-center">
        <h1>Jogadores</h1>
        <p className="muted">{players.length} jogadores · clique em um card para ver a ficha</p>
      </div>
      <div className="mb-6 flex flex-col items-center gap-4">
        <Tabs label="Filtrar por posição" value={role} options={OPTIONS} onChange={setRole} />
        <div className="flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
          <label className="sm:w-56">
            <span className="sr-only">Time</span>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="todos">Todos os times</option>
              {Object.values(game.teams).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              <option value="">Agentes livres</option>
            </select>
          </label>
          <label className="flex-1">
            <span className="sr-only">Buscar jogador ou time</span>
            <input type="search" placeholder="Buscar jogador ou time" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
      </div>
      {players.length === 0 ? (
        <Empty>Nenhum jogador encontrado.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {players.map((p) => (
            <PlayerCard key={p.id} player={p} {...(p.teamId ? { teamName: game.teams[p.teamId]?.name } : {})} />
          ))}
        </div>
      )}
    </>
  )
}
