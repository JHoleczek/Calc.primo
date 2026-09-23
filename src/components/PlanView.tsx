import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { FRONT_TYPES, THICKNESS_MM } from '../config/catalog'
import type { Configuration } from '../lib/calculate'
import { frontPath, outerNormal, samplePath, walkPath } from '../lib/frontPath'

interface Props {
  config: Configuration
}

type Point = [number, number]

const add = (a: Point, b: Point, k = 1): Point => [a[0] + b[0] * k, a[1] + b[1] * k]
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
 * Rzut z góry w skali, w stylu rysunku technicznego (jasne linie na czarnym tle).
 * Kształt pochodzi z frontPath (ten sam opis co obliczenia i model 3D).
 */
export function PlanView({ config }: Props) {
  const hatchId = `hatch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
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

  const frontType = FRONT_TYPES.find((t) => t.id === config.typeId) ?? FRONT_TYPES[0]
  const path = frontPath(config)

  const g = THICKNESS_MM
  const samples = samplePath(path, 4, 1.5)
  const outer = samples.map((q) => q.p)
  const inner = samples.map(({ p, n }): Point => [p[0] - n[0] * g, p[1] - n[1] * g])
  const walked = walkPath(path)
  const toD = (pts: Point[]) => pts.map((q, i) => `${i ? 'L' : 'M'} ${q[0]} ${q[1]}`).join(' ')
  const outline = `${toD(outer)} ${toD([...inner].reverse()).replace(/^M/, 'L')} Z`

  // Gabaryt obrysu frontu.
  const xs = [...outer, ...inner].map((q) => q[0])
  const ys = [...outer, ...inner].map((q) => q[1])
  const box = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  const boxW = box.maxX - box.minX
  const boxH = box.maxY - box.minY

  const extent = Math.max(boxW, boxH)
  const unit = extent / 100
  const off = unit * 7

  // Widok: gabaryt + środki łuków + miejsce na dwa rzędy wymiarów z każdej strony.
  const centers = walked.flatMap((w) => (w.center ? [w.center] : []))
  const pad = off * 3.2
  const allX = [box.minX, box.maxX, ...centers.map((c) => c[0])]
  const allY = [box.minY, box.maxY, ...centers.map((c) => c[1])]
  const vMinX = Math.min(...allX) - pad
  const vMinY = Math.min(...allY) - pad
  const vW = Math.max(...allX) - Math.min(...allX) + pad * 2
  const vH = Math.max(...allY) - Math.min(...allY) + pad * 2
  // Jednostki rysunku na piksel – napisy i znaczniki mają stały rozmiar na ekranie.
  const px = screen ? Math.max(vW / screen.w, vH / screen.h) : unit / 4

  const dims: ReactNode[] = []
  let lineUp = false
  let lineRight = false
  walked.forEach((w, i) => {
    if (w.segment.kind !== 'line') return
    const n = outerNormal(w.headingStart)
    if (n[1] < -0.7) lineUp = true
    if (n[0] > 0.7) lineRight = true
    dims.push(
      <Dimension key={`l${i}`} p1={w.start} p2={w.end} dir={n} offset={off} label={fmt(w.segment.length)} px={px} />,
    )
  })
  // Gabaryt: szerokość nad rysunkiem, głębokość po prawej.
  dims.push(
    <Dimension
      key="w"
      p1={[box.minX, box.minY]}
      p2={[box.maxX, box.minY]}
      dir={[0, -1]}
      offset={lineUp ? off * 2.2 : off}
      label={fmt(boxW)}
      px={px}
    />,
    <Dimension
      key="h"
      p1={[box.maxX, box.minY]}
      p2={[box.maxX, box.maxY]}
      dir={[1, 0]}
      offset={lineRight ? off * 2.2 : off}
      label={fmt(boxH)}
      px={px}
    />,
  )
  // Grubość na końcu frontu.
  const last = walked[walked.length - 1]
  const endDir: Point = [Math.cos((last.headingEnd * Math.PI) / 180), Math.sin((last.headingEnd * Math.PI) / 180)]
  dims.push(
    <Dimension
      key="g"
      p1={outer[outer.length - 1]}
      p2={inner[inner.length - 1]}
      dir={endDir}
      offset={off * 0.9}
      label={`${g}`}
      px={px}
    />,
  )

  // Łuki: kreskowane promienie do końców łuku i linia R z grotem przy licu.
  const arcs = walked.flatMap((w, i) => {
    if (w.segment.kind !== 'arc' || !w.center) return []
    const c = w.center
    const r = w.segment.radius
    const ri = r - g
    const nS = outerNormal(w.headingStart)
    const nE = outerNormal(w.headingEnd)
    const aDeg = w.headingStart + Math.min(w.segment.angleDeg / 2, 45)
    const rDir = outerNormal(aDeg)
    const rEnd: Point = [c[0] + rDir[0] * r, c[1] + rDir[1] * r]
    const arrowLen = px * 11
    const base: Point = [rEnd[0] - rDir[0] * arrowLen, rEnd[1] - rDir[1] * arrowLen]
    const perp: Point = [-rDir[1], rDir[0]]
    const arrow = [rEnd, [base[0] + perp[0] * px * 3.5, base[1] + perp[1] * px * 3.5], [base[0] - perp[0] * px * 3.5, base[1] - perp[1] * px * 3.5]]
    const label: Point = [c[0] + rDir[0] * r * 0.5 - perp[0] * px * 9, c[1] + rDir[1] * r * 0.5 - perp[1] * px * 9]
    let angle = (Math.atan2(rDir[1], rDir[0]) * 180) / Math.PI
    if (angle >= 90) angle -= 180
    if (angle < -90) angle += 180
    return [
      <g key={`a${i}`}>
        <path
          className="plan__dashed"
          d={`M ${c[0] + nS[0] * ri} ${c[1] + nS[1] * ri} L ${c[0]} ${c[1]} L ${c[0] + nE[0] * ri} ${c[1] + nE[1] * ri}`}
        />
        <line className="plan__thin" x1={c[0]} y1={c[1]} x2={base[0]} y2={base[1]} />
        <polygon className="plan__arrow" points={arrow.map((q) => q.join(',')).join(' ')} />
        <text className="plan__text" x={label[0]} y={label[1]} transform={`rotate(${angle} ${label[0]} ${label[1]})`} fontSize={px * 11}>
          R{r}
        </text>
      </g>,
    ]
  })

  // Granice łuk / odcinek prosty.
  const seams = walked.slice(0, -1).map((w, i) => {
    const n = outerNormal(w.headingEnd)
    return (
      <line
        key={`s${i}`}
        className="plan__seam"
        x1={w.end[0]}
        y1={w.end[1]}
        x2={w.end[0] - n[0] * g}
        y2={w.end[1] - n[1] * g}
      />
    )
  })

  return (
    <svg
      ref={svgRef}
      className="viz__svg plan"
      viewBox={`${vMinX} ${vMinY} ${vW} ${vH}`}
      role="img"
      aria-label={`Rzut z góry: ${frontType.name}, R ${config.radiusMm} mm, grubość ${g} mm, gabaryt ${fmt(boxW)} × ${fmt(boxH)} mm`}
    >
      <defs>
        {/* Kreskowanie przekroju (jak przekrój gałki na rysunku referencyjnym). */}
        <pattern id={hatchId} width={px * 6} height={px * 6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={px * 6} className="plan__hatch" strokeWidth={px} />
        </pattern>
      </defs>

      {arcs}

      {/* Front: przekrój z kreskowaniem, lico pogrubione */}
      <path d={outline} className="plan__section" fill={`url(#${hatchId})`} />
      {seams}
      <path d={toD(outer)} className="plan__face" />

      {dims}

      <text className="plan__caption" x={vMinX + px * 10} y={vMinY + vH - px * 10} fontSize={px * 10}>
        mm
      </text>
    </svg>
  )
}
