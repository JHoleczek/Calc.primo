// Kształt frontu w rzucie z góry jako ciąg odcinków prostych i łuków,
// opisany po licu zewnętrznym. Jeden opis zasila obliczenia, rzut 2D i model 3D.
//
// Układ rzutu: X w prawo, Y w dół (jak w SVG). Kierunek 0° = w prawo, 90° = w dół.
// Łuki skręcają zawsze w prawo (zgodnie z ruchem wskazówek zegara), więc lico
// (strona zewnętrzna) leży po lewej stronie kierunku ruchu, a środek łuku po prawej.

import {
  CORNER_EXTENSION_MM,
  DOUBLE_WIDTHS,
  DOUBLE_Z,
  ENDINGS,
  EXTENDED_LENGTH,
  type EndingId,
  type FrontTypeId,
} from '../config/catalog'

export type Point = [number, number]

export type Segment =
  | { kind: 'line'; length: number }
  | { kind: 'arc'; radius: number; angleDeg: number }

export interface FrontPath {
  startHeadingDeg: number
  segments: Segment[]
}

export interface ShapeParams {
  typeId: FrontTypeId
  radiusMm: number
  endingId: EndingId
  /** Przedłużane: całkowity wymiar L [mm]. */
  lengthMm: number
  /** Obustronne: szerokość W [mm]. */
  widthMm: number
  /** Obustronne: czy boki są przedłużone. */
  sideExtension: boolean
  /** Obustronne: całkowita głębokość Z [mm]. */
  zMm: number
}

/** Kształt frontu dla danej konfiguracji; null dla bryły (wycena indywidualna). */
export function frontPath(p: ShapeParams): FrontPath | null {
  const R = p.radiusMm
  switch (p.typeId) {
    case 'narozne': {
      const ext = (ENDINGS.find((e) => e.id === p.endingId) ?? ENDINGS[0]).extensions
      const line: Segment = { kind: 'line', length: CORNER_EXTENSION_MM }
      // N1: przedłużenie na końcu łuku (dół), N2: na obu końcach.
      return {
        startHeadingDeg: 0,
        segments: [
          ...(ext === 2 ? [line] : []),
          { kind: 'arc', radius: R, angleDeg: 90 },
          ...(ext >= 1 ? [line] : []),
        ],
      }
    }
    case 'przedluzane': {
      const L = Math.min(EXTENDED_LENGTH.max, Math.max(R + 1, p.lengthMm))
      return {
        startHeadingDeg: 0,
        segments: [
          { kind: 'arc', radius: R, angleDeg: 90 },
          { kind: 'line', length: L - R },
        ],
      }
    }
    case 'obustronne': {
      const W = DOUBLE_WIDTHS.includes(p.widthMm) ? p.widthMm : DOUBLE_WIDTHS[0]
      const Z = Math.min(DOUBLE_Z.max, Math.max(R + 1, p.zMm))
      const legs: Segment[] = p.sideExtension ? [{ kind: 'line', length: Z - R }] : []
      // Start na dole lewego boku, w górę; dwa łuki 90° i prosty środek.
      return {
        startHeadingDeg: -90,
        segments: [
          ...legs,
          { kind: 'arc', radius: R, angleDeg: 90 },
          { kind: 'line', length: W - 2 * R },
          { kind: 'arc', radius: R, angleDeg: 90 },
          ...legs,
        ],
      }
    }
    case 'luk':
      return { startHeadingDeg: 0, segments: [{ kind: 'arc', radius: R, angleDeg: 180 }] }
    case 'bryla':
      return null
  }
}

export const segmentLength = (s: Segment) =>
  s.kind === 'line' ? s.length : (s.radius * Math.PI * s.angleDeg) / 180

/** Długość rozwinięcia po licu zewnętrznym [mm]. */
export const pathLength = (path: FrontPath) => path.segments.reduce((sum, s) => sum + segmentLength(s), 0)

const rad = (deg: number) => (deg * Math.PI) / 180
const dirOf = (headingDeg: number): Point => [Math.cos(rad(headingDeg)), Math.sin(rad(headingDeg))]
/** Normalna zewnętrzna (lewa strona kierunku ruchu). */
export const outerNormal = (headingDeg: number): Point => [Math.sin(rad(headingDeg)), -Math.cos(rad(headingDeg))]

export interface WalkedSegment {
  segment: Segment
  start: Point
  end: Point
  headingStart: number
  headingEnd: number
  /** Środek łuku (tylko dla łuków). */
  center?: Point
}

/** Położenie każdego odcinka na licu zewnętrznym; start w (0, 0). */
export function walkPath(path: FrontPath): WalkedSegment[] {
  let p: Point = [0, 0]
  let h = path.startHeadingDeg
  return path.segments.map((segment) => {
    const start = p
    const headingStart = h
    if (segment.kind === 'line') {
      const d = dirOf(h)
      p = [p[0] + d[0] * segment.length, p[1] + d[1] * segment.length]
      return { segment, start, end: p, headingStart, headingEnd: h }
    }
    const n = outerNormal(h)
    const center: Point = [p[0] - n[0] * segment.radius, p[1] - n[1] * segment.radius]
    h += segment.angleDeg
    const n2 = outerNormal(h)
    p = [center[0] + n2[0] * segment.radius, center[1] + n2[1] * segment.radius]
    return { segment, start, end: p, headingStart, headingEnd: h, center }
  })
}

export interface PathSample {
  /** Punkt na licu zewnętrznym. */
  p: Point
  /** Normalna zewnętrzna. */
  n: Point
  /** Współrzędna wzdłuż lica od początku [mm]. */
  s: number
}

/** Próbki lica co ok. `step` mm (łuki dodatkowo co najwyżej co `maxAngleDeg`). */
export function samplePath(path: FrontPath, step: number, maxAngleDeg = 2): PathSample[] {
  const out: PathSample[] = []
  let s0 = 0
  for (const w of walkPath(path)) {
    const len = segmentLength(w.segment)
    const byAngle = w.segment.kind === 'arc' ? Math.ceil(w.segment.angleDeg / maxAngleDeg) : 1
    const count = Math.max(1, Math.ceil(len / step), byAngle)
    for (let i = out.length === 0 ? 0 : 1; i <= count; i++) {
      const t = i / count
      if (w.segment.kind === 'line') {
        const d = dirOf(w.headingStart)
        out.push({
          p: [w.start[0] + d[0] * len * t, w.start[1] + d[1] * len * t],
          n: outerNormal(w.headingStart),
          s: s0 + len * t,
        })
      } else {
        const h = w.headingStart + w.segment.angleDeg * t
        const n = outerNormal(h)
        const c = w.center!
        out.push({ p: [c[0] + n[0] * w.segment.radius, c[1] + n[1] * w.segment.radius], n, s: s0 + len * t })
      }
    }
    s0 += len
  }
  return out
}
