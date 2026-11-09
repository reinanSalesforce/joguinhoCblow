import { ArrowLeft, ArrowLeftRight, Ban, Check, Shield, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CHAMPIONS } from '../domain/champions'
import { centeredUrl, splashUrl } from '../domain/champImages'
import { champName } from '../domain/champName'
import {
  DRAFT_ORDER,
  aiAction,
  applyAi,
  applyBan,
  applyPick,
  assignRoles,
  currentStep,
  draftTimeline,
  findChampion,
  initDraft,
  isAvailable,
  isDraftComplete,
  toResult,
} from '../domain/draft'
import type { DraftContext, DraftSide, DraftState } from '../domain/draft'
import { resolveSlots, teamOverall } from '../domain/ratings'
import type { Slot } from '../domain/ratings'
import { createRng } from '../domain/rng'
import { nextDay, previewUserSeries } from '../domain/season'
import { rosterOf } from '../domain/transfers'
import { ROLES } from '../domain/types'
import type { DraftResult, GameData, Match, Role } from '../domain/types'
import { useDraftUi } from '../store/draftStore'
import { useGameStore } from '../store/gameStore'
import { useSettingsStore } from '../store/settingsStore'
import { ChampIcon } from './ChampIcon'
import { TeamCrest } from './ui'

const FILTERS: readonly (readonly [Role | 'Todas', string])[] = [
  ['Todas', 'Todas'], ['Top', 'Topo'], ['Jungle', 'Selva'], ['Mid', 'Meio'], ['ADC', 'Atirador'], ['Suporte', 'Suporte'],
]
const ROLE_LABEL: Record<Role, string> = { Top: 'Topo', Jungle: 'Selva', Mid: 'Meio', ADC: 'Atirador', Suporte: 'Suporte' }
const GENERATE_STEP_MS = 170

function phaseLabel(step: number): string {
  if (step >= DRAFT_ORDER.length) return 'Draft concluído'
  if (step < 6) return 'Fase de banimento 1'
  if (step < 12) return 'Fase de escolha 1'
  if (step < 16) return 'Fase de banimento 2'
  return 'Fase de escolha 2'
}

/** Contador regressivo do turno. Remonta (via key) a cada etapa; ao zerar chama onExpire uma única vez. */
function TurnTimer({ seconds, mine, onExpire }: { seconds: number; mine: boolean; onExpire: () => void }) {
  const [left, setLeft] = useState(seconds)
  const expireRef = useRef(onExpire)
  const fired = useRef(false)

  useEffect(() => {
    expireRef.current = onExpire
  })
  useEffect(() => {
    const id = window.setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true
      expireRef.current()
    }
  }, [left])

  return (
    <div className={`dr-timer${left <= 10 ? ' urgent' : ''}${mine ? ' mine' : ''}`} role="timer" aria-label={`${left} segundos restantes`}>
      <span className="dr-timer-num mono">{left}</span>
      <div className="dr-timer-bar" aria-hidden="true"><span style={{ width: `${(left / seconds) * 100}%` }} /></div>
    </div>
  )
}

