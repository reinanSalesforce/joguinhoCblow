import { useEffect } from 'react'
import { useToastStore } from '../store/toastStore'

export function Toaster() {
  const message = useToastStore((s) => s.message)
  const error = useToastStore((s) => s.error)
  const seq = useToastStore((s) => s.seq)
  const clear = useToastStore((s) => s.clear)

  useEffect(() => {
    if (!message) return
    const id = window.setTimeout(clear, 3800)
    return () => window.clearTimeout(id)
  }, [message, seq, clear])

  if (!message) return null
  return (
    <div className={`toast${error ? ' err' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  )
}
