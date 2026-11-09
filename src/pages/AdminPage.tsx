import { useId, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Empty, OvrBadge, PageHeader, RoleBadge } from '../components/ui'
import { resizeImage } from '../lib/image'
import { TEAM_SEEDS, defaultAdminDb, slugify, toAdmin } from '../domain/seed'
import type { AdminPlayer } from '../domain/seed'
import { ROLES } from '../domain/types'
import type { Role } from '../domain/types'
import { useAdminStore } from '../store/adminStore'
import { useGameStore } from '../store/gameStore'
import { useToastStore } from '../store/toastStore'

const blank = (): AdminPlayer => ({ id: '', name: '', role: 'Top', teamId: null, age: 22, ovr: 50, potential: 55 })

export default function AdminPage() {
  const uid = useId()
  const game = useGameStore((s) => s.game)
  const upsertGame = useGameStore((s) => s.adminUpsertPlayer)
  const removeGame = useGameStore((s) => s.adminRemovePlayer)
  const db = useAdminStore((s) => s.db)
  const upsertDb = useAdminStore((s) => s.upsert)
  const removeDb = useAdminStore((s) => s.remove)
  const replaceDb = useAdminStore((s) => s.replaceAll)
  const resetDb = useAdminStore((s) => s.reset)
  const show = useToastStore((s) => s.show)

  const [editing, setEditing] = useState<AdminPlayer | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [query, setQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState('todos')
  const [roleFilter, setRoleFilter] = useState<Role | 'Todos'>('Todos')
  const fileRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const teams = useMemo(
    () => (game ? Object.values(game.teams).map((t) => ({ id: t.id, name: t.name })) : TEAM_SEEDS.map((t) => ({ id: t.id, name: t.name }))),
    [game],
  )
  const teamName = (id: string | null): string => (id ? (teams.find((t) => t.id === id)?.name ?? id) : 'Agente livre')

  // Com jogo em andamento, edita o elenco vivo; sem jogo, edita o banco usado em novos jogos.
  const players: AdminPlayer[] = useMemo(
    () => (game ? Object.values(game.players).map(toAdmin) : (db ?? defaultAdminDb())),
    [game, db],
  )

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return players
      .filter((p) => (teamFilter === 'todos' ? true : teamFilter === '' ? p.teamId === null : p.teamId === teamFilter))
      .filter((p) => roleFilter === 'Todos' || p.role === roleFilter)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => (a.teamId ?? 'zz').localeCompare(b.teamId ?? 'zz') || a.name.localeCompare(b.name))
  }, [players, query, teamFilter, roleFilter])

  const withPhoto = players.filter((p) => p.photo).length

  const startNew = (): void => {
    setEditing(blank())
    setIsNew(true)
  }
  const startEdit = (p: AdminPlayer): void => {
    setEditing({ ...p })
    setIsNew(false)
  }

  const save = (): void => {
    if (!editing) return
    const name = editing.name.trim()
    if (name.length < 2) return show({ ok: false, message: 'Informe o nome do jogador.' })
    let id = editing.id
    if (isNew) {
      const base = slugify(name) || 'jogador'
      let candidate = base
      let n = 2
      while (players.some((p) => p.id === candidate)) candidate = `${base}-${n++}`
      id = candidate
    }
    const entry: AdminPlayer = { ...editing, id, name, potential: Math.max(editing.potential, editing.ovr) }
    if (!entry.leadFoot) delete entry.leadFoot
    if (game) {
      const res = upsertGame(entry)
      if (!res.ok) return show(res)
    }
    upsertDb(entry)
    show({ ok: true, message: isNew ? `${name} adicionado.` : `${name} atualizado.` })
    setEditing(null)
  }

  const remove = (p: AdminPlayer): void => {
    if (!window.confirm(`Remover ${p.name}? Esta ação não pode ser desfeita.`)) return
    if (game) {
      const res = removeGame(p.id)
      if (!res.ok) return show(res)
    }
    removeDb(p.id)
    show({ ok: true, message: `${p.name} removido.` })
    if (editing?.id === p.id) setEditing(null)
  }

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !editing) return
    try {
      const photo = await resizeImage(file)
      setEditing((cur) => (cur ? { ...cur, photo } : cur))
    } catch (err) {
      show({ ok: false, message: err instanceof Error ? err.message : 'Falha ao carregar a foto.' })
    }
  }

  const exportJson = (): void => {
    const blob = new Blob([JSON.stringify(players, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cblow-jogadores.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data: unknown = JSON.parse(await file.text())
      if (!Array.isArray(data)) throw new Error('Formato inválido.')
      const valid = data.filter(
        (p): p is AdminPlayer =>
          !!p && typeof p.id === 'string' && typeof p.name === 'string' && ROLES.includes(p.role) && typeof p.ovr === 'number' && typeof p.age === 'number',
      )
      if (valid.length === 0) throw new Error('Nenhum jogador válido no arquivo.')
      replaceDb(valid)
      show({ ok: true, message: `${valid.length} jogadores importados para o banco (valem para novos jogos).` })
    } catch (err) {
      show({ ok: false, message: err instanceof Error ? err.message : 'Arquivo inválido.' })
    }
  }

  const set = <K extends keyof AdminPlayer>(key: K, value: AdminPlayer[K]): void =>
    setEditing((cur) => (cur ? { ...cur, [key]: value } : cur))

  return (
    <>
      <PageHeader
        title="Admin · Jogadores"
        subtitle={
          game
            ? 'Editando o jogo em andamento. As alterações também ficam salvas no banco usado em novos jogos.'
            : 'Editando o banco de jogadores usado em novos jogos.'
        }
        actions={
          <>
            <button className="btn primary" onClick={startNew}>+ Novo jogador</button>
            <button className="btn" onClick={exportJson}>Exportar JSON</button>
            <button className="btn" onClick={() => importRef.current?.click()}>Importar JSON</button>
            <button
              className="btn danger"
              onClick={() => { if (window.confirm('Restaurar o banco padrão do cblow.xyz? As edições e fotos do banco serão perdidas (o jogo atual não muda).')) { resetDb(); show({ ok: true, message: 'Banco restaurado.' }) } }}
            >
              Restaurar padrão
            </button>
            <input ref={importRef} type="file" accept="application/json" hidden onChange={importJson} />
          </>
        }
      />

      <div className="grid cols-4" style={{ marginBottom: '1rem' }}>
        <div className="card"><div className="kpi"><small>Jogadores</small><span className="stat-big">{players.length}</span></div></div>
        <div className="card"><div className="kpi"><small>Com foto</small><span className="stat-big">{withPhoto}</span></div></div>
        <div className="card"><div className="kpi"><small>Pés de chumbo</small><span className="stat-big">{players.filter((p) => p.leadFoot).length}</span></div></div>
        <div className="card"><div className="kpi"><small>Origem</small><span className="stat-big" style={{ fontSize: '1.1rem' }}>{game ? 'Jogo atual' : db ? 'Banco editado' : 'Padrão'}</span></div></div>
      </div>

      {editing && (
        <section className="card" style={{ marginBottom: '1rem', borderColor: 'var(--gold)' }} aria-label="Formulário de jogador">
          <h3>{isNew ? 'Novo jogador' : `Editar ${editing.name}`}</h3>
          <div className="flex flex-wrap gap-6">
            <div className="grid gap-2" style={{ justifyItems: 'center', alignContent: 'start' }}>
              <div className="grid h-[200px] w-[160px] place-items-center overflow-hidden border border-line bg-panel-2">
                {editing.photo ? <img src={editing.photo} alt="Prévia da foto" className="h-full w-full object-cover" /> : <span className="muted text-sm">Sem foto</span>}
              </div>
              <div className="row">
                <button type="button" className="btn small" onClick={() => fileRef.current?.click()}>Enviar foto</button>
                {editing.photo && <button type="button" className="btn small danger" onClick={() => set('photo', undefined as never)}>Remover</button>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
            </div>

            <div className="grid flex-1 gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', minWidth: 280 }}>
              <label htmlFor={`${uid}-n`}>Nome / nick
                <input id={`${uid}-n`} type="text" maxLength={32} value={editing.name} onChange={(e) => set('name', e.target.value)} />
              </label>
              <label htmlFor={`${uid}-r`}>Posição
                <select id={`${uid}-r`} value={editing.role} onChange={(e) => set('role', e.target.value as Role)}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label htmlFor={`${uid}-t`}>Time
                <select id={`${uid}-t`} value={editing.teamId ?? ''} onChange={(e) => set('teamId', e.target.value || null)}>
                  <option value="">Agente livre</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label htmlFor={`${uid}-o`}>Overall: {editing.ovr}
                <input id={`${uid}-o`} type="range" min={25} max={90} value={editing.ovr} onChange={(e) => set('ovr', Number(e.target.value))} />
              </label>
              <label htmlFor={`${uid}-p`}>Potencial: {Math.max(editing.potential, editing.ovr)}
                <input id={`${uid}-p`} type="range" min={25} max={95} value={Math.max(editing.potential, editing.ovr)} onChange={(e) => set('potential', Number(e.target.value))} />
              </label>
              <label htmlFor={`${uid}-a`}>Idade: {editing.age}
                <input id={`${uid}-a`} type="range" min={15} max={40} value={editing.age} onChange={(e) => set('age', Number(e.target.value))} />
              </label>
              <label className="!flex items-center gap-2 !normal-case !tracking-normal !text-fg" htmlFor={`${uid}-l`}>
                <input id={`${uid}-l`} type="checkbox" checked={!!editing.leadFoot} onChange={(e) => set('leadFoot', e.target.checked)} />
                <span><strong>Pé de chumbo</strong><br /><span className="muted">Rende ~6% menos e morre bem mais nas partidas.</span></span>
              </label>
            </div>
          </div>
          <div className="row" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn primary" onClick={save}>{isNew ? 'Adicionar jogador' : 'Salvar alterações'}</button>
            <button type="button" className="btn" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </section>
      )}

      <div className="row" style={{ marginBottom: '1rem' }}>
        <label>Busca<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome do jogador" /></label>
        <label>Time
          <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}>
            <option value="todos">Todos</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            <option value="">Agentes livres</option>
          </select>
        </label>
        <label>Posição
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role | 'Todos')}>
            <option>Todos</option>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Foto</th><th>Jogador</th><th>Pos.</th><th>Time</th><th className="num">OVR</th><th className="num">POT</th><th className="num">Idade</th><th>Traço</th><th /></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="grid h-10 w-8 place-items-center overflow-hidden border border-line bg-panel-2 text-[0.6rem] text-mute">
                    {p.photo ? <img src={p.photo} alt="" className="h-full w-full object-cover" /> : '—'}
                  </span>
                </td>
                <td>{p.name}</td>
                <td><RoleBadge role={p.role} /></td>
                <td>{teamName(p.teamId)}</td>
                <td className="num"><OvrBadge value={p.ovr} /></td>
                <td className="num muted">{p.potential}</td>
                <td className="num">{p.age}</td>
                <td>{p.leadFoot ? <span className="tag bad">Pé de chumbo</span> : <span className="muted">—</span>}</td>
                <td>
                  <div className="row">
                    <button className="btn small" onClick={() => startEdit(p)}>Editar</button>
                    <button className="btn small danger" onClick={() => remove(p)}>Remover</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <Empty>Nenhum jogador encontrado.</Empty>}
      </div>
    </>
  )
}
