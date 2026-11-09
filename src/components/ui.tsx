import type { ReactNode } from 'react'
import type { Role } from '../domain/types'

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`role role-${role}`}>{role}</span>
}

export function OvrBadge({ value }: { value: number }) {
  const tier = value >= 65 ? 'hi' : value >= 52 ? 'mid' : 'lo'
  return (
    <span className={`ovr ${tier}`} title={`Overall ${Math.round(value)}`}>
      {Math.round(value)}
    </span>
  )
}

export function Meter({ value, label, bad = false }: { value: number; label: string; bad?: boolean }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      className={`meter${bad ? ' bad' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="row">{actions}</div> : null}
    </header>
  )
}

export function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="kpi">
      <small>{label}</small>
      <span className="stat-big mono">{value}</span>
      {hint ? <span className="muted text-sm">{hint}</span> : null}
    </div>
  )
}

export function TeamCrest({ name, size = 46, color, tag }: { name: string; size?: number; color?: string | undefined; tag?: string | undefined }) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
  const initials = tag ?? name
    .split(' ')
    .filter((w) => w.length > 1)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
  return (
    <span
      className="team-crest"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: color
          ? `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #000))`
          : `linear-gradient(135deg, hsl(${h} 55% 68%), hsl(${(h + 40) % 360} 45% 45%))`,
      }}
    >
      {initials}
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function Tabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="tabs" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button key={id} type="button" className="tab" aria-pressed={value === id} onClick={() => onChange(id)}>
          {text}
        </button>
      ))}
    </div>
  )
}
