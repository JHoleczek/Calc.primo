/**
 * Bryła (front + środek) – widok z góry w stylu ikon kart wymiarów:
 * szary front gięty, złoty korpus (plecy i boki). Bez bryły korpus jest tylko przerywanym konturem.
 */
export function BodyIcon({ on }: { on: boolean }) {
  // Front: pas między dwoma współśrodkowymi łukami (środek łuków nad korpusem).
  const front = `M0 60 A82.2 82.2 0 0 0 120 60 L108.4 60 A74.2 74.2 0 0 1 11.6 60 Z`
  const carcass = ['M0 0 H120 V8 H0 Z', 'M0 8 H8 V60 H0 Z', 'M112 8 H120 V60 H112 Z']
  return (
    <svg className="dim-icon body-icon" viewBox="-2 -2 124 92" width={136} height={101} aria-hidden="true" focusable="false">
      {carcass.map((d) => (
        <path key={d} d={d} className={on ? 'dim-icon__gold' : 'dim-icon__off'} />
      ))}
      <path d={front} className="dim-icon__base" />
    </svg>
  )
}
