// Ikony kart wymiarów L, W, Z (z projektu: Likonty / Wikonty / Zikonty.svg), dopasowane do reszty kart:
// przezroczyste tło, front w szarości ikon z jasnym konturem, wymiar w złocie, opis czcionką strony.

const BASE = '#6a6a69'
const OUTLINE = '#838383'
const GOLD = '#ecd297'

/** Gruby pas frontu z cienkim konturem (dwa pociągnięcia tej samej ścieżki). */
function Front({ d }: { d: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={OUTLINE} strokeWidth={21.8} />
      <path d={d} fill="none" stroke={BASE} strokeWidth={20} />
    </>
  )
}

/** Linia wymiarowa z grotami i literą. */
function Dim({ x1, y1, x2, y2, label, lx, ly }: { x1: number; y1: number; x2: number; y2: number; label: string; lx: number; ly: number }) {
  const vertical = x1 === x2
  const a = 4.8
  const head = (x: number, y: number, dir: 1 | -1) =>
    vertical
      ? `M ${x - a} ${y + dir * a} L ${x} ${y} L ${x + a} ${y + dir * a}`
      : `M ${x + dir * a} ${y - a} L ${x} ${y} L ${x + dir * a} ${y + a}`
  return (
    <g stroke={GOLD} fill="none" strokeWidth={3}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <path d={head(x1, y1, 1)} />
      <path d={head(x2, y2, -1)} />
      <text x={lx} y={ly} fill={GOLD} stroke="none" fontSize={19} fontWeight={700} fontFamily="inherit">
        {label}
      </text>
    </g>
  )
}

const ext = (x1: number, y1: number, x2: number, y2: number) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth={1} />

function Svg({ viewBox, children }: { viewBox: string; children: React.ReactNode }) {
  const [, , w, h] = viewBox.split(' ').map(Number)
  const height = 90
  return (
    <svg className="dim-icon" viewBox={viewBox} width={(w / h) * height} height={height} aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

/** Przedłużany: łuk + prosty odcinek, wymiar L. Opcjonalnie pokazuje przedłużenie N1 przed łukiem. */
export function IconL({ n1 }: { n1?: 'on' | 'off' }) {
  const front = 'M58.84,207.83c0-24.75,20.06-44.81,44.81-44.81h133.74'
  if (n1) {
    // Przedłużenie N1: krótki odcinek przed łukiem (w dół) – złoty, gdy wpisany; przerywany kontur, gdy brak.
    return (
      <Svg viewBox="36 110 214 132">
        <Front d={front} />
        {n1 === 'on' ? (
          <path d="M58.84,207.83 V236" fill="none" stroke={GOLD} strokeWidth={20} />
        ) : (
          <rect x={48.84} y={207.83} width={20} height={28} fill="none" stroke={GOLD} strokeWidth={1.2} strokeDasharray="4 3" opacity={0.6} />
        )}
      </Svg>
    )
  }
  return (
    <Svg viewBox="36 88 214 132">
      {ext(48.06, 207.83, 48.06, 115.69)}
      {ext(237.4, 173.02, 237.4, 115.69)}
      <Dim x1={48.06} y1={115.69} x2={237.4} y2={115.69} label="L" lx={137} ly={107} />
      <Front d={front} />
    </Svg>
  )
}

/** Obustronny: dwa łuki, wymiar W. */
export function IconW() {
  return (
    <Svg viewBox="36 88 214 132">
      {ext(48.06, 207.83, 48.06, 115.69)}
      {ext(237.4, 207.83, 237.4, 115.69)}
      <Dim x1={48.06} y1={115.69} x2={237.4} y2={115.69} label="W" lx={132} ly={107} />
      <Front d="M58.84,207.83c0-24.75,20.06-44.81,44.81-44.81h78.82c24.75,0,44.81,20.06,44.81,44.81" />
    </Svg>
  )
}

/** Obustronny z przedłużeniem boków: wymiar Z. */
export function IconZ() {
  return (
    <Svg viewBox="34 96 214 132">
      {ext(235.23, 121.05, 45.9, 121.05)}
      {ext(235.23, 203.98, 45.9, 203.98)}
      <Dim x1={59.41} y1={201.15} x2={59.41} y2={121.05} label="Z" lx={40} ly={168} />
      <Front d="M85.3,203.98v-27.61c0-24.75,20.06-44.81,44.81-44.81h49.54c24.75,0,44.81,20.06,44.81,44.81v27.61" />
    </Svg>
  )
}
