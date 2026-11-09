import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  onReset?: () => void
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Erro de renderização:', error, info.componentStack)
  }

  private reset = (): void => {
    this.props.onReset?.()
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className="card" role="alert" style={{ margin: '2rem auto', maxWidth: 560 }}>
        <h2>Algo deu errado</h2>
        <p className="muted">{this.state.error.message}</p>
        <div className="row">
          <button className="btn primary" onClick={this.reset}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }
}
