import { Lock } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { Brand } from '../../components/Brand'
import { useGameStore } from '../../store/gameStore'
import { useSettingsStore } from '../../store/settingsStore'

const KEY = 'cblow-admin-ok'
const isUnlocked = (): boolean => {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Usa o layout do jogo quando há partida em andamento; senão, um cabeçalho simples (admin funciona sem jogo). */
export function AdminShell() {
  const game = useGameStore((s) => s.game)
  if (game && !game.fired) return <AppShell />
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-ink">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-3">
          <Link to="/novo" className="flex items-center !text-fg hover:!text-fg" aria-label="Tilt Manager — voltar">
            <Brand suffix="Admin" />
          </Link>
          <Link className="btn small" to="/novo">← Voltar ao jogo</Link>
        </div>
      </header>
      <main className="content"><Outlet /></main>
    </div>
  )
}

const TABS = [
  { to: '/admin', label: 'Configurações', end: true },
  { to: '/admin/jogadores', label: 'Jogadores', end: false },
  { to: '/admin/dados', label: 'Dados & backup', end: false },
]

/** Abas do admin + bloqueio opcional por PIN (proteção local, não é segurança real). */
export function AdminHub() {
  const pin = useSettingsStore((s) => s.settings.admin.pin)
  const [unlocked, setUnlocked] = useState(isUnlocked)
  const [attempt, setAttempt] = useState('')
  const [error, setError] = useState(false)

  const submit = (e: FormEvent): void => {
    e.preventDefault()
    if (attempt === pin) {
      try {
        sessionStorage.setItem(KEY, '1')
      } catch {
        /* sessionStorage indisponível: libera só nesta sessão da aba */
      }
      setUnlocked(true)
    } else setError(true)
  }

  if (pin && !unlocked) {
    return (
      <form className="card mx-auto max-w-sm text-center" onSubmit={submit}>
        <Lock className="mx-auto mb-3 text-accent" size={32} aria-hidden="true" />
        <h2>Área do administrador</h2>
        <label className="mt-3 text-left">
          PIN de acesso
          <input type="password" inputMode="numeric" autoFocus value={attempt} onChange={(e) => { setAttempt(e.target.value); setError(false) }} />
        </label>
        {error && <p className="bad mt-2 text-sm" role="alert">PIN incorreto.</p>}
        <button className="btn primary mt-4 w-full" type="submit">Entrar</button>
      </form>
    )
  }

  return (
    <>
      <div className="tabs" role="navigation" aria-label="Seções do admin">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `tab${isActive ? ' active-tab' : ''}`} style={({ isActive }) => (isActive ? { background: 'var(--gold)', color: '#1a120a' } : undefined)}>
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </>
  )
}
