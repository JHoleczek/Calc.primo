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

/** Geometria rzutu niezależna od skali ekranu. */
export function planGeometry(shape: ShapeParams) {
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
  const unit = Math.max(boxW, boxH) / 100
  const off = unit * 7

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

