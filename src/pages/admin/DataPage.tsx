import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { PageHeader } from '../../components/ui'
import type { GameData } from '../../domain/types'
import { useAdminStore } from '../../store/adminStore'
import { useGameStore } from '../../store/gameStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useToastStore } from '../../store/toastStore'

const KEYS = [
  ['cblow-manager-save', 'Save do jogo'],
  ['cblow-admin-db', 'Banco de jogadores (admin)'],
  ['cblow-settings', 'Configurações'],
] as const

function sizeOf(key: string): number {
  try {
    return (localStorage.getItem(key)?.length ?? 0) * 2
  } catch {
    return 0
  }
}
const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`

function download(name: string, data: unknown): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export default function DataPage() {
  const show = useToastStore((s) => s.show)
  const game = useGameStore((s) => s.game)
  const resetGame = useGameStore((s) => s.reset)
  const resetDb = useAdminStore((s) => s.reset)
  const resetSettings = useSettingsStore((s) => s.reset)
  const settings = useSettingsStore((s) => s.settings)
  const importRef = useRef<HTMLInputElement>(null)
  const [tick, setTick] = useState(0) // força recálculo dos tamanhos após ações

  const importSave = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as { game?: GameData } | GameData
      const g = ('game' in data && data.game ? data.game : data) as GameData
      if (!g || typeof g !== 'object' || !g.teams || !g.players || !Array.isArray(g.matches)) throw new Error('Arquivo de save inválido.')
      if (!window.confirm('Substituir o save atual pelo arquivo importado?')) return
      useGameStore.setState({ game: g, lastMatchId: null })
      show({ ok: true, message: 'Save importado.' })
      setTick((t) => t + 1)
    } catch (err) {
      show({ ok: false, message: err instanceof Error ? err.message : 'Não foi possível importar.' })
    }
  }

  const factoryReset = (): void => {
    if (!window.confirm('Apagar TUDO (save, banco de jogadores e configurações)? Não dá para desfazer.')) return
    resetGame()
    resetDb()
    resetSettings()
    setTick((t) => t + 1)
    show({ ok: true, message: 'Dados apagados.' })
  }

  return (
    <>
      <PageHeader title="Dados & backup" subtitle="Tudo fica salvo neste navegador (localStorage). Faça backup antes de limpar os dados do navegador." />
      <div className="grid cols-2" data-tick={tick}>
        <section className="card">
          <h3>Armazenamento</h3>
          <table>
            <tbody>
              {KEYS.map(([key, label]) => (
                <tr key={key}><td>{label}</td><td className="num mono">{kb(sizeOf(key))}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h3>Save do jogo</h3>
          <div className="row">
            <button className="btn" disabled={!game} onClick={() => download('cblow-save.json', { game })}>Exportar save</button>
            <button className="btn" onClick={() => importRef.current?.click()}>Importar save</button>
            <input ref={importRef} type="file" accept="application/json" hidden onChange={importSave} />
            <button className="btn danger" disabled={!game} onClick={() => { if (window.confirm('Apagar o save atual?')) { resetGame(); setTick((t) => t + 1); show({ ok: true, message: 'Save apagado.' }) } }}>Apagar save</button>
          </div>
        </section>

        <section className="card">
          <h3>Configurações</h3>
          <div className="row">
            <button className="btn" onClick={() => download('cblow-configuracoes.json', settings)}>Exportar configurações</button>
            <button className="btn danger" onClick={() => { resetSettings(); setTick((t) => t + 1); show({ ok: true, message: 'Configurações restauradas.' }) }}>Restaurar padrões</button>
          </div>
        </section>

        <section className="card">
          <h3>Banco de jogadores</h3>
          <div className="row">
            <button className="btn danger" onClick={() => { if (window.confirm('Restaurar o banco padrão do cblow.xyz (perde edições e fotos)?')) { resetDb(); setTick((t) => t + 1); show({ ok: true, message: 'Banco restaurado.' }) } }}>Restaurar banco padrão</button>
          </div>
        </section>

        <section className="card" style={{ gridColumn: '1 / -1', borderColor: '#4a2227' }}>
          <h3 style={{ color: 'var(--bad)' }}>Zona de perigo</h3>
          <button className="btn danger" onClick={factoryReset}>Apagar todos os dados</button>
        </section>
      </div>
    </>
  )
}
