import { useId, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Meter, OvrBadge, RoleBadge, TeamCrest } from '../components/ui'
import {
  CUSTOM_OVR_MAX,
  CUSTOM_OVR_MIN,
  startBudget,
  TEAM_COLORS,
  availablePool,
  creationCost,
  foundingCost,
  totalCost,
  validateCustomTeam,
} from '../domain/customTeam'
import type { CustomPlayerInput, CustomTeamConfig, JoinMode } from '../domain/customTeam'
import { TEAM_SEEDS } from '../domain/seed'
import { money } from '../domain/transfers'
import { ROLES, ROSTER_MAX, STYLE_LABEL } from '../domain/types'
import type { Role, Style } from '../domain/types'
import { useAdminStore } from '../store/adminStore'
import { useGameStore } from '../store/gameStore'
import { useToastStore } from '../store/toastStore'

const emptyPlayer = (): CustomPlayerInput => ({ name: '', role: 'Top', age: 20, ovr: 48 })

export default function CreateTeamPage() {
  const navigate = useNavigate()
  const uid = useId()
  const startCustom = useGameStore((s) => s.startCustom)
  const db = useAdminStore((s) => s.db)
  const show = useToastStore((s) => s.show)

  const [seed] = useState(() => Date.now() >>> 0)
  const [name, setName] = useState('')
  const [tag, setTag] = useState('')
  const [presidents, setPresidents] = useState('')
  const [color, setColor] = useState<string>(TEAM_COLORS[0])
  const [tactic, setTactic] = useState<Style>('balanced')
  const [joinKind, setJoinKind] = useState<'add' | 'replace'>('add')
  const [replaceId, setReplaceId] = useState<string>(TEAM_SEEDS[TEAM_SEEDS.length - 1]!.id)
  const [signedIds, setSignedIds] = useState<string[]>([])
  const [created, setCreated] = useState<CustomPlayerInput[]>([])
  const [draft, setDraft] = useState<CustomPlayerInput>(emptyPlayer)
  const [roleFilter, setRoleFilter] = useState<Role | 'Todos'>('Todos')

  const mode: JoinMode = joinKind === 'add' ? { kind: 'add' } : { kind: 'replace', teamId: replaceId }
  const pool = useMemo(
    () => availablePool(seed, joinKind === 'add' ? { kind: 'add' } : { kind: 'replace', teamId: replaceId }, db),
    [seed, joinKind, replaceId, db],
  )
  const effectiveTag = (tag || name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3)).toUpperCase().slice(0, 4)
  const validSigned = signedIds.filter((id) => pool.some((p) => p.id === id))

  const config: CustomTeamConfig = { name, tag: effectiveTag, presidents, color, tactic, mode, signedIds: validSigned, created }
  const spent = totalCost(config, pool)
  const remaining = startBudget() - spent
  const errors = validateCustomTeam(config, seed, db)
  const count = validSigned.length + created.length

  const toggle = (id: string): void =>
    setSignedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const addCreated = (): void => {
    const n = draft.name.trim()
    if (n.length < 2) return show({ ok: false, message: 'Dê um nome ao jogador.' })
    if (count >= ROSTER_MAX) return show({ ok: false, message: `Máximo de ${ROSTER_MAX} jogadores.` })
    if (creationCost(draft) > remaining) return show({ ok: false, message: 'Orçamento insuficiente para esse jogador.' })
    setCreated((cur) => [...cur, { ...draft, name: n }])
    setDraft((d) => ({ ...emptyPlayer(), role: d.role }))
  }

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    if (errors.length) return show({ ok: false, message: errors[0]! })
    const result = startCustom(config, seed)
    show(result)
    if (result.ok) navigate('/painel')
  }

  const visiblePool = pool.filter((p) => roleFilter === 'Todos' || p.role === roleFilter)
  const roleCount = (r: Role): number =>
    validSigned.filter((id) => pool.find((p) => p.id === id)?.role === r).length + created.filter((c) => c.role === r).length

  return (
    <form className="content" onSubmit={submit} noValidate>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Novo clube</div>
          <h1 className="!mb-0">Criar time</h1>
        </div>
        <Link to="/novo" className="btn">← Voltar</Link>
      </header>

      <div className="grid main-side">
        <div className="stack !gap-6">
          {/* 1. Identidade */}
          <section className="card">
            <h3>1 · Identidade</h3>
            <div className="grid cols-2">
              <label htmlFor={`${uid}-name`}>
                Nome do time
                <input id={`${uid}-name`} type="text" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Os Invocadores" />
              </label>
              <label htmlFor={`${uid}-tag`}>
                Sigla (até 4 letras)
                <input id={`${uid}-tag`} type="text" maxLength={4} value={tag} onChange={(e) => setTag(e.target.value)} placeholder={effectiveTag || 'OSI'} />
              </label>
              <label htmlFor={`${uid}-pres`}>
                Presidente(s)
                <input id={`${uid}-pres`} type="text" maxLength={40} value={presidents} onChange={(e) => setPresidents(e.target.value)} placeholder="Ex.: Você e um amigo" />
              </label>
              <label htmlFor={`${uid}-tactic`}>
                Estilo de jogo inicial
                <select id={`${uid}-tactic`} value={tactic} onChange={(e) => setTactic(e.target.value as Style)}>
                  {(Object.keys(STYLE_LABEL) as Style[]).map((s) => <option key={s} value={s}>{STYLE_LABEL[s]}</option>)}
                </select>
              </label>
            </div>
            <fieldset className="mt-4 border-0 p-0">
              <legend className="mb-2 text-xs uppercase tracking-widest text-mute">Cor do escudo</legend>
              <div className="flex flex-wrap items-center gap-2">
                {TEAM_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                    className="h-8 w-8 border-2"
                    style={{ background: c, borderColor: color === c ? '#fff' : 'transparent' }}
                  />
                ))}
                <label className="ml-2 flex items-center gap-2">
                  <span className="sr-only">Cor personalizada</span>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-10 cursor-pointer border border-line bg-transparent p-0" />
                </label>
              </div>
            </fieldset>
          </section>

          {/* 2. Vaga no campeonato */}
          <section className="card">
            <h3>2 · Vaga no campeonato</h3>
            <div className="stack">
              <label className="!flex items-start gap-3 !normal-case !tracking-normal !text-fg">
                <input type="radio" name="join" checked={joinKind === 'add'} onChange={() => setJoinKind('add')} />
                <span><strong>Entrar como 9º time</strong><br /><span className="muted">Todos os clubes permanecem. Cada time folga em uma rodada.</span></span>
              </label>
              <label className="!flex items-start gap-3 !normal-case !tracking-normal !text-fg">
                <input type="radio" name="join" checked={joinKind === 'replace'} onChange={() => setJoinKind('replace')} />
                <span>
                  <strong>Substituir um time existente</strong><br />
                  <span className="muted">Os jogadores do clube substituído ficam disponíveis para você contratar.</span>
                </span>
              </label>
              {joinKind === 'replace' && (
                <label htmlFor={`${uid}-replace`}>
                  Time substituído
                  <select id={`${uid}-replace`} value={replaceId} onChange={(e) => { setReplaceId(e.target.value); setSignedIds([]) }}>
                    {TEAM_SEEDS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
              )}
            </div>
          </section>

          {/* 3. Elenco */}
          <section className="card">
            <h3>3 · Elenco inicial</h3>
            <p className="muted text-sm">
              Contrate agentes livres (custam metade do valor de mercado) ou crie seus próprios jogadores. Precisa de ao menos um de cada posição.
            </p>
            <div className="tabs" role="group" aria-label="Filtrar jogadores por posição">
              {(['Todos', ...ROLES] as const).map((r) => (
                <button key={r} type="button" className="tab" aria-pressed={roleFilter === r} onClick={() => setRoleFilter(r)}>{r}</button>
              ))}
            </div>
            <div className="table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table>
                <thead><tr><th>Jogador</th><th>Pos.</th><th className="num">OVR</th><th className="num">Idade</th><th className="num">Custo</th><th /></tr></thead>
                <tbody>
                  {visiblePool.map((p) => {
                    const on = validSigned.includes(p.id)
                    return (
                      <tr key={p.id} className={on ? 'me' : undefined}>
                        <td>{p.name}</td>
                        <td><RoleBadge role={p.role} /></td>
                        <td className="num"><OvrBadge value={p.ovr} /></td>
                        <td className="num">{p.age}</td>
                        <td className="num">{money(foundingCost(p))}</td>
                        <td>
                          <button type="button" className={`btn small${on ? '' : ' primary'}`} aria-pressed={on} onClick={() => toggle(p.id)}>
                            {on ? 'Remover' : 'Contratar'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <h3 className="!mt-6">Criar jogador</h3>
            <div className="grid cols-4 items-end">
              <label htmlFor={`${uid}-pn`}>
                Nome / nick
                <input id={`${uid}-pn`} type="text" maxLength={24} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </label>
              <label htmlFor={`${uid}-pr`}>
                Posição
                <select id={`${uid}-pr`} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Role })}>
                  {ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label htmlFor={`${uid}-pa`}>
                Idade: {draft.age}
                <input id={`${uid}-pa`} type="range" min={16} max={35} value={draft.age} onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })} />
              </label>
              <label htmlFor={`${uid}-po`}>
                Overall: {draft.ovr}
                <input id={`${uid}-po`} type="range" min={CUSTOM_OVR_MIN} max={CUSTOM_OVR_MAX} value={draft.ovr} onChange={(e) => setDraft({ ...draft, ovr: Number(e.target.value) })} />
              </label>
            </div>
            <div className="row mt-3">
              <button type="button" className="btn" onClick={addCreated}>Adicionar jogador criado</button>
              <span className="muted text-sm">Custo: {money(creationCost(draft))}</span>
            </div>
            {created.length > 0 && (
              <ul className="feed mt-3">
                {created.map((c, i) => (
                  <li key={`${c.name}-${i}`}>
                    <span className="row between">
                      <span className="row"><strong>{c.name}</strong><RoleBadge role={c.role} /><span className="muted">OVR {c.ovr} · {c.age} anos · {money(creationCost(c))}</span></span>
                      <button type="button" className="btn small danger" onClick={() => setCreated((cur) => cur.filter((_, j) => j !== i))}>Remover</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Resumo */}
        <aside className="stack" style={{ alignSelf: 'start', position: 'sticky', top: 120 }}>
          <section className="card">
            <div className="mb-4 flex items-center gap-4">
              <TeamCrest name={name || 'Novo Time'} size={72} color={color} tag={effectiveTag || '?'} />
              <div>
                <h2 className="!mb-0">{name.trim() || 'Seu time'}</h2>
                <span className="muted text-sm">{presidents.trim() || 'Presidente'}</span>
              </div>
            </div>
            <div className="row between"><span className="muted">Orçamento</span><strong>{money(startBudget())}</strong></div>
            <div className="row between"><span className="muted">Gasto no elenco</span><strong>{money(spent)}</strong></div>
            <div className="row between"><span className="muted">Caixa inicial</span><strong className={remaining < 0 ? 'bad' : 'gold'}>{money(remaining)}</strong></div>
            <Meter value={(spent / startBudget()) * 100} label="Orçamento utilizado" bad={remaining < 0} />
            <h3 className="!mt-4">Elenco ({count}/{ROSTER_MAX})</h3>
            <ul className="feed">
              {ROLES.map((r) => (
                <li key={r} className={roleCount(r) > 0 ? 'clube' : 'jogador'}>
                  <span className="row between"><RoleBadge role={r} /><strong>{roleCount(r)}</strong></span>
                </li>
              ))}
            </ul>
          </section>
          <section className="card" aria-live="polite">
            <h3>Checklist</h3>
            {errors.length === 0 ? (
              <p className="ok !mb-0">Tudo certo para criar o time!</p>
            ) : (
              <ul className="feed">{errors.map((e) => <li key={e} className="jogador">{e}</li>)}</ul>
            )}
            <button type="submit" className="btn primary big mt-4 w-full" disabled={errors.length > 0}>Criar time e começar</button>
          </section>
        </aside>
      </div>
    </form>
  )
}
