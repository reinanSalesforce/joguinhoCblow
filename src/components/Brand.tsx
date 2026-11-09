export const SITE_NAME = 'Tilt Manager'
export const LOGO_SRC = `${import.meta.env.BASE_URL}images/logo.jpg`

/** Emblema da logo (recorte quadrado central) + nome do site. */
export function Brand({ suffix }: { suffix?: string }) {
  return (
    <span className="flex items-center gap-2">
      <img
        src={LOGO_SRC}
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-sm border border-line-2 bg-ink object-cover object-center"
      />
      <span className="font-display text-xl font-bold uppercase leading-none tracking-widest">
        Tilt <span className="text-accent">Manager</span>
        {suffix && <small className="ml-2 text-xs font-medium tracking-[0.2em] text-mute">{suffix}</small>}
      </span>
    </span>
  )
}

/** Logo completa (usada na tela inicial). */
export function HeroLogo() {
  return (
    <img
      src={LOGO_SRC}
      alt={`${SITE_NAME} — Low Elo Specialist`}
      className="mx-auto w-full max-w-[560px] select-none"
      style={{ maskImage: 'radial-gradient(ellipse 70% 80% at 50% 50%, #000 55%, transparent 100%)' }}
    />
  )
}