/** Palco central: arte do campeão em destaque, "PENSANDO…" e o carimbo animado de banido/escolhido. */
function Stage({ state, hover, actor, verb }: { state: DraftState; hover: string | null; actor: string; verb: string }) {
  const last = state.last
  const done = isDraftComplete(state)
  return (
    <div className={`dr-stage ${currentStep(state)?.side ?? ''}`}>
      {hover && <div className="dr-stage-art" style={{ backgroundImage: `url(${splashUrl(hover)})` }} />}
      <div className="dr-stage-text">
        {done ? (
          <strong>Draft concluído</strong>
        ) : hover ? (
          <>
            <small>{actor} {verb}</small>
            <strong>{champName(hover)}</strong>
          </>
        ) : (
          <>
            <small>{actor} {verb}</small>
            <em>Pensando…</em>
          </>
        )}
      </div>
      {last && (
        <div key={state.step} className={`dr-flash ${last.type}`} aria-hidden="true">
          {last.champ && <div className="dr-flash-art" style={{ backgroundImage: `url(${splashUrl(last.champ)})` }} />}
          {last.type === 'ban' ? (
            <>
              <i className="dr-slash a" />
              <i className="dr-slash b" />
              <span className="dr-stamp">{last.champ ? 'Banido' : 'Sem ban'}</span>
            </>
          ) : (
            <span className="dr-picked">
              <small>Escolhido</small>
              <strong>{last.champ ? champName(last.champ) : ''}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function BanRow({ side, bans }: { side: DraftSide; bans: (string | null)[] }) {
  return (
    <div className={`dr-bans ${side}`} aria-label={`Banimentos do lado ${side === 'blue' ? 'azul' : 'vermelho'}`}>
      {Array.from({ length: 5 }, (_, i) => {
        const b = bans[i]
        return (
          <span key={i} className={`dr-ban${b ? ' filled' : ''}`} title={b ? champName(b) : undefined}>
            {b ? <ChampIcon champ={b} size={44} className="dr-ban-img" /> : b === null ? <Ban size={16} aria-hidden="true" /> : <Shield size={16} aria-hidden="true" />}
          </span>
        )
      })}
    </div>
  )
}

/** Carta de escolha: B1…B5 (azul) ou R1…R5 (vermelho), na ordem em que o draft acontece. */
function PickCard({ side, index, champ, preview, active }: { side: DraftSide; index: number; champ: string | undefined; preview: string | null; active: boolean }) {
  const shown = champ ?? preview
  const label = `${side === 'blue' ? 'B' : 'R'}${index + 1}`
  return (
    <div className={`dr-pick ${side}${active ? ' active' : ''}${champ ? ' filled' : ''}${!champ && preview ? ' ghost' : ''}`} aria-label={`${label}: ${champ ? champName(champ) : 'vazio'}`}>
      {shown && <span className="dr-pick-art" style={{ backgroundImage: `url(${centeredUrl(shown)})` }} />}
      <span className="dr-pick-role">{label}</span>
      <span className="dr-pick-name"><strong>{shown ? champName(shown) : '—'}</strong></span>
      {active && !champ && <span className="dr-pick-live">Escolhendo</span>}
    </div>
  )
}

const fullMap = (picks: readonly string[], slots: readonly Slot[]): Record<Role, string> => {
  const auto = assignRoles(picks, slots)
  return Object.fromEntries(ROLES.map((r) => [r, auto[r] ?? picks[0] ?? 'Garen'])) as Record<Role, string>
}

/** Tela de definição de posições: depois do draft, o usuário decide quem joga em cada posição. */
function AssignPanel({ picks, slots, side, onBack, onConfirm }: {
  picks: readonly string[]
  slots: readonly Slot[]
  side: DraftSide
  onBack: () => void
  onConfirm: (map: Record<Role, string>) => void
}) {
  const [map, setMap] = useState<Record<Role, string>>(() => fullMap(picks, slots))
  const [sel, setSel] = useState<Role | null>(null)
  const prefix = side === 'blue' ? 'B' : 'R'

  const clickRole = (role: Role): void => {
    if (!sel) return setSel(role)
    if (sel === role) return setSel(null)
    setMap((m) => ({ ...m, [sel]: m[role], [role]: m[sel] }))
    setSel(null)
  }

  const status = (role: Role): { text: string; cls: string } => {
    const c = findChampion(map[role])
    const player = slots.find((s) => s.role === role)?.player
    if (player?.champs.includes(map[role])) return { text: 'Campeão de conforto', cls: 'ok' }
    if (c?.lanes.includes(role)) return { text: 'Na lane', cls: 'ok' }
    return { text: 'Fora da lane', cls: 'bad' }
  }

  return (
    <div className="dr-assign">
      <section className="dr-assign-col">
        <h3>Suas escolhas · ordem do draft</h3>
        <div className="dr-assign-picks">
          {picks.map((id, i) => (
            <div key={id} className={`dr-pick ${side} filled static`}>
              <span className="dr-pick-art" style={{ backgroundImage: `url(${centeredUrl(id)})` }} />
              <span className="dr-pick-role">{prefix}{i + 1}</span>
              <span className="dr-pick-name"><strong>{champName(id)}</strong><small>{(findChampion(id)?.lanes ?? []).map((l) => ROLE_LABEL[l]).join(' · ')}</small></span>
            </div>
          ))}
        </div>
      </section>

      <section className="dr-assign-col">
        <h3>Defina as posições</h3>
        <p className="muted text-sm">Clique em duas posições para trocar os campeões de lugar.</p>
        <div className="dr-assign-roles">
          {ROLES.map((role) => {
            const player = slots.find((s) => s.role === role)?.player
            const st = status(role)
            const order = picks.indexOf(map[role]) + 1
            return (
              <button key={role} type="button" className={`dr-role${sel === role ? ' sel' : ''}`} aria-pressed={sel === role} onClick={() => clickRole(role)}>
                <span className="dr-role-art" style={{ backgroundImage: `url(${centeredUrl(map[role])})` }} />
                <span className="dr-role-info">
                  <small>{ROLE_LABEL[role]} · {player?.name ?? '—'}</small>
                  <strong>{champName(map[role])}</strong>
                </span>
                <span className="dr-role-tags">
                  <b>{prefix}{order}</b>
                  <i className={st.cls}>{st.text}</i>
                </span>
                <ArrowLeftRight className="dr-role-swap" size={16} aria-hidden="true" />
              </button>
            )
          })}
        </div>
        <div className="dr-actions" style={{ marginTop: '0.8rem' }}>
          <button type="button" className="btn" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> Voltar ao draft</button>
          <button type="button" className="btn" onClick={() => { setMap(fullMap(picks, slots)); setSel(null) }}>Sugestão automática</button>
          <button type="button" className="btn primary big" onClick={() => onConfirm(map)}><Check size={18} aria-hidden="true" /> Iniciar partida</button>
        </div>
      </section>
    </div>
  )
}

interface BoardProps {
  ctx: DraftContext
  userSide: DraftSide
  used: string[]
  names: Record<DraftSide, string>
  gameLabel: string
  seriesLabel: string
  onFinish: (result: DraftResult) => void
}

function DraftBoard({ ctx, userSide, used, names, gameLabel, seriesLabel, onFinish }: BoardProps) {
  const draftCfg = useSettingsStore((s) => s.settings.draft)
  const [state, setState] = useState<DraftState>(() => initDraft(used))
  const [selected, setSelected] = useState<string | null>(null) // id ou '__none'
  const [filter, setFilter] = useState<Role | 'Todas'>('Todas')
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<'draft' | 'assign'>('draft')
  const [queue, setQueue] = useState<DraftState[]>([]) // animação do "gerar draft completo"
  const [aiHover, setAiHover] = useState<{ step: number; champ: string } | null>(null)
  const [rng] = useState(() => createRng(Date.now() >>> 0))

  const step = currentStep(state)
  const complete = isDraftComplete(state)
  const generating = queue.length > 0
  const myTurn = !!step && step.side === userSide && !generating
  const actingSide: DraftSide | null = step?.side ?? null

  // Turnos do adversário: mostra a "dúvida" (pré-seleção) e depois confirma.
  useEffect(() => {
    if (complete || !step || step.side === userSide || generating) return
    const action = aiAction(state, ctx, rng)
    const first = window.setTimeout(() => action && setAiHover({ step: state.step, champ: action.champ }), draftCfg.aiDelayMs * 0.45)
    const second = window.setTimeout(() => setState((s) => (s.step === state.step ? applyAi(s, action) : s)), draftCfg.aiDelayMs)
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(second)
    }
  }, [state, complete, step, userSide, ctx, rng, draftCfg.aiDelayMs, generating])

  // Reprodução acelerada do draft gerado
  useEffect(() => {
    if (queue.length === 0) return
    const id = window.setTimeout(() => {
      setState(queue[0]!)
      setQueue((q) => q.slice(1))
    }, GENERATE_STEP_MS)
    return () => window.clearTimeout(id)
  }, [queue])

  const verb = !step ? '' : step.type === 'ban' ? 'banindo' : 'escolhendo'
  const actor = actingSide ? names[actingSide] : ''

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CHAMPIONS.filter((c) => (filter === 'Todas' || c.lanes.includes(filter)) && (!q || c.name.toLowerCase().includes(q)))
  }, [filter, query])

  const banned = useMemo(() => new Set([...state.bans.blue, ...state.bans.red].filter((x): x is string => !!x)), [state.bans])
  const picked = useMemo(() => new Set([...state.picks.blue, ...state.picks.red]), [state.picks])

  const hover: string | null =
    myTurn && selected && selected !== '__none' ? selected : !myTurn && aiHover?.step === state.step ? aiHover.champ : null

  const canConfirm = myTurn && !!selected && (step?.type === 'ban' || selected !== '__none')

  const confirm = (): void => {
    if (!myTurn || !step || !selected) return
    if (step.type === 'ban') setState((s) => applyBan(s, selected === '__none' ? null : selected))
    else if (selected !== '__none') setState((s) => applyPick(s, selected))
    setSelected(null)
  }

  const autoMine = useCallback((): void => {
    setState((s) => applyAi(s, aiAction(s, ctx, rng)))
    setSelected(null)
  }, [ctx, rng])

  // Tempo esgotado: confirma a seleção atual (se válida) ou joga automaticamente.
  const onExpire = (): void => {
    if (!myTurn || complete || !draftCfg.autoOnTimeout) return
    if (canConfirm) confirm()
    else autoMine()
  }

  /** Gera TODO o draft (bans e picks dos dois times) do zero, com animação acelerada. */
  const generateAll = (): void => {
    const gen = createRng((Math.random() * 4294967296) >>> 0)
    setState(initDraft(used))
    setSelected(null)
    setAiHover(null)
    setQueue(draftTimeline(ctx, used, gen))
  }
  const skipGenerate = (): void => {
    const last = queue.at(-1)
    if (last) setState(last)
    setQueue([])
  }

  const seconds = step?.type === 'ban' ? draftCfg.banSeconds : draftCfg.pickSeconds

  const pickColumn = (side: DraftSide) => {
    const list = state.picks[side]
    return (
      <div className={`dr-col ${side}`} aria-label={`Escolhas do lado ${side === 'blue' ? 'azul' : 'vermelho'}`}>
        <div className="dr-col-head">
          <span className="dr-side">{side === 'blue' ? 'Lado azul' : 'Lado vermelho'}{side === userSide ? ' · você' : ''}</span>
          <strong>{names[side]}</strong>
          <BanRow side={side} bans={state.bans[side]} />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <PickCard
            key={i}
            side={side}
            index={i}
            champ={list[i]}
            preview={side === actingSide && step?.type === 'pick' && i === list.length ? hover : null}
            active={side === actingSide && step?.type === 'pick' && i === list.length}
          />
        ))}
      </div>
    )
  }

  const userPicks = state.picks[userSide]
  const userSlots = ctx.slots[userSide]
  const turnText = generating
    ? 'Gerando draft completo…'
    : stage === 'assign'
      ? 'Clique em duas posições para trocar'
      : complete
        ? 'Próximo passo: definir as posições'
        : myTurn
          ? `Sua vez · ${step!.type === 'ban' ? 'banir' : 'escolher'} um campeão`
          : `${actor} · ${verb}`

  return (
    <div className="dr-board" data-side={stage === 'assign' ? 'done' : (actingSide ?? 'done')}>
      <header className="dr-head">
        <div className="dr-head-center">
          <span className="dr-gamechip">{gameLabel}</span>
          <h2 className="dr-phase">{stage === 'assign' ? 'Definir posições' : phaseLabel(state.step)}</h2>
          {stage === 'draft' && !complete && draftCfg.timerEnabled && !generating && (
            <TurnTimer key={state.step} seconds={seconds} mine={myTurn} onExpire={onExpire} />
          )}
          <p className={`dr-turn ${stage === 'draft' ? (actingSide ?? '') : ''}`} aria-live="polite">{turnText}</p>
          <div className="dr-steps" aria-hidden="true">
            {DRAFT_ORDER.map((st, i) => (
              <i key={i} className={`${st.side} ${st.type}${i < state.step ? ' done' : ''}${i === state.step ? ' now' : ''}`} />
            ))}
          </div>
          <small className="muted">{seriesLabel}</small>
        </div>
      </header>

      {stage === 'assign' ? (
        <AssignPanel
          picks={userPicks}
          slots={userSlots}
          side={userSide}
          onBack={() => setStage('draft')}
          onConfirm={(map) => onFinish(toResult(state, ctx, { [userSide]: map }))}
        />
      ) : (
        <div className="dr-main">
          {pickColumn('blue')}

          <section className="dr-center">
            <Stage state={state} hover={hover} actor={actor} verb={verb} />

            <div className="dr-tools">
              <div className="tabs" role="group" aria-label="Filtrar campeões por função" style={{ margin: 0 }}>
                {FILTERS.map(([id, label]) => (
                  <button key={id} type="button" className="tab" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
                ))}
              </div>
              <label className="dr-search">
                <span className="sr-only">Buscar campeões</span>
                <input type="search" placeholder="Buscar campeões" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
            </div>

            <div className="champ-grid" role="listbox" aria-label="Campeões">
              {step?.type === 'ban' && (
                <button type="button" role="option" aria-selected={selected === '__none'} disabled={!myTurn} className={`champ-tile none${selected === '__none' ? ' selected' : ''}`} onClick={() => setSelected('__none')}>
                  <span className="champ-art none-art"><X size={22} aria-hidden="true" /></span>
                  <span className="champ-name">Nenhum</span>
                </button>
              )}
              {visible.map((c) => {
                const isBanned = banned.has(c.id)
                const isPicked = picked.has(c.id)
                const isUsed = state.used.includes(c.id)
                const free = isAvailable(state, c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={selected === c.id}
                    aria-disabled={!free || !myTurn}
                    disabled={!free}
                    title={isBanned ? `${c.name} — banido` : isUsed ? `${c.name} — usado nesta série` : isPicked ? `${c.name} — já escolhido` : c.name}
                    className={`champ-tile${selected === c.id ? ' selected' : ''}${isBanned ? ' banned' : ''}${isPicked ? ' picked' : ''}${isUsed ? ' used' : ''}${!myTurn && free ? ' wait' : ''}`}
                    onClick={() => myTurn && setSelected(c.id)}
                  >
                    <span className="champ-art">
                      <ChampIcon champ={c.id} size={64} />
                      {isBanned && <Ban className="champ-ban" size={26} aria-hidden="true" />}
                    </span>
                    <span className="champ-name">{c.name}</span>
                  </button>
                )
              })}
              {visible.length === 0 && <p className="muted">Nenhum campeão encontrado.</p>}
            </div>

            <div className="dr-foot">
              <div className="dr-used">
                <strong>Usados na série</strong>
                {state.used.length === 0 ? <span className="muted">nenhum</span> : state.used.map((id) => <ChampIcon key={id} champ={id} size={24} className="used-img" />)}
              </div>
              <div className="dr-actions">
                {complete ? (
                  <button type="button" className="btn primary big" onClick={() => setStage('assign')}>
                    Definir posições <ArrowLeftRight size={16} aria-hidden="true" />
                  </button>
                ) : generating ? (
                  <button type="button" className="btn" onClick={skipGenerate}>Pular animação</button>
                ) : (
                  <>
                    <button type="button" className="btn primary big" disabled={!canConfirm} onClick={confirm}>
                      {step?.type === 'ban' ? 'Banir' : 'Pronto'}{selected && selected !== '__none' ? ` · ${champName(selected)}` : ''}
                    </button>
                    <button type="button" className="btn" disabled={!myTurn} onClick={autoMine}>Sugestão automática</button>
                  </>
                )}
                {!generating && (
                  <button type="button" className="btn gen" onClick={generateAll} aria-describedby="gen-help">
                    <Sparkles size={16} aria-hidden="true" /> {complete ? 'Gerar outro draft' : 'Gerar draft completo'}
                  </button>
                )}
                <span id="gen-help" className="sr-only">Gera todos os banimentos e escolhas dos dois times</span>
              </div>
            </div>
          </section>

          {pickColumn('red')}
        </div>
      )}
    </div>
  )
}

