// Ikony frontów w rzucie izometrycznym (styl design systemu): bryła o grubości 18 mm
// wyciągnięta w górę, lico szare z gradientem, cienki jasny kontur. Fragmenty można
// wyróżnić złotem (np. przedłużenie) albo pokazać jako „duch” – przerywany kontur
// (np. przedłużenie, którego jeszcze nie ma).

import { outerNormal, type Point, type Segment } from './frontPath'

export type PartMode = 'solid' | 'gold' | 'ghost'

export interface IconPart {
  segment: Segment
  mode: PartMode
}

export interface IconFace {
  kind: 'wall' | 'top' | 'cap'
  mode: PartMode
  points: Point[]
  /** Głębokość (mniejsza = dalej) – do kolejności rysowania. */
  depth: number
}

export interface IconGeometry {
  faces: IconFace[]
  /** Kontury (polilinie) – bryła pełna i złota. */
  lines: Point[][]
  /** Kontury „ducha” (przerywane). */
  ghostLines: Point[][]
  viewBox: [number, number, number, number]
}

const TILT = 0.42
const rad = (d: number) => (d * Math.PI) / 180

interface Sample {
  p: Point
  heading: number
  part: number
}

/** Punkty lica zewnętrznego wzdłuż ścieżki, z podziałem na części. */
function samplesOf(parts: IconPart[], startHeading: number): Sample[][] {
  let p: Point = [0, 0]
  let h = startHeading
  return parts.map((part, i) => {
    const s = part.segment
    const out: Sample[] = [{ p, heading: h, part: i }]
    if (s.kind === 'line') {
      p = [p[0] + Math.cos(rad(h)) * s.length, p[1] + Math.sin(rad(h)) * s.length]
      out.push({ p, heading: h, part: i })
    } else {
      // Łuk w prawo: środek po prawej stronie kierunku ruchu.
      const n = outerNormal(h)
      const c: Point = [p[0] - n[0] * s.radius, p[1] - n[1] * s.radius]
      const steps = Math.max(2, Math.ceil(s.angleDeg / 6))
      for (let k = 1; k <= steps; k++) {
        const hk = h + (s.angleDeg * k) / steps
        const nk = outerNormal(hk)
        out.push({ p: [c[0] + nk[0] * s.radius, c[1] + nk[1] * s.radius], heading: hk, part: i })
      }
      h += s.angleDeg
      p = out[out.length - 1].p
    }
    return out
  })
}

/**
 * Buduje ikonę: rzut obrócony tak, by średnia normalna lica patrzyła na widza
 * (+ lekki skręt dla efektu 3/4), bryła o wysokości `height` [mm rzutu].
 */
