import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ENDINGS, FRONT_TYPES, MATERIALS } from '../config/catalog'
import type { Configuration } from '../lib/calculate'

interface Props {
  config: Configuration
}

type Point = [number, number]

const add = (a: Point, b: Point, k = 1): Point => [a[0] + b[0] * k, a[1] + b[1] * k]
const polar = (r: number, a: number): Point => [r * Math.cos(a), r * Math.sin(a)]
const fmt = (mm: number) => Math.round(mm).toLocaleString('pl-PL')

interface DimProps {
  p1: Point
  p2: Point
  /** Jednostkowy kierunek odsunięcia linii wymiarowej od mierzonych punktów. */
  dir: Point
  offset: number
  label: string
  /** Jednostki rysunku na 1 piksel ekranu – napisy i znaczniki mają stały rozmiar na ekranie. */
  px: number
}

/**
 * Wymiar w stylu rysunku technicznego: kropkowane linie pomocnicze od obiektu,
 * cienka linia wymiarowa z krótkimi znacznikami i opis nad linią.
 * Pionowe opisy czytane od dołu do góry.
 */
function Dimension({ p1, p2, dir, offset, label, px }: DimProps) {
  const q1 = add(p1, dir, offset)
  const q2 = add(p2, dir, offset)
  const gap = px * 3
  const over = px * 6
  const along: Point = [q2[0] - q1[0], q2[1] - q1[1]]
  const len = Math.hypot(along[0], along[1]) || 1
  const u: Point = [along[0] / len, along[1] / len]
  const tick: Point = [dir[0] * px * 4, dir[1] * px * 4]
  let angle = (Math.atan2(along[1], along[0]) * 180) / Math.PI
  if (angle >= 90) angle -= 180
  if (angle < -90) angle += 180
  const mid = add([(q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2], dir, px * 9)
  // Linia wymiarowa wystaje odrobinę poza linie pomocnicze, jak na rysunku referencyjnym.
  const e1 = add(q1, u, -px * 4)
  const e2 = add(q2, u, px * 4)

  return (
    <g className="plan__dim">
      <line className="plan__ext" x1={p1[0] + dir[0] * gap} y1={p1[1] + dir[1] * gap} x2={q1[0] + dir[0] * over} y2={q1[1] + dir[1] * over} />
      <line className="plan__ext" x1={p2[0] + dir[0] * gap} y1={p2[1] + dir[1] * gap} x2={q2[0] + dir[0] * over} y2={q2[1] + dir[1] * over} />
      <line x1={e1[0]} y1={e1[1]} x2={e2[0]} y2={e2[1]} />
      {[q1, q2].map((q, i) => (
        <line key={i} x1={q[0] - tick[0]} y1={q[1] - tick[1]} x2={q[0] + tick[0]} y2={q[1] + tick[1]} />
      ))}
      <text x={mid[0]} y={mid[1]} transform={`rotate(${angle} ${mid[0]} ${mid[1]})`} fontSize={px * 11}>
        {label}
      </text>
    </g>
  )
}

/**
 * Rzut z góry w skali, w stylu rysunku technicznego (jasne linie na ciemnym tle):
 * front wychodzi z lewej (poziomo) i skręca łukiem w dół. Środek łuku leży w (0, 0).
 */
export function PlanView({ config }: Props) {
  const hatchId = `hatch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
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

  // Rozmiar SVG na ekranie → ile jednostek rysunku przypada na piksel (viewBox „meet”).
  const svgRef = useRef<SVGSVGElement>(null)
  const [screen, setScreen] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setScreen({ w: width, h: height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const px = screen ? Math.max(vW / screen.w, vH / screen.h) : unit / 4
  const dims: ReactNode[] = []
  if (extS > 0) {
    dims.push(<Dimension key="extS" p1={outer.s0} p2={outer.s} dir={nS} offset={off} label={`${fmt(extS)}`} px={px} />)
  }
  if (extE > 0) {
    dims.push(<Dimension key="extE" p1={outer.e} p2={outer.e1} dir={nE} offset={off} label={`${fmt(extE)}`} px={px} />)
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
      px={px}
    />,
    <Dimension
      key="h"
      p1={[box.maxX, box.minY]}
      p2={[box.maxX, box.maxY]}
      dir={[1, 0]}
      offset={extE > 0 && Math.abs(nE[0]) > 0.7 ? off * 2.2 : off}
      label={`${fmt(boxH)}`}
      px={px}
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
      px={px}
    />,
  )

  // Promień rysujemy poza osią symetrii, żeby nie nachodził na opis kąta.
  const aR = aS + theta * 0.62
  // Linia R od środka do lica zewnętrznego, zakończona grotem.
  const rDir = polar(1, aR)
  const rEnd = polar(Ro, aR)
  const arrowLen = px * 11
  const arrowBase = add(rEnd, rDir, -arrowLen)
  const perp: Point = [-rDir[1], rDir[0]]
  const arrow = [rEnd, add(arrowBase, perp, px * 3.5), add(arrowBase, perp, -px * 3.5)]
  const rLabel = add(polar(Ro * 0.5, aR), perp, -px * 9)
  const rAngle = (() => {
    let a = (aR * 180) / Math.PI
    if (a >= 90) a -= 180
    if (a < -90) a += 180
    return a
  })()
  const angR = Math.min(R * 0.3, unit * 10)
  const angS = polar(angR, aS)
  const angE = polar(angR, aE)
  const angLabel = polar(angR + px * 16, aMid)
  // Osie symetrii łuku (linia kreska-kropka), sięgające trochę poza obrys.
  const axisX = [Math.min(box.minX, 0) - unit * 4, Math.max(box.maxX, 0) + unit * 4]
  const axisY = [Math.min(box.minY, 0) - unit * 4, Math.max(box.maxY, 0) + unit * 4]

  return (
    <svg
      ref={svgRef}
      className="viz__svg plan"
      viewBox={`${vMinX} ${vMinY} ${vW} ${vH}`}
      role="img"
      aria-label={`Rzut z góry: ${frontType.name}, R ${Ro} mm, grubość ${g} mm, zakończenie ${ending.name}, gabaryt ${fmt(boxW)} × ${fmt(boxH)} mm`}
    >
      <defs>
        {/* Kreskowanie przekroju (jak przekrój gałki na rysunku referencyjnym). */}
        <pattern id={hatchId} width={px * 6} height={px * 6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={px * 6} className="plan__hatch" strokeWidth={px} />
        </pattern>
      </defs>

      {/* Osie */}
      <path className="plan__axis" d={`M ${axisX[0]} 0 H ${axisX[1]} M 0 ${axisY[0]} V ${axisY[1]}`} />

      {/* Kąt i promień */}
      <path className="plan__thin" d={`M ${angS[0]} ${angS[1]} A ${angR} ${angR} 0 ${large} 1 ${angE[0]} ${angE[1]}`} />
      <text className="plan__text" x={angLabel[0]} y={angLabel[1]} fontSize={px * 11}>
        {frontType.angleDeg}°
      </text>
      <line className="plan__thin" x1={0} y1={0} x2={arrowBase[0]} y2={arrowBase[1]} />
      <polygon className="plan__arrow" points={arrow.map((p) => p.join(',')).join(' ')} />
      <text
        className="plan__text"
        x={rLabel[0]}
        y={rLabel[1]}
        transform={`rotate(${rAngle} ${rLabel[0]} ${rLabel[1]})`}
        fontSize={px * 11}
      >
        R{Ro}
      </text>

      {/* Front: przekrój z kreskowaniem, obrys, lico pogrubione */}
      <path d={outline} className="plan__section" fill={`url(#${hatchId})`} />
      {[
        [outer.s, inner.s],
        [outer.e, inner.e],
      ]
        .filter((_, i) => (i === 0 ? extS > 0 : extE > 0))
        .map(([a, b], i) => (
          <line key={i} className="plan__seam" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
        ))}
      <path d={face} className="plan__face" />

      {dims}

      <text className="plan__caption" x={vMinX + px * 10} y={vMinY + vH - px * 10} fontSize={px * 10}>
        mm
      </text>
    </svg>
  )
}
