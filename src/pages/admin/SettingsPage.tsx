import { useId, useRef } from 'react'
import type { ChangeEvent } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_SETTINGS } from '../../domain/config'
import type { BestOf } from '../../domain/config'
import { PageHeader } from '../../components/ui'
import { resizeImage } from '../../lib/image'
import { useAssetStore } from '../../store/assetStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useToastStore } from '../../store/toastStore'

function NumberField({
  label, hint, value, min, max, step = 1, unit, scale = 1, onChange,
}: {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  /** valor exibido = valor salvo × scale (ex.: 0.8 → 80%) */
  scale?: number
  onChange: (v: number) => void
}) {
  const id = useId()
  const shown = Math.round(value * scale * 100) / 100
  const set = (display: number): void => {
    if (Number.isNaN(display)) return
    const clamped = Math.min(max, Math.max(min, display))
    onChange(Math.round((clamped / scale) * 1000) / 1000)
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <button type="button" className="btn small" aria-label={`Diminuir ${label}`} onClick={() => set(shown - step)}>−</button>
        <input id={id} type="number" value={shown} min={min} max={max} step={step} onChange={(e) => set(Number(e.target.value))} style={{ width: '6rem', textAlign: 'center' }} />
        <button type="button" className="btn small" aria-label={`Aumentar ${label}`} onClick={() => set(shown + step)}>+</button>
        {unit && <span className="muted">{unit}</span>}
      </div>
      {hint && <small className="muted">{hint}</small>}
    </div>
  )
}

function ToggleField({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id} className="!flex items-center gap-3 !normal-case !tracking-normal !text-fg">
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span><strong>{label}</strong>{hint && <><br /><span className="muted">{hint}</span></>}</span>
      </label>
    </div>
  )
}

function SelectField<T extends string | number>({ label, hint, value, options, onChange }: {
  label: string
  hint?: string
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={String(value)} onChange={(e) => { const found = options.find(([v]) => String(v) === e.target.value); if (found) onChange(found[0]) }}>
        {options.map(([v, text]) => <option key={String(v)} value={String(v)}>{text}</option>)}
      </select>
      {hint && <small className="muted">{hint}</small>}
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="card">
      <h3>{title}</h3>
      {subtitle && <p className="muted text-sm">{subtitle}</p>}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>{children}</div>
    </section>
  )
}

const BEST_OF: readonly (readonly [BestOf, string])[] = [[1, 'Melhor de 1'], [3, 'Melhor de 3'], [5, 'Melhor de 5']]

