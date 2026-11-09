import { useState } from 'react'
import { championIcon } from '../domain/champions'
import { findChampion } from '../domain/draft'

/** Retrato do campeão (Data Dragon). Se a imagem falhar, mostra as iniciais. */
export function ChampIcon({ champ, size = 40, className = '' }: { champ: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  const data = findChampion(champ)
  const name = data?.name ?? champ
  if (!data || failed) {
    return (
      <span className={`champ-fallback ${className}`} style={{ width: size, height: size }} aria-hidden="true">
        {name.slice(0, 2)}
      </span>
    )
  }
  return (
    <img
      className={className}
      src={championIcon(data.id)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}
