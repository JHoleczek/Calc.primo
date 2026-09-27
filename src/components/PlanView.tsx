import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { FRONT_TYPES } from '../config/catalog'
import type { Configuration } from '../lib/calculate'
import { fmtMm as fmt, planGeometry, type ViewBox } from '../lib/planGeometry'
import { PlanContent } from './PlanDrawing'

const MIN_ZOOM = 1
const MAX_ZOOM = 16
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Stan nawigacji: powiększenie i przesunięcie środka widoku względem środka całego rysunku. */
interface Nav {
  key: string
  zoom: number
  dx: number
  dy: number
}

interface Props {
  config: Configuration
  /** Zoom, przesuwanie i przycisk „Wyzeruj widok” (wyłączone np. w awaryjnym podglądzie 3D). */
  interactive?: boolean
}

/**
 * Rzut z góry w skali, w stylu rysunku technicznego (jasne linie na czarnym tle).
 * Kształt pochodzi z frontPath (ten sam opis co obliczenia i model 3D).
 * Kółko / szczypanie = zoom wokół kursora, przeciąganie = przesuwanie.
 */
export function PlanView({ config, interactive = false }: Props) {
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
  const geo = planGeometry(config)
  const base = geo.view
  // Zmiana kształtu (inny gabaryt) wraca do pełnego widoku.
  const key = `${base.x}|${base.y}|${base.w}|${base.h}`
  const [navState, setNavState] = useState<Nav>({ key, zoom: 1, dx: 0, dy: 0 })
  const nav = navState.key === key ? navState : { key, zoom: 1, dx: 0, dy: 0 }

  const vw = base.w / nav.zoom
  const vh = base.h / nav.zoom
  const cx = base.x + base.w / 2 + nav.dx
  const cy = base.y + base.h / 2 + nav.dy
  // Jednostki rysunku na piksel – napisy i znaczniki mają stały rozmiar na ekranie.
  const px = screen ? Math.max(vw / screen.w, vh / screen.h) : geo.unit / 4

  // Aktualne wartości dla obsługi zdarzeń (nasłuchy nie są odtwarzane przy każdym renderze).
  const live = useRef({ base, key, px })
  useEffect(() => {
    live.current = { base, key, px }
  })

  /** Zoom o czynnik `k` wokół punktu ekranu (względem środka SVG); bez punktu – wokół środka widoku. */
  const zoomBy = useCallback((k: number, at?: { x: number; y: number }) => {
    setNavState((prev) => {
      const { base: b, key: kk, px: p } = live.current
      const cur = prev.key === kk ? prev : { key: kk, zoom: 1, dx: 0, dy: 0 }
      const zoom = clamp(cur.zoom * k, MIN_ZOOM, MAX_ZOOM)
      const real = zoom / cur.zoom
      const ox = at ? at.x * p : 0
      const oy = at ? at.y * p : 0
      // Punkt pod kursorem zostaje w miejscu: nowy środek = punkt − przesunięcie / real.
      const dx = cur.dx + ox - ox / real
      const dy = cur.dy + oy - oy / real
      return limit({ key: kk, zoom, dx, dy }, b)
    })
  }, [])

  const panBy = useCallback((sx: number, sy: number) => {
    setNavState((prev) => {
      const { base: b, key: kk, px: p } = live.current
      const cur = prev.key === kk ? prev : { key: kk, zoom: 1, dx: 0, dy: 0 }
      return limit({ ...cur, dx: cur.dx - sx * p, dy: cur.dy - sy * p }, b)
    })
  }, [])

  const reset = () => setNavState({ key, zoom: 1, dx: 0, dy: 0 })

  // Kółko myszy / gest na touchpadzie – nasłuch nie-pasywny, żeby nie przewijać strony.
  useEffect(() => {
    const el = svgRef.current
    if (!el || !interactive) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const k = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015))
      zoomBy(k, { x: e.clientX - r.left - r.width / 2, y: e.clientY - r.top - r.height / 2 })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [interactive, zoomBy])

  // Przeciąganie (mysz, pióro, palec) i szczypanie dwoma palcami.
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const map = pointers.current
    const prev = map.get(e.pointerId)
    if (!prev) return
    const others = [...map.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p)
    const next = { x: e.clientX, y: e.clientY }
    if (others.length === 0) {
      panBy(next.x - prev.x, next.y - prev.y)
    } else {
      const o = others[0]
      const d0 = Math.hypot(prev.x - o.x, prev.y - o.y)
      const d1 = Math.hypot(next.x - o.x, next.y - o.y)
      const r = e.currentTarget.getBoundingClientRect()
      // Przesunięcie środka gestu + zoom wokół niego.
      panBy((next.x - prev.x) / 2, (next.y - prev.y) / 2)
      if (d0 > 0) {
        zoomBy(d1 / d0, {
          x: (next.x + o.x) / 2 - r.left - r.width / 2,
          y: (next.y + o.y) / 2 - r.top - r.height / 2,
        })
      }
    }
    map.set(e.pointerId, next)
  }
  const onPointerEnd = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
  }

  const onKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    const step = 40
    const actions: Record<string, () => void> = {
      '+': () => zoomBy(1.25),
      '=': () => zoomBy(1.25),
      '-': () => zoomBy(0.8),
      '0': reset,
      ArrowLeft: () => panBy(step, 0),
      ArrowRight: () => panBy(-step, 0),
      ArrowUp: () => panBy(0, step),
      ArrowDown: () => panBy(0, -step),
    }
    const action = actions[e.key]
    if (action) {
      e.preventDefault()
      action()
    }
  }

  const zoomed = nav.zoom !== 1 || nav.dx !== 0 || nav.dy !== 0
  const label = `Rzut z góry: ${frontType.name}, R ${config.radiusMm} mm, grubość ${geo.g} mm, gabaryt ${fmt(geo.boxW)} × ${fmt(geo.boxH)} mm`

  const svg = (
    <svg
      ref={svgRef}
      className={`viz__svg plan${interactive ? ' plan--interactive' : ''}`}
      viewBox={`${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`}
      role="img"
      aria-label={label}
      {...(interactive && {
        tabIndex: 0,
        'aria-keyshortcuts': '+ - 0 ArrowLeft ArrowRight ArrowUp ArrowDown',
        onPointerDown,
        onPointerMove,
        onPointerUp: onPointerEnd,
        onPointerCancel: onPointerEnd,
        onKeyDown,
        onDoubleClick: reset,
      })}
    >
      <PlanContent geo={geo} px={px} hatchId={hatchId} />
      {!zoomed && (
        <text className="plan__caption" x={base.x + px * 10} y={base.y + base.h - px * 10} fontSize={px * 10}>
          mm
        </text>
      )}
    </svg>
  )

  if (!interactive) return svg

  return (
    <div className="plan-nav">
      {svg}
      <p className="plan-nav__hint">Kółko / szczypanie = zoom · przeciągnij = przesuń</p>
      <div className="plan-nav__tools" role="group" aria-label="Powiększenie rysunku">
        <button type="button" className="plan-nav__btn" onClick={() => zoomBy(0.8)} disabled={nav.zoom <= MIN_ZOOM} aria-label="Oddal" title="Oddal (−)">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
        </button>
        <output className="plan-nav__zoom" aria-live="polite" aria-label="Powiększenie">
          {Math.round(nav.zoom * 100)}%
        </output>
        <button type="button" className="plan-nav__btn" onClick={() => zoomBy(1.25)} disabled={nav.zoom >= MAX_ZOOM} aria-label="Przybliż" title="Przybliż (+)">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M8 3v10" /></svg>
        </button>
        <button type="button" className="plan-nav__btn plan-nav__btn--text" onClick={reset} disabled={!zoomed} aria-label="Wyzeruj widok" title="Wyzeruj widok (0 lub podwójne kliknięcie)">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6.5A5 5 0 1 1 3 9.5M3.5 2.5v4h4" /></svg>
          <span className="plan-nav__label">Wyzeruj widok</span>
        </button>
      </div>
    </div>
  )
}

/** Nie pozwala „zgubić” rysunku – środek widoku zostaje w obrębie pełnego rysunku. */
function limit(nav: Nav, base: ViewBox): Nav {
  const mx = (base.w / 2) * (1 - 1 / nav.zoom) + base.w * 0.25
  const my = (base.h / 2) * (1 - 1 / nav.zoom) + base.h * 0.25
  const dx = nav.zoom === 1 ? 0 : clamp(nav.dx, -mx, mx)
  const dy = nav.zoom === 1 ? 0 : clamp(nav.dy, -my, my)
  return { ...nav, dx, dy }
}