export default function SettingsPage() {
  const s = useSettingsStore((st) => st.settings)
  const update = useSettingsStore((st) => st.update)
  const reset = useSettingsStore((st) => st.reset)
  const show = useToastStore((st) => st.show)
  const minimap = useAssetStore((st) => st.minimap)
  const setMinimap = useAssetStore((st) => st.setMinimap)
  const mapFile = useRef<HTMLInputElement>(null)

  const onMap = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setMinimap(await resizeImage(file, 900, 900, 0.5))
      show({ ok: true, message: 'Imagem do minimapa atualizada.' })
    } catch (err) {
      show({ ok: false, message: err instanceof Error ? err.message : 'Falha ao carregar a imagem.' })
    }
  }

  return (
    <>
      <PageHeader
        title="Configurações do site"
        subtitle="As alterações são salvas automaticamente e valem a partir da próxima partida, draft ou temporada."
        actions={
          <button className="btn danger" onClick={() => { if (window.confirm('Restaurar todas as configurações para o padrão?')) { reset(); show({ ok: true, message: 'Configurações restauradas.' }) } }}>
            Restaurar padrões
          </button>
        }
      />
      <div className="stack !gap-4">
        <Section title="Draft" subtitle="Temporizador e regras do pop-up de escolha de campeões.">
          <ToggleField label="Temporizador ativo" hint="Mostra a contagem de segundos em cada jogada." checked={s.draft.timerEnabled} onChange={(v) => update('draft', { timerEnabled: v })} />
          <NumberField label="Tempo para banir" value={s.draft.banSeconds} min={5} max={300} step={5} unit="segundos" onChange={(v) => update('draft', { banSeconds: v })} />
          <NumberField label="Tempo para escolher" value={s.draft.pickSeconds} min={5} max={300} step={5} unit="segundos" onChange={(v) => update('draft', { pickSeconds: v })} />
          <ToggleField label="Jogar sozinho ao zerar" hint="Confirma a seleção atual ou escolhe automaticamente." checked={s.draft.autoOnTimeout} onChange={(v) => update('draft', { autoOnTimeout: v })} />
          <ToggleField label="Fearless nas séries" hint="Campeões usados em jogos anteriores ficam indisponíveis." checked={s.draft.fearless} onChange={(v) => update('draft', { fearless: v })} />
          <NumberField label="Ritmo do adversário" value={s.draft.aiDelayMs} min={100} max={5000} step={100} unit="ms por jogada" onChange={(v) => update('draft', { aiDelayMs: v })} />
        </Section>

        <Section title="Partida e minimapa" subtitle="Velocidade e suspense da narração sincronizada com o mapa.">
          <SelectField label="Velocidade inicial" value={s.replay.defaultSpeed} options={[[0.5, '0,5x (bem devagar)'], [1, '1x'], [2, '2x'], [4, '4x']] as const} onChange={(v) => update('replay', { defaultSpeed: v })} />
          <NumberField label="Tempo de deslocamento" hint="Suspense antes da luta." value={s.replay.travelMs} min={200} max={8000} step={100} unit="ms" onChange={(v) => update('replay', { travelMs: v })} />
          <NumberField label="Duração da luta" value={s.replay.clashMs} min={200} max={10000} step={100} unit="ms" onChange={(v) => update('replay', { clashMs: v })} />
          <ToggleField label="Mostrar minimapa" checked={s.replay.showMinimap} onChange={(v) => update('replay', { showMinimap: v })} />
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Imagem de fundo do minimapa</label>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className="grid h-40 w-40 place-items-center overflow-hidden border border-line bg-panel-2">
                {minimap ? <img src={minimap} alt="Prévia do minimapa" className="h-full w-full object-cover" /> : <span className="muted text-sm">Mapa desenhado (padrão)</span>}
              </div>
              <div className="stack">
                <button type="button" className="btn small" onClick={() => mapFile.current?.click()}>Enviar imagem do mapa</button>
                {minimap && <button type="button" className="btn small danger" onClick={() => setMinimap(null)}>Voltar ao padrão</button>}
                <small className="muted">Use a imagem do Summoner’s Rift com a base azul embaixo à esquerda e a vermelha em cima à direita.</small>
              </div>
            </div>
            <input ref={mapFile} type="file" accept="image/*" hidden onChange={onMap} />
          </div>
        </Section>

        <Section title="Simulação" subtitle="Equilíbrio das partidas (afeta resultados e duração).">
          <NumberField label="Torres para vencer" hint="Mais torres = partidas mais longas." value={s.sim.towersToWin} min={4} max={11} unit="torres" onChange={(v) => update('sim', { towersToWin: v })} />
          <NumberField label="Frequência de eventos" hint="Chance de algo acontecer a cada minuto." value={s.sim.eventChance} scale={100} min={40} max={100} step={5} unit="%" onChange={(v) => update('sim', { eventChance: v })} />
          <NumberField label="Peso do overall" hint="Maior = o melhor time vence mais; menor = mais zebras." value={s.sim.skill} min={0.02} max={0.3} step={0.01} onChange={(v) => update('sim', { skill: v })} />
          <NumberField label="Penalidade do pé de chumbo" value={s.sim.leadFootPenalty} min={0} max={30} unit="%" onChange={(v) => update('sim', { leadFootPenalty: v })} />
        </Section>

        <Section title="Campeonato e economia" subtitle="Formato aplicado na próxima temporada (ou novo jogo).">
          <ToggleField label="Turno e returno" hint="Todos jogam entre si duas vezes." checked={s.league.doubleRoundRobin} onChange={(v) => update('league', { doubleRoundRobin: v })} />
          <SelectField label="Semifinais" value={s.league.semiBestOf} options={BEST_OF} onChange={(v) => update('league', { semiBestOf: v })} />
          <SelectField label="Grande final" value={s.league.finalBestOf} options={BEST_OF} onChange={(v) => update('league', { finalBestOf: v })} />
          <SelectField label="Disputa do 3º lugar" value={s.league.thirdBestOf} options={BEST_OF} onChange={(v) => update('league', { thirdBestOf: v })} />
          <NumberField label="Orçamento ao criar time" value={s.league.startBudget} min={10000} max={1000000} step={10000} unit="R$" onChange={(v) => update('league', { startBudget: v })} />
          <NumberField label="Multiplicador de prêmios" value={s.league.prizeMultiplier} min={0.25} max={10} step={0.25} unit="×" onChange={(v) => update('league', { prizeMultiplier: v })} />
          <NumberField label="Multiplicador de salários" value={s.league.salaryMultiplier} min={0.25} max={5} step={0.25} unit="×" onChange={(v) => update('league', { salaryMultiplier: v })} />
        </Section>

        <section className="card">
          <h3>Acesso ao admin</h3>
          <div className="field" style={{ maxWidth: 320 }}>
            <label htmlFor="admin-pin">PIN (opcional)</label>
            <input id="admin-pin" type="password" inputMode="numeric" maxLength={12} value={s.admin.pin} placeholder="Deixe vazio para não pedir" onChange={(e) => update('admin', { pin: e.target.value })} />
            <small className="muted">Proteção local do navegador, não substitui segurança de servidor. Padrão: {DEFAULT_SETTINGS.admin.pin || 'sem PIN'}.</small>
          </div>
        </section>
      </div>
    </>
  )
}