export function buildIcon(
  parts: IconPart[],
  startHeading = 0,
  options: { inside?: boolean; yawDeg?: number } = {},
): IconGeometry {
  const { inside = false, yawDeg = -18 } = options
  const raw = samplesOf(parts, startHeading)
  // Grubość przesadzona względem skali (jak w design systemie), żeby wierzch był czytelny.
  const flat = raw.flat().map((s) => s.p)
  const span = Math.max(
    Math.max(...flat.map((q) => q[0])) - Math.min(...flat.map((q) => q[0])),
    Math.max(...flat.map((q) => q[1])) - Math.min(...flat.map((q) => q[1])),
  )
  const THICK = span * 0.07

  // Średnia normalna zewnętrzna (ważona długością) → kierunek „do widza”.
  let nx = 0
  let ny = 0
  for (const s of raw.flat()) {
    const n = outerNormal(s.heading)
    nx += n[0]
    ny += n[1]
  }
  // Widok od strony lica (wypukłej) albo od środka (wklęsłej).
  const view = Math.atan2(ny, nx) + (inside ? Math.PI : 0)
  // Obrót: normalna średnia → +Y (do widza), plus skręt.
  const rot = Math.PI / 2 - view + rad(yawDeg)
  const cos = Math.cos(rot)
  const sin = Math.sin(rot)
  const R = (q: Point): Point => [q[0] * cos - q[1] * sin, q[0] * sin + q[1] * cos]
  const Rn = (headingDeg: number): Point => R(outerNormal(headingDeg))

  const outer = raw.map((ps) => ps.map((s) => R(s.p)))
  const inner = raw.map((ps) =>
    ps.map((s) => {
      const n = outerNormal(s.heading)
      return R([s.p[0] - n[0] * THICK, s.p[1] - n[1] * THICK])
    }),
  )

  const all = [...outer.flat(), ...inner.flat()]
  const minX = Math.min(...all.map((q) => q[0]))
  const maxX = Math.max(...all.map((q) => q[0]))
  const H = (maxX - minX) * 0.62
  const proj = (q: Point, z: number): Point => [q[0], q[1] * TILT - z]

  const faces: IconFace[] = []
  const lines: Point[][] = []
  const ghostLines: Point[][] = []
  const push = (mode: PartMode, line: Point[]) => (mode === 'ghost' ? ghostLines : lines).push(line)

  raw.forEach((ps, i) => {
    const mode = parts[i].mode
    const o = outer[i]
    const n = inner[i]
    // Pasy lica zewnętrznego / wewnętrznego widoczne dla widza, łączone w ciągłe ściany.
    const stripNormal = (k: number) => Rn((ps[k].heading + ps[k + 1].heading) / 2)
    const walls = (side: Point[], sign: 1 | -1) => {
      let run: number[] = []
      const flush = () => {
        if (run.length === 0) return
        const idx = [...run, run[run.length - 1] + 1]
        const topLine = idx.map((k) => proj(side[k], H))
        const bottomLine = idx.map((k) => proj(side[k], 0))
        faces.push({
          kind: 'wall',
          mode,
          points: [...topLine, ...bottomLine.reverse()],
          depth: idx.reduce((sum, k) => sum + side[k][1], 0) / idx.length,
        })
        push(mode, idx.map((k) => proj(side[k], 0)))
        // Sylwetka: pionowe krawędzie na końcach widocznego odcinka.
        push(mode, [proj(side[idx[0]], H), proj(side[idx[0]], 0)])
        push(mode, [proj(side[idx[idx.length - 1]], H), proj(side[idx[idx.length - 1]], 0)])
        run = []
      }
      for (let k = 0; k < ps.length - 1; k++) {
        if (sign * stripNormal(k)[1] > 0.02) run.push(k)
        else flush()
      }
      flush()
    }
    walls(o, 1)
    walls(n, -1)
    // Wierzch części (pierścień między licem a stroną wewnętrzną).
    const top = [...o.map((q) => proj(q, H)), ...[...n].reverse().map((q) => proj(q, H))]
    faces.push({ kind: 'top', mode, points: top, depth: Infinity })
    push(mode, [...top, top[0]])
    // Granice części: pionowe krawędzie na licu (widoczne) i czoła.
    for (const end of [0, ps.length - 1]) {
      const heading = ps[end].heading
      const dir: Point = R([Math.cos(rad(heading)), Math.sin(rad(heading))])
      const capNormal: Point = end === 0 ? [-dir[0], -dir[1]] : dir
      const isPathEnd = (i === 0 && end === 0) || (i === raw.length - 1 && end === ps.length - 1)
      if (isPathEnd && capNormal[1] > 0.02) {
        faces.push({
          kind: 'cap',
          mode,
          points: [proj(o[end], H), proj(n[end], H), proj(n[end], 0), proj(o[end], 0)],
          depth: (o[end][1] + n[end][1]) / 2,
        })
        push(mode, [proj(n[end], H), proj(n[end], 0), proj(o[end], 0)])
      }
    }
  })

  // Dalsze ściany najpierw; wierzchy na końcu (zawsze nad ścianami, które przykrywają).
  faces.sort((a, b) => a.depth - b.depth)

  const pts = faces.flatMap((f) => f.points)
  const xs = pts.map((q) => q[0])
  const ys = pts.map((q) => q[1])
  const pad = (Math.max(...xs) - Math.min(...xs)) * 0.06
  return {
    faces,
    lines,
    ghostLines,
    viewBox: [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2],
  }
}
