import { THICKNESS_MM } from '../config/catalog'
import { frontPath, samplePath, walkPath, type ShapeParams } from './frontPath'

export type Point = [number, number]

export const fmtMm = (mm: number) => Math.round(mm).toLocaleString('pl-PL')

export interface ViewBox {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Geometria rzutu. `screenPx` – krótszy bok obszaru rysunku na ekranie [px]: na małym ekranie
 * rzędy wymiarów są rozsuwane, żeby liczby (stały rozmiar w px) na siebie nie nachodziły.
 */
export function planGeometry(shape: ShapeParams, screenPx = Infinity) {
  const path = frontPath(shape)
  const g = THICKNESS_MM
  const samples = samplePath(path, 4, 1.5)
  const outer = samples.map((q) => q.p)
  const inner = samples.map(({ p, n }): Point => [p[0] - n[0] * g, p[1] - n[1] * g])
  const walked = walkPath(path)

  // Gabaryt obrysu frontu.
  const xs = [...outer, ...inner].map((q) => q[0])
  const ys = [...outer, ...inner].map((q) => q[1])
  const box = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  const boxW = box.maxX - box.minX
  const boxH = box.maxY - box.minY
  const extent = Math.max(boxW, boxH)
  const unit = extent / 100
  // Odstęp rzędu wymiarów ≥ ok. 24 px ekranu (widok ≈ gabaryt + 6,4 × odstęp).
  const minOff = screenPx > 220 ? (24 * extent) / (screenPx - 160) : 0
  const off = Math.max(unit * 7, minOff)

  // Widok: gabaryt + środki łuków + miejsce na dwa rzędy wymiarów z każdej strony.
  const centers = walked.flatMap((w) => (w.center ? [w.center] : []))
  const pad = off * 3.2
  const allX = [box.minX, box.maxX, ...centers.map((c) => c[0])]
  const allY = [box.minY, box.maxY, ...centers.map((c) => c[1])]
  const view: ViewBox = {
    x: Math.min(...allX) - pad,
    y: Math.min(...allY) - pad,
    w: Math.max(...allX) - Math.min(...allX) + pad * 2,
    h: Math.max(...allY) - Math.min(...allY) + pad * 2,
  }
  return { g, outer, inner, walked, box, boxW, boxH, unit, off, view }
}

export type PlanGeometry = ReturnType<typeof planGeometry>

