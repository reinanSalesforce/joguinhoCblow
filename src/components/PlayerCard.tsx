import { Crosshair, HeartHandshake, Shield, Sparkles, Trees } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { memo } from 'react'
import { Link } from 'react-router-dom'
import type { Player, Role } from '../domain/types'
import { OvrBadge } from './ui'

const ROLE_ICON: Record<Role, LucideIcon> = {
  Top: Shield,
  Jungle: Trees,
  Mid: Sparkles,
  ADC: Crosshair,
  Suporte: HeartHandshake,
}

export function RoleIcon({ role, size = 16 }: { role: Role; size?: number }) {
  const Icon = ROLE_ICON[role]
  return <Icon size={size} aria-label={role} role="img" />
}

function initials(name: string): string {
  return name.replace(/\(.*\)/, '').trim().slice(0, 2).toUpperCase()
}

interface Props {
  player: Player
  teamName?: string
}

export const PlayerCard = memo(function PlayerCard({ player, teamName }: Props) {
  const out = player.outRounds > 0
  return (
    <Link to={`/elenco/${player.id}`} className={`pcard${out ? ' out' : ''}`} aria-label={`${player.name}, ${player.role}, overall ${player.ovr}`}>
      <div className="art">
        {player.photo ? <img src={player.photo} alt="" className="photo" loading="lazy" /> : <span>{initials(player.name)}</span>}
      </div>
      <span className="badge-role" title={player.role}><RoleIcon role={player.role} /></span>
      <span className="badge-ovr"><OvrBadge value={player.ovr} /></span>
      {out && <div className="flag">{player.outReason}</div>}
      {player.leadFoot && !out && <div className="flag lead">Pé de chumbo</div>}
      <div className="foot">
        <div className="name">{player.name}</div>
        <div className="sub">{teamName ?? 'Agente livre'}</div>
      </div>
    </Link>
  )
})
