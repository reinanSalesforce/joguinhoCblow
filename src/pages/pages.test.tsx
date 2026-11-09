import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useGameStore } from '../store/gameStore'
import DashboardPage from './DashboardPage'
import NewGamePage from './NewGamePage'

function renderFlow() {
  return render(
    <MemoryRouter initialEntries={['/novo']}>
      <Routes>
        <Route path="/novo" element={<NewGamePage />} />
        <Route path="/painel" element={<DashboardPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('fluxo inicial', () => {
  beforeEach(() => {
    localStorage.clear()
    useGameStore.setState({ game: null, lastMatchId: null })
  })

  it('lista os 8 times do CBLOW', () => {
    renderFlow()
    expect(screen.getAllByRole('button', { name: /^Assumir/ })).toHaveLength(8)
  })

  it('escolher um time abre o painel com a próxima partida', async () => {
    renderFlow()
    await userEvent.click(screen.getByRole('button', { name: 'Assumir SKTENIS' }))
    expect(await screen.findByText(/Próxima partida/)).toBeInTheDocument()
    expect(screen.getByText(/Rodada 1/)).toBeInTheDocument()
    expect(useGameStore.getState().game?.userTeamId).toBe('sktenis')
  })
})
