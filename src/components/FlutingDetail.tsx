import { useEffect, useRef } from 'react'
import type { Fluting } from '../config/catalog'
import { grooveCenters, profileOutline } from '../lib/flutingGeometry'

const BOARD = 18

const fmt = (v: number) => v.toLocaleString('pl-PL', { maximumFractionDigits: 1 })

/** Linia wymiarowa z grotami i opisem (współrzędne w mm przekroju). */
function Dim({
  x1,
  y1,
  x2,
  y2,
  label,
  fs,
  side = 'above',
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
  fs: number
  side?: 'above' | 'left' | 'right'
}) {
  const vertical = x1 === x2
  const tx = vertical ? x1 + (side === 'left' ? -fs * 0.5 : fs * 0.5) : (x1 + x2) / 2
  const ty = vertical ? (y1 + y2) / 2 : y1 - fs * 0.45
  return (
    <g className="fluting-detail__dim">
      <line x1={x1} y1={y1} x2={x2} y2={y2} markerStart="url(#fd-arrow)" markerEnd="url(#fd-arrow)" />
      <text
        x={tx}
        y={ty}
        fontSize={fs}
        textAnchor={vertical ? (side === 'left' ? 'end' : 'start') : 'middle'}
        dominantBaseline={vertical ? 'middle' : 'auto'}
      >
        {label}
      </text>
    </g>
  )
}

/** Rysunek wymiarowy ryflowania (przekrój płyty) – otwierany na żądanie z sekcji „Ryflowanie”. */
export function FlutingDetail({ fluting, open, onClose }: { fluting: Fluting; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const p = fluting.profile
  // Wycinek płyty: co najmniej trzy podziałki, żeby było widać rozstaw.
  const span = p ? Math.max(48, Math.round(p.pitchMm * 3.2)) : 60
  const fs = span / 18
  const top = fs * 5.4
  const right = fs * 4.5
  const left = fs * 1
  const bottom = fs * 1.2

  let dims = null
  if (p) {
    const centers = grooveCenters(p, span)
    const i = Math.max(0, Math.floor((centers.length - 1) / 2))
    const c = centers[i]
    const next = centers[i + 1]
    const a = c - p.widthMm / 2
    const b = c + p.widthMm / 2
    const rib = p.shape === 'rib'
    dims = (
      <>
        <line className="fluting-detail__ext" x1={a} y1={-fs * 2.2} x2={a} y2={rib ? p.depthMm : 0} />
        <line className="fluting-detail__ext" x1={b} y1={-fs * 2.2} x2={b} y2={rib ? p.depthMm : 0} />
        <Dim x1={a} y1={-fs * 1.6} x2={b} y2={-fs * 1.6} label={`${fmt(p.widthMm)}`} fs={fs} />
        {next !== undefined && (
          <>
            <line className="fluting-detail__ext fluting-detail__ext--axis" x1={c} y1={-fs * 3.8} x2={c} y2={BOARD} />
            <line className="fluting-detail__ext fluting-detail__ext--axis" x1={next} y1={-fs * 3.8} x2={next} y2={BOARD} />
            <Dim x1={c} y1={-fs * 3.3} x2={next} y2={-fs * 3.3} label={`${fmt(p.pitchMm)}`} fs={fs} />
          </>
        )}
        <Dim
          x1={rib ? a - fs * 0.6 : b + fs * 0.6}
          y1={0}
          x2={rib ? a - fs * 0.6 : b + fs * 0.6}
          y2={p.depthMm}
          label={`${fmt(p.depthMm)}`}
          fs={fs * 0.9}
          side={rib ? 'left' : 'right'}
        />
      </>
    )
  }

  const rows = p
    ? [
        [p.shape === 'rib' ? 'Szerokość wałka' : 'Szerokość rowka', p.widthMm],
        ['Rozstaw (podziałka)', p.pitchMm],
        [p.shape === 'rib' ? 'Wysokość wałka' : 'Głębokość', p.depthMm],
        ['Grubość płyty', BOARD],
      ]
    : [['Grubość płyty', BOARD]]

  return (
    <dialog ref={ref} className="privacy fluting-detail" aria-labelledby="fluting-detail-title" onClose={onClose} onCancel={onClose}>
      <div className="privacy__head">
        <h2 id="fluting-detail-title">
          {fluting.id} · {fluting.name}
        </h2>
        <button type="button" className="drawer__close" onClick={onClose} aria-label="Zamknij">
          ✕
        </button>
      </div>
      <div className="privacy__body">
        <svg
          className="fluting-detail__svg"
          viewBox={`${-left} ${-top} ${span + left + right} ${BOARD + top + bottom}`}
          role="img"
          aria-label={`Przekrój ryflowania ${fluting.id}, wymiary w milimetrach`}
        >
          <defs>
            <marker id="fd-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" />
            </marker>
          </defs>
          <path className="fluting-detail__board" d={profileOutline(p, span)} />
          {dims}
          <line className="fluting-detail__ext" x1={span} y1={0} x2={span + fs * 2.6} y2={0} />
          <line className="fluting-detail__ext" x1={span} y1={BOARD} x2={span + fs * 2.6} y2={BOARD} />
          <Dim x1={span + fs * 2} y1={0} x2={span + fs * 2} y2={BOARD} label="18" fs={fs} side="right" />
        </svg>
        <dl className="fluting-detail__list">
          {rows.map(([label, v]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{fmt(v as number)} mm</dd>
            </div>
          ))}
        </dl>
        <p className="fluting-detail__note">Przekrój poprzeczny lica, wymiary w milimetrach (poglądowo, wg katalogu).</p>
      </div>
    </dialog>
  )
}
