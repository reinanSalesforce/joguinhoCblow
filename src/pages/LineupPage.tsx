import { Meter, OvrBadge, PageHeader, RoleBadge } from '../components/ui'
import { OFF_ROLE_PENALTY, effectiveOvr, sidePower } from '../domain/ratings'
import { ROLES, STYLE_LABEL } from '../domain/types'
import type { Phase, Style } from '../domain/types'
import { useMyTeam } from '../hooks/useGameData'
import { useGameStore } from '../store/gameStore'

const PHASES: { id: Phase; label: string }[] = [
  { id: 'early', label: 'Early game' },
  { id: 'mid', label: 'Mid game' },
  { id: 'late', label: 'Late game' },
  { id: 'teamfight', label: 'Teamfight' },
]

const STYLE_HELP: Record<Style, string> = {
  balanced: 'Sem bônus nem penalidades.',
  early: 'Bônus no início e meio; perde força no late game.',
  scaling: 'Sofre no início, mas é mais forte no late game.',
  teamfight: 'Bônus em lutas de equipe e objetivos (Barão).',
}

export default function LineupPage() {
  const { team, roster, slots, overall } = useMyTeam()
  const setSlot = useGameStore((s) => s.setSlot)
  const setTactic = useGameStore((s) => s.setTactic)
  const autoLineup = useGameStore((s) => s.autoLineup)

  const sortedRoster = [...roster].sort((a, b) => b.ovr - a.ovr)

  return (
    <>
      <PageHeader
        title="Escalação & Tática"
        subtitle={`Overall do time: ${overall} · jogadores fora de posição rendem ${Math.round(OFF_ROLE_PENALTY * 100)}%`}
        actions={<button className="btn" onClick={autoLineup}>Escalar melhor time</button>}
      />
      <div className="grid main-side">
        <section className="card">
          <h3>Titulares</h3>
          <div className="stack">
            {ROLES.map((role) => {
              const slot = slots.find((s) => s.role === role)
              const id = `slot-${role}`
              return (
                <div key={role} className="row between" style={{ borderBottom: '1px solid #1a2542', paddingBottom: '0.6rem' }}>
                  <div className="row">
                    <RoleBadge role={role} />
                    {slot ? <OvrBadge value={effectiveOvr(slot.player, role)} /> : null}
                  </div>
                  <label htmlFor={id} style={{ flex: 1, minWidth: 180 }}>
                    <span className="sr-only">Jogador da posição {role}</span>
                    <select id={id} value={slot?.player.id ?? ''} onChange={(e) => setSlot(role, e.target.value)}>
                      {sortedRoster.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.outRounds > 0}>
                          {p.name} · {p.role} · OVR {p.ovr}
                          {p.role !== role ? ' (fora de posição)' : ''}
                          {p.outRounds > 0 ? ` — fora: ${p.outReason}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )
            })}
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <h3>Estilo de jogo</h3>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="sr-only">Estilo de jogo</legend>
              <div className="stack">
                {(Object.keys(STYLE_LABEL) as Style[]).map((style) => (
                  <label key={style} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', color: 'var(--text)' }}>
                    <input type="radio" name="tactic" checked={team.tactic === style} onChange={() => setTactic(style)} />
                    <span>
                      <strong>{STYLE_LABEL[style]}</strong>
                      <br />
                      <span className="muted">{STYLE_HELP[style]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
          <section className="card">
            <h3>Força por fase</h3>
            <div className="stack">
              {PHASES.map((ph) => {
                const power = sidePower(slots, team, ph.id)
                return (
                  <div key={ph.id}>
                    <div className="row between"><span>{ph.label}</span><strong className="mono">{power.toFixed(1)}</strong></div>
                    <Meter value={(power / 80) * 100} label={`Força no ${ph.label}`} />
                  </div>
                )
              })}
              <div>
                <div className="row between"><span>Entrosamento</span><strong>{Math.round(team.chemistry)}%</strong></div>
                <Meter value={team.chemistry} label="Entrosamento" />
                <p className="muted" style={{ marginTop: '0.4rem' }}>Cada troca de titular reduz o entrosamento; jogar juntos o aumenta.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
