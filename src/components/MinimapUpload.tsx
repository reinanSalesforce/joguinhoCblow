import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import { resizeImage } from '../lib/image'
import { useAssetStore } from '../store/assetStore'
import { useToastStore } from '../store/toastStore'

/** Botão para trocar a imagem de fundo do minimapa sem sair da partida. */
export function MinimapUpload() {
  const minimap = useAssetStore((s) => s.minimap)
  const setMinimap = useAssetStore((s) => s.setMinimap)
  const show = useToastStore((s) => s.show)
  const input = useRef<HTMLInputElement>(null)

  const onFile = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setMinimap(await resizeImage(file, 900, 900, 0.5))
      show({ ok: true, message: 'Imagem do minimapa atualizada.' })
    } catch (err) {
      show({ ok: false, message: err instanceof Error ? err.message : 'Falha ao carregar a imagem.' })
    }
  }

  return (
    <div className="row" style={{ justifyContent: 'center', marginTop: '0.6rem' }}>
      <button type="button" className="btn small" onClick={() => input.current?.click()}>
        {minimap ? 'Trocar imagem do mapa' : 'Usar minha imagem do mapa'}
      </button>
      {minimap && <button type="button" className="btn small danger" onClick={() => setMinimap(null)}>Voltar ao padrão</button>}
      <input ref={input} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  )
}
