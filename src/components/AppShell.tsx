import { Settings } from 'lucide-react'
import { Suspense } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMyTeam, useSeasonInfo } from '../hooks/useGameData'
import { useGameStore } from '../store/gameStore'
import { money } from '../domain/transfers'
import { ADMIN_ENABLED } from '../lib/flags'
import { Brand } from './Brand'
import { ErrorBoundary } from './ErrorBoundary'
import { DraftModal } from './DraftModal'
import { Toaster } from './Toaster'
import { usePlayAction } from '../hooks/usePlayAction'
import { TeamCrest } from './ui'

const NAV = [
  { to: '/painel', label: 'Início' },
  { to: '/elenco', label: 'Meu time' },
  { to: '/escalacao', label: 'Escalação' },
  { to: '/mercado', label: 'Mercado' },
  { to: '/times', label: 'Times' },
  { to: '/jogadores', label: 'Jogadores' },
  { to: '/partidas', label: 'Partidas' },
  { to: '/tabela', label: 'Tabela' },
  { to: '/estatisticas', label: 'Estatísticas' },
  { to: '/financas', label: 'Finanças' },
  { to: '/historico', label: 'Histórico' },
]

export function AppShell() {
  const navigate = useNavigate()
  const { game, team } = useMyTeam()
  const { day, phase } = useSeasonInfo()
  const handlePlay = usePlayAction()
  const reset = useGameStore((s) => s.reset)

  const nextMatch = day === null ? undefined : game.matches.find((m) => m.day === day && (m.homeId === team.id || m.awayId === team.id))

  const handleReset = (): void => {
    if (window.confirm('Apagar o save atual e começar um novo jogo?')) {
      reset()
      navigate('/novo')
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center gap-5 px-4">
          <NavLink to="/painel" className="flex shrink-0 items-center py-2 !text-fg hover:!text-fg" aria-label="Tilt Manager — início">
            <Brand />
          </NavLink>
          <nav aria-label="Navegação principal" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap border-b-2 px-3 py-[1.05rem] font-display text-[0.8rem] font-semibold uppercase tracking-[0.12em] transition-colors ${
                    isActive ? 'border-accent !text-white' : 'border-transparent !text-mute hover:!text-fg'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          {ADMIN_ENABLED && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 border px-3 py-1.5 font-display text-[0.75rem] font-semibold uppercase tracking-[0.12em] transition-colors ${
                isActive ? 'border-accent bg-accent !text-ink' : 'border-line-2 !text-fg hover:border-accent hover:!text-accent'
              }`
            }
          >
            <Settings size={15} aria-hidden="true" /> Admin
          </NavLink>
          )}
        </div>
        <div className="border-t border-line bg-ink-2">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
            <div className="flex items-center gap-2">
              <TeamCrest name={team.name} size={28} color={team.color} tag={team.tag} />
              <span className="font-display text-sm font-bold uppercase tracking-wider">{team.name}</span>
            </div>
            <Stat label="Temporada" value={String(game.season)} />
            <Stat label="Caixa" value={money(team.cash)} />
            <Stat label="Diretoria" value={`${Math.round(game.confidence)}%`} warn={game.confidence < 30} />
            <div className="ml-auto flex items-center gap-2">
              <button className="btn small danger" onClick={handleReset}>Novo jogo</button>
              {phase === 'finished' ? (
                <button className="btn small primary" onClick={() => navigate('/painel')}>Temporada encerrada</button>
              ) : (
                <button className="btn small primary" onClick={handlePlay}>
                  {nextMatch ? `Jogar ${nextMatch.stage}` : 'Simular dia'} ▶
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="content">
        <ErrorBoundary>
          <Suspense fallback={<div className="empty">Carregando…</div>}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="border-t border-line py-6 text-center text-xs text-mute">
        Tilt Manager · jogo de gerenciamento fã-feito do campeonato CBLOW. Overall dos jogadores é estimado — o site oficial não publica elo.
      </footer>
      <DraftModal />
      <Toaster />
    </div>
  )
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-display text-[0.65rem] uppercase tracking-[0.16em] text-mute">{label}</span>
      <strong className={`font-display text-sm ${warn ? 'text-bad' : 'text-fg'}`}>{value}</strong>
    </div>
  )
}
