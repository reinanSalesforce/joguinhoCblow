import { Skull } from 'lucide-react'
import { memo, useState } from 'react'
import { BARON_PIT, DRAGON_PIT, towerPositions } from '../domain/mapGeometry'
import type { MapState } from '../domain/replayMap'
import type { Side } from '../domain/types'
import { useAssetStore } from '../store/assetStore'
import { ChampIcon } from './ChampIcon'

interface Props {
  map: MapState
  names: Record<string, string>
}

const SIDES: Side[] = ['home', 'away']
// Arquivos aceitos em public/images/ (o primeiro que existir é usado)
const STATIC_MAPS = ['minimap.png', 'minimap.jpg', 'minimap.webp'].map((n) => `${import.meta.env.BASE_URL}images/${n}`)

/** Minimapa estilo LoL: lanes, rio, selva, torres e os personagens do draft se movendo. */
export const Minimap = memo(function Minimap({ map, names }: Props) {
  const uploaded = useAssetStore((s) => s.minimap)
  const [fileIdx, setFileIdx] = useState(0)
  // Prioridade: imagem enviada no Admin > arquivo em public/images > mapa desenhado
  const image = uploaded ?? STATIC_MAPS[fileIdx] ?? null
  return (
    <div className="minimap" role="img" aria-label="Minimapa da partida">
      {image && <img src={image} alt="" className="minimap-img" draggable={false} onError={() => { if (!uploaded) setFileIdx((i) => i + 1) }} />}
      <svg viewBox="0 0 100 100" className="minimap-svg" aria-hidden="true">
        <defs>
          <radialGradient id="mm-ground" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#16241b" />
            <stop offset="100%" stopColor="#0b130e" />
          </radialGradient>
        </defs>
        {!image && <rect width="100" height="100" fill="url(#mm-ground)" />}
        {!image && (
          <>
        {/* selva */}
        <path d="M14 62 Q28 52 40 70 Q30 86 14 80 Z" fill="#12301f" opacity="0.7" />
        <path d="M86 38 Q72 48 60 30 Q70 14 86 20 Z" fill="#12301f" opacity="0.7" />
        <path d="M18 40 Q32 30 44 42 Q34 52 18 50 Z" fill="#102a1b" opacity="0.6" />
        <path d="M82 60 Q68 70 56 58 Q66 48 82 50 Z" fill="#102a1b" opacity="0.6" />
        {/* rio */}
        <path d="M6 14 L14 6 L94 86 L86 94 Z" fill="#14405f" opacity="0.85" />
        {/* lanes */}
        {['10,90 10,10 90,10', '10,90 90,90 90,10', '10,90 90,10'].map((pts) => (
          <g key={pts}>
            <polyline points={pts} fill="none" stroke="#3b3326" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={pts} fill="none" stroke="#6b5c43" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
          </g>
        ))}
        {/* bases */}
        <circle cx="9" cy="91" r="8" fill="#1d3c86" stroke="#4c8dff" strokeWidth="0.8" />
        <circle cx="91" cy="9" r="8" fill="#7d1f2b" stroke="#ff4b5c" strokeWidth="0.8" />
          </>
        )}
        {!image && (
          <>
        {/* objetivos */}
        <circle cx={DRAGON_PIT.x} cy={DRAGON_PIT.y} r="3.4" fill="#6b3f1b" stroke="#d79c6d" strokeWidth="0.5" />
        <text x={DRAGON_PIT.x} y={DRAGON_PIT.y + 1.4} textAnchor="middle" fontSize="4" fill="#f0c9a3">D</text>
        <circle cx={BARON_PIT.x} cy={BARON_PIT.y} r="3.4" fill="#4b2a6b" stroke="#b58cf0" strokeWidth="0.5" />
        <text x={BARON_PIT.x} y={BARON_PIT.y + 1.4} textAnchor="middle" fontSize="4" fill="#e2d0ff">B</text>
          </>
        )}
        {/* torres */}
        {SIDES.map((side) =>
          towerPositions(side).map((p, i) => {
            const down = map.towersDown[side].includes(i)
            return (
              <rect
                key={`${side}-${i}`}
                x={p.x - 1.5}
                y={p.y - 1.5}
                width="3"
                height="3"
                fill={down ? '#2a2a2a' : side === 'home' ? '#4c8dff' : '#ff4b5c'}
                opacity={down ? 0.35 : 0.95}
                stroke="#0008"
                strokeWidth="0.3"
              />
            )
          }),
        )}
      </svg>

      {map.tokens.map((t) => (
        <div
          key={t.playerId}
          className={`mm-token ${t.side}${t.active ? ' active' : ''}${t.skull ? ' skull' : ''}${t.respawning ? ' respawn' : ''}`}
          style={{ left: `${t.x}%`, top: `${t.y}%` }}
          title={`${names[t.playerId] ?? t.playerId} · ${t.role}`}
        >
          <ChampIcon champ={t.champ} size={40} className="mm-face" />
          {t.skull && <Skull className="mm-skull" size={18} aria-hidden="true" />}
        </div>
      ))}
    </div>
  )
})