export function DraftModal() {
  const open = useDraftUi((s) => s.open)
  const closeDraft = useDraftUi((s) => s.closeDraft)
  const game = useGameStore((s) => s.game)
  if (!open || !game) return null
  return <DraftFlow game={game} onClose={closeDraft} />
}

function DraftFlow({ game, onClose }: { game: GameData; onClose: () => void }) {
  const navigate = useNavigate()
  const playDay = useGameStore((s) => s.playDay)
  const fearless = useSettingsStore((s) => s.settings.draft.fearless)
  const [drafts, setDrafts] = useState<DraftResult[]>([])
  const day = nextDay(game)
  const match: Match | undefined = game.matches.find((m) => m.day === day && (m.homeId === game.userTeamId || m.awayId === game.userTeamId))

  // Pré-simulação (sem gravar) para saber o placar parcial e se a série continua.
  const preview = useMemo(() => (match ? previewUserSeries(game, drafts) : undefined), [game, match, drafts])
  const ctx = useMemo<DraftContext | null>(() => {
    if (!match) return null
    const home = game.teams[match.homeId]!
    const away = game.teams[match.awayId]!
    return {
      slots: { blue: resolveSlots(home, rosterOf(game, home.id)), red: resolveSlots(away, rosterOf(game, away.id)) },
      tactic: { blue: home.tactic, red: away.tactic },
    }
  }, [game, match])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!match || !ctx || !preview) return null

  const home = game.teams[match.homeId]!
  const away = game.teams[match.awayId]!
  const userSide: DraftSide = match.homeId === game.userTeamId ? 'blue' : 'red'
  const names = { blue: home.name, red: away.name }
  const used = match.bestOf > 1 && fearless ? drafts.flatMap((d) => [...Object.values(d.picks.blue), ...Object.values(d.picks.red)]) : []
  const done = preview.games.slice(0, drafts.length)
  const wins: [number, number] = [done.filter((g) => g.winner === 'home').length, done.filter((g) => g.winner === 'away').length]

  const finish = (result: DraftResult): void => {
    const next = [...drafts, result]
    const after = previewUserSeries(game, next)
    if (after && after.games.length > next.length) {
      setDrafts(next)
      return
    }
    onClose()
    const id = playDay(next)
    if (id !== null) navigate('/partida')
  }

  return (
    <div className="dr-overlay" role="dialog" aria-modal="true" aria-label="Draft de campeões">
      {/* Fundo: tela do confronto */}
      <div className="dr-backdrop" aria-hidden="true">
        <div className="dr-bd-team left">
          <TeamCrest name={home.name} size={180} color={home.color} tag={home.tag} />
          <strong>{home.name}</strong>
          <span>OVR {teamOverall(ctx.slots.blue)}</span>
        </div>
        <div className="dr-bd-mid">
          <span className="eyebrow">{match.stage} · melhor de {match.bestOf}</span>
          <b>VS</b>
        </div>
        <div className="dr-bd-team right">
          <TeamCrest name={away.name} size={180} color={away.color} tag={away.tag} />
          <strong>{away.name}</strong>
          <span>OVR {teamOverall(ctx.slots.red)}</span>
        </div>
      </div>

      <div className="dr-window">
        <button type="button" className="dr-close" onClick={onClose} aria-label="Fechar draft (Esc)"><X size={18} aria-hidden="true" /></button>
        <DraftBoard
          key={drafts.length}
          ctx={ctx}
          userSide={userSide}
          used={used}
          names={names}
          gameLabel={`${match.stage} · Jogo ${drafts.length + 1}`}
          seriesLabel={match.bestOf > 1 ? `Série ${wins[0]}–${wins[1]} · MD${match.bestOf}` : 'Melhor de 1'}
          onFinish={finish}
        />
      </div>
    </div>
  )
}
