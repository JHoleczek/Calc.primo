import type { ReactNode } from 'react'
import { ENDINGS, FRONT_TYPES, MATERIALS } from '../config/catalog'
import type { Configuration } from '../lib/calculate'

interface Props {
  config: Configuration
}

type Point = [number, number]

const add = (a: Point, b: Point, k = 1): Point => [a[0] + b[0] * k, a[1] + b[1] * k]
const polar = (r: number, a: number): Point => [r * Math.cos(a), r * Math.sin(a)]
const fmt = (mm: number) => Math.round(mm).toLocaleString('pl-PL')

/** Najmniejszy „ładny” skok kratki, przy którym na rysunek przypada ≤ 24 linii. */
function gridStep(extent: number) {
  for (const step of [10, 20, 25, 50, 100, 200, 250, 500]) {
    if (extent / step <= 24) return step
  }
  return 1000
}

interface DimProps {
  p1: Point
  p2: Point
  /** Jednostkowy kierunek odsunięcia linii wymiarowej od mierzonych punktów. */
  dir: Point
  offset: number
  label: string
  unit: number
}

/** Wymiar w stylu rysunku technicznego: linie pomocnicze, linia wymiarowa ze znacznikami, opis. */
function Dimension({ p1, p2, dir, offset, label, unit }: DimProps) {
  const q1 = add(p1, dir, offset)
  const q2 = add(p2, dir, offset)
  const gap = unit * 0.8
  const over = unit * 1.2
  const along: Point = [q2[0] - q1[0], q2[1] - q1[1]]
  const len = Math.hypot(along[0], along[1]) || 1
  const u: Point = [along[0] / len, along[1] / len]
  // Ukośne znaczniki (45°) na końcach linii wymiarowej.
  const tick: Point = [(u[0] + dir[0]) * unit * 0.9, (u[1] + dir[1]) * unit * 0.9]
  let angle = (Math.atan2(along[1], along[0]) * 180) / Math.PI
  if (angle > 90) angle -= 180
  if (angle <= -90) angle += 180
  const mid = add([(q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2], dir, unit * 2)

  return (
    <g className="plan__dim">
      <line x1={p1[0] + dir[0] * gap} y1={p1[1] + dir[1] * gap} x2={q1[0] + dir[0] * over} y2={q1[1] + dir[1] * over} />
      <line x1={p2[0] + dir[0] * gap} y1={p2[1] + dir[1] * gap} x2={q2[0] + dir[0] * over} y2={q2[1] + dir[1] * over} />
      <line x1={q1[0]} y1={q1[1]} x2={q2[0]} y2={q2[1]} />
      {[q1, q2].map((q, i) => (
        <line key={i} className="plan__tick" x1={q[0] - tick[0]} y1={q[1] - tick[1]} x2={q[0] + tick[0]} y2={q[1] + tick[1]} />
      ))}
      <text x={mid[0]} y={mid[1]} transform={`rotate(${angle} ${mid[0]} ${mid[1]})`} fontSize={unit * 3}>
        {label}
      </text>
    </g>
  )
}

/**
 * Rzut z góry w skali: front wychodzi z lewej (poziomo) i skręca łukiem w dół.
 * Środek łuku leży w (0, 0); kratka jest wyrównana do środka łuku.
 */
export function PlanView({ config }: Props) {
  const frontType = FRONT_TYPES.find((t) => t.id === config.frontTypeId) ?? FRONT_TYPES[0]
  const ending = ENDINGS.find((e) => e.id === config.endingId) ?? ENDINGS[0]
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]

  const g = material.thicknessMm
  // R z konfiguracji to promień lica zewnętrznego; powierzchnia wewnętrzna ma R − g.
  const Ro = config.radiusMm
  const R = Ro - g
  const convex = frontType.direction === 'convex'
  const theta = (frontType.angleDeg * Math.PI) / 180
  // Kąty w układzie SVG (oś Y w dół): start u góry, łuk zgodnie z ruchem wskazówek zegara.
  const aS = -Math.PI / 2
  const aE = aS + theta
  const aMid = aS + theta / 2

  const ext = Number.isFinite(config.extensionMm) ? Math.max(0, config.extensionMm) : 0
  const extS = ending.extensions >= 1 ? ext : 0
  const extE = ending.extensions === 2 ? ext : 0
  const dirS: Point = [Math.sin(aS), -Math.cos(aS)] // od początku łuku w lewo
  const dirE: Point = [-Math.sin(aE), Math.cos(aE)] // od końca łuku dalej po stycznej
  const nS = polar(1, aS)
  const nE = polar(1, aE)

  const large = theta > Math.PI ? 1 : 0
  const curve = (r: number) => {
    const s = polar(r, aS)
    const e = polar(r, aE)
    return { s, e, s0: add(s, dirS, extS), e1: add(e, dirE, extE) }
  }
  const outer = curve(Ro)
  const inner = curve(R)
  const pathOf = (c: ReturnType<typeof curve>, r: number) =>
    `M ${c.s0[0]} ${c.s0[1]} L ${c.s[0]} ${c.s[1]} A ${r} ${r} 0 ${large} 1 ${c.e[0]} ${c.e[1]} L ${c.e1[0]} ${c.e1[1]}`
  const outline =
    `${pathOf(outer, Ro)} L ${inner.e1[0]} ${inner.e1[1]} L ${inner.e[0]} ${inner.e[1]} ` +
    `A ${R} ${R} 0 ${large} 0 ${inner.s[0]} ${inner.s[1]} L ${inner.s0[0]} ${inner.s0[1]} Z`
  const face = convex ? pathOf(outer, Ro) : pathOf(inner, R)

  // Gabaryt obrysu frontu.
  const pts: Point[] = [outer.s0, outer.e1, inner.s0, inner.e1]
  for (let i = 0; i <= 36; i++) {
    const a = aS + (theta * i) / 36
    pts.push(polar(Ro, a), polar(R, a))
  }
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const box = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  const boxW = box.maxX - box.minX
  const boxH = box.maxY - box.minY

  const extent = Math.max(boxW, boxH, Ro)
  const unit = extent / 100
  const off = unit * 7

  // Widok: gabaryt + środek łuku + miejsce na dwa rzędy wymiarów z każdej strony.
  const pad = off * 3.2
  const vMinX = Math.min(box.minX, 0) - pad
  const vMinY = Math.min(box.minY, 0) - pad
  const vW = Math.max(box.maxX, 0) - Math.min(box.minX, 0) + pad * 2
  const vH = Math.max(box.maxY, 0) - Math.min(box.minY, 0) + pad * 2
  const step = gridStep(Math.max(vW, vH))
  // Linie kratki wyrównane do środka łuku; co piąta linia pogrubiona.
  const gridPath = (major: boolean) => {
    const d: string[] = []
    const lines = (from: number, to: number, draw: (v: number) => string) => {
      for (let k = Math.ceil(from / step); k * step <= to; k++) {
        if ((k % 5 === 0) === major) d.push(draw(k * step))
      }
    }
    lines(vMinX, vMinX + vW, (x) => `M ${x} ${vMinY} V ${vMinY + vH}`)
    lines(vMinY, vMinY + vH, (y) => `M ${vMinX} ${y} H ${vMinX + vW}`)
    return d.join(' ')
  }

  const dims: ReactNode[] = []
  if (extS > 0) {
    dims.push(<Dimension key="extS" p1={outer.s0} p2={outer.s} dir={nS} offset={off} label={`${fmt(extS)}`} unit={unit} />)
  }
  if (extE > 0) {
    dims.push(<Dimension key="extE" p1={outer.e} p2={outer.e1} dir={nE} offset={off} label={`${fmt(extE)}`} unit={unit} />)
  }
  // Gabaryt: szerokość nad rysunkiem, głębokość po prawej.
  dims.push(
    <Dimension
      key="w"
      p1={[box.minX, box.minY]}
      p2={[box.maxX, box.minY]}
      dir={[0, -1]}
      offset={extS > 0 ? off * 2.2 : off}
      label={`${fmt(boxW)}`}
      unit={unit}
    />,
    <Dimension
      key="h"
      p1={[box.maxX, box.minY]}
      p2={[box.maxX, box.maxY]}
      dir={[1, 0]}
      offset={extE > 0 && Math.abs(nE[0]) > 0.7 ? off * 2.2 : off}
      label={`${fmt(boxH)}`}
      unit={unit}
    />,
  )
  // Grubość na początku frontu.
  dims.push(
    <Dimension
      key="g"
      p1={inner.s0}
      p2={outer.s0}
      dir={dirS}
      offset={off * 0.9}
      label={`${g}`}
      unit={unit}
    />,
  )

  // Promień rysujemy poza osią symetrii, żeby nie nachodził na opis kąta.
  const aR = aS + theta * 0.62
  const rEnd = polar(Ro, aR)
  const rLabel = add(polar(Ro * 0.55, aR), polar(1, aR - Math.PI / 2), unit * 3)
  const angR = Math.min(R * 0.3, unit * 10)
  const angS = polar(angR, aS)
  const angE = polar(angR, aE)
  const angLabel = polar(angR + unit * 4, aMid)
  const faceLabel = polar(convex ? Ro + unit * 4 : R - unit * 4, aS + theta * 0.3)

  return (
    <svg
      className="viz__svg plan"
      viewBox={`${vMinX} ${vMinY} ${vW} ${vH}`}
      role="img"
      aria-label={`Rzut z góry: ${frontType.name}, R ${Ro} mm, grubość ${g} mm, zakończenie ${ending.name}, gabaryt ${fmt(boxW)} × ${fmt(boxH)} mm`}
    >
      <path d={gridPath(false)} className="plan__grid" strokeWidth={unit * 0.12} />
      <path d={gridPath(true)} className="plan__grid plan__grid--major" strokeWidth={unit * 0.22} />

      {/* Promień i kąt */}
      <line className="plan__radius" x1={0} y1={0} x2={rEnd[0]} y2={rEnd[1]} strokeWidth={unit * 0.3} strokeDasharray={`${unit * 1.5} ${unit}`} />
      <path
        className="plan__radius"
        d={`M ${angS[0]} ${angS[1]} A ${angR} ${angR} 0 ${large} 1 ${angE[0]} ${angE[1]}`}
        strokeWidth={unit * 0.3}
        fill="none"
      />
      <text className="plan__label" x={angLabel[0]} y={angLabel[1]} fontSize={unit * 3}>
        {frontType.angleDeg}°
      </text>
      <path className="plan__center" d={`M ${-unit * 1.5} 0 H ${unit * 1.5} M 0 ${-unit * 1.5} V ${unit * 1.5}`} strokeWidth={unit * 0.3} />
      <text className="plan__label" x={rLabel[0]} y={rLabel[1]} fontSize={unit * 3.2}>
        R {Ro}
      </text>

      {/* Front */}
      <path d={outline} className="plan__band" strokeWidth={unit * 0.25} />
      {[
        [outer.s, inner.s],
        [outer.e, inner.e],
      ]
        .filter((_, i) => (i === 0 ? extS > 0 : extE > 0))
        .map(([a, b], i) => (
          <line key={i} className="plan__seam" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} strokeWidth={unit * 0.2} />
        ))}
      <path d={face} className="plan__face" strokeWidth={unit * 0.7} />
      <text className="plan__face-label" x={faceLabel[0]} y={faceLabel[1]} fontSize={unit * 2.8}>
        lico
      </text>

      <g strokeWidth={unit * 0.25}>{dims}</g>

      <text className="plan__caption" x={vMinX + unit * 2} y={vMinY + vH - unit * 2} fontSize={unit * 2.6}>
        wymiary w mm · kratka {step} mm
      </text>
    </svg>
  )
}
