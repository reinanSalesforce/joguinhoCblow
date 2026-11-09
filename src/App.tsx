import { lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ADMIN_ENABLED } from './lib/flags'
import { AdminHub, AdminShell } from './pages/admin/AdminLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useGameStore } from './store/gameStore'

const NewGamePage = lazy(() => import('./pages/NewGamePage'))
const CreateTeamPage = lazy(() => import('./pages/CreateTeamPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SquadPage = lazy(() => import('./pages/SquadPage'))
const PlayerPage = lazy(() => import('./pages/PlayerPage'))
const LineupPage = lazy(() => import('./pages/LineupPage'))
const MatchPage = lazy(() => import('./pages/MatchPage'))
const MarketPage = lazy(() => import('./pages/MarketPage'))
const FinancePage = lazy(() => import('./pages/FinancePage'))
const StandingsPage = lazy(() => import('./pages/StandingsPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const PlayersPage = lazy(() => import('./pages/PlayersPage'))
const TeamsPage = lazy(() => import('./pages/TeamsPage'))
const TeamPage = lazy(() => import('./pages/TeamPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))
const DataPage = lazy(() => import('./pages/admin/DataPage'))

function Guarded() {
  const game = useGameStore((s) => s.game)
  if (!game || game.fired) return <Navigate to="/novo" replace />
  return <AppShell />
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/novo" element={<NewGamePage />} />
          <Route path="/criar-time" element={<CreateTeamPage />} />
          <Route element={<Guarded />}>
            <Route path="/painel" element={<DashboardPage />} />
            <Route path="/elenco" element={<SquadPage />} />
            <Route path="/elenco/:playerId" element={<PlayerPage />} />
            <Route path="/escalacao" element={<LineupPage />} />
            <Route path="/partida" element={<MatchPage />} />
            <Route path="/mercado" element={<MarketPage />} />
            <Route path="/financas" element={<FinancePage />} />
            <Route path="/tabela" element={<StandingsPage />} />
            <Route path="/partidas" element={<CalendarPage />} />
            <Route path="/calendario" element={<Navigate to="/partidas" replace />} />
            <Route path="/times" element={<TeamsPage />} />
            <Route path="/times/:teamId" element={<TeamPage />} />
            <Route path="/jogadores" element={<PlayersPage />} />
            <Route path="/estatisticas" element={<StatsPage />} />
            <Route path="/historico" element={<HistoryPage />} />
          </Route>
          {ADMIN_ENABLED && (
          <Route path="/admin" element={<AdminShell />}>
            <Route element={<AdminHub />}>
              <Route index element={<SettingsPage />} />
              <Route path="jogadores" element={<AdminPage />} />
              <Route path="dados" element={<DataPage />} />
            </Route>
          </Route>
          )}
          <Route path="*" element={<Navigate to="/painel" replace />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}
