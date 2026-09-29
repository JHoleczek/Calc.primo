import { useId, useMemo } from 'react'
import { buildIcon, type IconPart, type PartMode } from '../lib/isoIcon'

interface Props {
  parts: IconPart[]
  start?: number
  /** Widok od strony wklęsłej (np. zakończenia – przedłużenia idą w stronę widza). */
  inside?: boolean
  className?: string
}

/** Ikona bryły frontu (dekoracyjna – opis zawsze jest w etykiecie obok). */
export function FrontIcon({ parts, start = 0, inside = false, className }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const key = JSON.stringify([parts, start, inside])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(() => buildIcon(parts, start, { inside }), [key])
  const toPts = (pts: [number, number][]) => pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ')
  const fill = (kind: string, mode: PartMode) =>
    mode === 'ghost'
      ? 'none'
      : kind === 'top'
        ? mode === 'gold'
          ? 'var(--icon-gold-top)'
          : 'var(--icon-top)'
        : `url(#${id}-${mode})`
  const [x, y, w, h] = g.viewBox

  return (
    <svg className={`front-icon${className ? ` ${className}` : ''}`} viewBox={`${x} ${y} ${w} ${h}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-solid`} gradientUnits="userSpaceOnUse" x1={x} y1={y} x2={x + w} y2={y + h}>
          <stop offset="0" style={{ stopColor: 'var(--icon-wall-a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--icon-wall-b)' }} />
        </linearGradient>
        <linearGradient id={`${id}-gold`} gradientUnits="userSpaceOnUse" x1={0} y1={y} x2={0} y2={y + h}>
          <stop offset="0" style={{ stopColor: 'var(--icon-gold-a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--icon-gold-b)' }} />
        </linearGradient>
      </defs>
      {g.faces.map((f, i) => (
        <polygon
          key={i}
          points={toPts(f.points)}
          fill={fill(f.kind, f.mode)}
        />
      ))}
      {g.lines.map((l, i) => (
        <polyline key={`l${i}`} className="front-icon__line" points={toPts(l)} />
      ))}
      {g.ghostLines.map((l, i) => (
        <polyline key={`g${i}`} className="front-icon__ghost" points={toPts(l)} />
      ))}
    </svg>
  )
}
