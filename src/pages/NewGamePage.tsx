import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HeroLogo } from '../components/Brand'
import { ADMIN_ENABLED } from '../lib/flags'
import { TeamCrest } from '../components/ui'
import { resolveSlots, teamOverall } from '../domain/ratings'
import { TEAM_SEEDS, createWorld } from '../domain/seed'
import { rosterOf } from '../domain/transfers'
import { useGameStore } from '../store/gameStore'

export default function NewGamePage() {
  const navigate = useNavigate()
  const game = useGameStore((s) => s.game)
  const newGame = useGameStore((s) => s.newGame)
  const chooseTeam = useGameStore((s) => s.chooseTeam)

  // Mundo de referência apenas para exibir overall/elenco antes de escolher.
  const preview = useMemo(() => game ?? createWorld(TEAM_SEEDS[0]!.id, 1), [game])
  const rows = useMemo(
    () =>
      TEAM_SEEDS.map((t) => {
        const team = preview.teams[t.id]!
        const roster = rosterOf(preview, t.id)
        return { seed: t, size: roster.length, overall: teamOverall(resolveSlots(team, roster)) }
      }).sort((a, b) => b.seed.reputation - a.seed.reputation),
    [preview],
  )

  const pick = (id: string): void => {
    if (game) chooseTeam(id)
    else newGame(id)
    navigate('/painel')
  }

  return (
    <div className="content">
      {ADMIN_ENABLED && (
        <div className="mb-4 flex justify-end">
          <Link className="btn small" to="/admin">⚙ Admin</Link>
        </div>
      )}
      <header className="mb-10 text-center">
        <div className="eyebrow mt-2">Campeonato CBLOW · Ferro e Bronze</div>
        <h1 className="sr-only">Tilt Manager</h1>
        <HeroLogo />
        <p className="muted mx-auto max-w-xl">
          {game?.fired
            ? 'A diretoria te demitiu. Escolha outro clube para recomeçar a carreira.'
            : 'Assuma a presidência de um dos 8 times, monte a escalação, contrate reforços e leve o clube ao título.'}
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(({ seed, size, overall }) => (
          <button key={seed.id} className="card team-card" onClick={() => pick(seed.id)} aria-label={`Assumir ${seed.name}`}>
            <div className="mb-4"><TeamCrest name={seed.name} size={64} /></div>
            <h2 className="!mb-1">{seed.name}</h2>
            <p className="muted !mb-3 text-sm">Pres.: {seed.presidents}</p>
            <div className="flex justify-between border-t border-line pt-3 text-sm">
              <span className="muted">Reputação <strong className="text-accent">{seed.reputation}</strong></span>
              <span className="muted">OVR <strong className="text-fg">{overall}</strong></span>
              <span className="muted">{size} jog.</span>
            </div>
          </button>
        ))}
      </div>
      <div className="card mt-4 flex flex-wrap items-center justify-between gap-4 !border-dashed">
        <div>
          <h2 className="!mb-1">Quer um clube só seu?</h2>
          <p className="muted !mb-0 text-sm">Defina nome, sigla, cor, presidentes e monte o elenco do zero com agentes livres ou jogadores criados por você.</p>
        </div>
        <Link className="btn primary" to="/criar-time">+ Criar meu time</Link>
      </div>
      <p className="muted mt-8 text-center text-sm">
        Times, presidentes e jogadores vêm do site cblow.xyz. Overall, idade e potencial são gerados pelo jogo.
      </p>
    </div>
  )
}
