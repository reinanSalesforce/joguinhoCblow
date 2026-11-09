import { Kpi, PageHeader } from '../components/ui'
import { money } from '../domain/transfers'
import { useMyTeam } from '../hooks/useGameData'

const PRIZES: [string, number][] = [['Campeão', 30000], ['Vice', 15000], ['3º lugar', 8000], ['4º lugar', 4000], ['Demais', 1000]]

export default function FinancePage() {
  const { team, roster } = useMyTeam()
  const payroll = roster.reduce((s, p) => s + p.salary, 0)
  const sponsor = team.reputation * 45
  const broadcast = 1200
  const winBonus = 900
  const net = sponsor + broadcast - payroll

  return (
    <>
      <PageHeader title="Finanças" subtitle="Receitas e despesas são aplicadas a cada rodada disputada." />
      <div className="grid cols-4" style={{ marginBottom: '1rem' }}>
        <div className="card"><Kpi label="Caixa atual" value={money(team.cash)} /></div>
        <div className="card"><Kpi label="Folha / rodada" value={money(payroll)} /></div>
        <div className="card"><Kpi label="Receita base / rodada" value={money(sponsor + broadcast)} hint="patrocínio + transmissão" /></div>
        <div className="card"><Kpi label="Saldo projetado" value={<span className={net >= 0 ? 'ok' : 'bad'}>{money(net)}</span>} hint={`+${money(winBonus)} por vitória`} /></div>
      </div>
      <div className="grid cols-2">
        <section className="card table-wrap">
          <h3>Folha salarial</h3>
          <table>
            <thead><tr><th>Jogador</th><th className="num">Salário/rodada</th><th>Contrato</th></tr></thead>
            <tbody>
              {[...roster].sort((a, b) => b.salary - a.salary).map((p) => (
                <tr key={p.id}><td>{p.name}</td><td className="num">{money(p.salary)}</td><td>até T{p.contractEnd}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card table-wrap">
          <h3>Premiação da temporada</h3>
          <table>
            <thead><tr><th>Colocação</th><th className="num">Prêmio</th></tr></thead>
            <tbody>{PRIZES.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{money(v)}</td></tr>)}</tbody>
          </table>
          <p className="muted" style={{ marginTop: '0.8rem' }}>
            Reputação do clube ({team.reputation}) define o patrocínio. Contratar e dispensar jogadores custa luvas e rescisão (2 salários).
          </p>
        </section>
      </div>
    </>
  )
}
