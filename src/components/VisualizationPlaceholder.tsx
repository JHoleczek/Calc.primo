import { ENDINGS, FRONT_TYPES, MATERIALS } from '../config/catalog'
import type { Configuration } from '../lib/calculate'

interface Props {
  config: Configuration
}

type Point = [number, number]

const deg = (a: number) => (a * Math.PI) / 180
const onCircle = (r: number, a: number): Point => [r * Math.cos(deg(a)), r * Math.sin(deg(a))]

/**
 * Tymczasowy, poglądowy rzut z góry (2D) w miejscu przyszłej wizualizacji.
 * Łuk jest skierowany licem w dół ekranu; przedłużenia są styczne do łuku.
 */
export function VisualizationPlaceholder({ config }: Props) {
  const frontType = FRONT_TYPES.find((t) => t.id === config.frontTypeId) ?? FRONT_TYPES[0]
  const ending = ENDINGS.find((e) => e.id === config.endingId) ?? ENDINGS[0]
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]

  const g = material.thicknessMm
  const r = config.radiusMm
  const rMid = r + g / 2
  const theta = frontType.angleDeg
  const aStart = 90 + theta / 2
  const aEnd = 90 - theta / 2
  const ext = ending.extensions > 0 && Number.isFinite(config.extensionMm) ? config.extensionMm : 0

  // Przedłużenie po prawej (N1, N2) i po lewej (tylko N2), styczne do łuku.
  const rightDir: Point = [Math.sin(deg(aEnd)), -Math.cos(deg(aEnd))]
  const leftDir: Point = [-Math.sin(deg(aStart)), Math.cos(deg(aStart))]
  const extLeft = ending.extensions === 2 ? ext : 0
  const extRight = ending.extensions >= 1 ? ext : 0

  const path = (radius: number) => {
    const s = onCircle(radius, aStart)
    const e = onCircle(radius, aEnd)
    const s0: Point = [s[0] + leftDir[0] * extLeft, s[1] + leftDir[1] * extLeft]
    const e1: Point = [e[0] + rightDir[0] * extRight, e[1] + rightDir[1] * extRight]
    const largeArc = theta > 180 ? 1 : 0
    return {
      d: `M ${s0[0]} ${s0[1]} L ${s[0]} ${s[1]} A ${radius} ${radius} 0 ${largeArc} 0 ${e[0]} ${e[1]} L ${e1[0]} ${e1[1]}`,
      points: [s0, s, e, e1],
    }
  }

  const band = path(rMid)
  const faceRadius = frontType.direction === 'convex' ? r + g : r
  const face = path(faceRadius)

  // Ramka widoku: środek łuku, końce przedłużeń i skrajne punkty łuku.
  const samples: Point[] = [[0, 0], ...path(r + g).points, ...path(r).points]
  for (let a = aEnd; a <= aStart; a += 5) samples.push(onCircle(r + g, a))
  const xs = samples.map((p) => p[0])
  const ys = samples.map((p) => p[1])
  const pad = Math.max(40, (Math.max(...xs) - Math.min(...xs)) * 0.12)
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const w = Math.max(...xs) - Math.min(...xs) + pad * 2
  const h = Math.max(...ys) - Math.min(...ys) + pad * 2
  const unit = Math.max(w, h) / 100

  const radiusEnd = onCircle(r, 90)

  return (
    <div className="viz">
      <div className="viz__badge">Wizualizacja 3D – w przygotowaniu</div>
      <svg
        className="viz__svg"
        viewBox={`${minX} ${minY} ${w} ${h}`}
        role="img"
        aria-label={`Rzut z góry: ${frontType.name}, R ${r} mm, zakończenie ${ending.name}`}
      >
        <line
          x1={0}
          y1={0}
          x2={radiusEnd[0]}
          y2={radiusEnd[1]}
          className="viz__radius"
          strokeWidth={unit * 0.4}
          strokeDasharray={`${unit * 1.5} ${unit}`}
        />
        <circle cx={0} cy={0} r={unit * 0.9} className="viz__center" />
        <text x={unit * 1.5} y={radiusEnd[1] / 2} className="viz__label" fontSize={unit * 3.4}>
          R {r}
        </text>
        <path d={band.d} className="viz__band" strokeWidth={Math.max(g, unit * 1.2)} />
        <path d={face.d} className="viz__face" strokeWidth={unit * 0.5} />
      </svg>
      <dl className="viz__meta">
        <div>
          <dt>Typ</dt>
          <dd>{frontType.name}</dd>
        </div>
        <div>
          <dt>H</dt>
          <dd>{Number.isFinite(config.heightMm) ? `${config.heightMm} mm` : '—'}</dd>
        </div>
        <div>
          <dt>Lico</dt>
          <dd>{frontType.direction === 'convex' ? 'zewnętrzne' : 'wewnętrzne'}</dd>
        </div>
      </dl>
      <p className="viz__caption">Rzut z góry, schemat poglądowy (nie w skali produkcyjnej).</p>
    </div>
  )
}
