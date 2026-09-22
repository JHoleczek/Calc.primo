import type { FlutingProfile } from '../config/catalog'
import { samplePath, type FrontPath, type Point } from './frontPath'

// Geometria frontu giętego jako lista trójkątów (bez zależności od three.js).
//
// Wejście to kształt w rzucie (po licu zewnętrznym, patrz frontPath.ts).
// Wyjście w metrach: X w prawo, Y w górę, Z w stronę oglądającego. Model jest
// obrócony tak, by lico było zwrócone do oglądającego (+Z), wyśrodkowany w X/Z
// i postawiony na płaszczyźnie Y = 0. Ryflowanie to pionowe frezy w licu.

export interface FrontGeometryInput {
  path: FrontPath
  thicknessMm: number
  heightMm: number
  fluting?: FlutingProfile
}

export interface FrontGeometryData {
  positions: Float32Array
  normals: Float32Array
  /** Obrys krawędzi frontu jako pary punktów (odcinki), do linii obramowania. */
  edges: Float32Array
  min: [number, number, number]
  max: [number, number, number]
}

const MM = 0.001

/** Głębokość frezu [mm] w punkcie x liczonym od osi rowka (|x| ≤ pitch/2). */
export function flutingDepth(profile: FlutingProfile, x: number, maxDepthMm: number): number {
  const depth = Math.min(profile.depthMm, maxDepthMm)
  const half = profile.widthMm / 2
  const ax = Math.abs(x)
  if (profile.shape === 'rib') {
    // Wałek: zaokrąglone żebro na szerokość rozstawu, między wałkami pełna głębokość.
    const t = ax / (profile.pitchMm / 2)
    return t >= 1 ? depth : depth * (1 - Math.sqrt(1 - t * t))
  }
  if (ax >= half) return 0
  const t = ax / half
  switch (profile.shape) {
    case 'round':
      return depth * Math.sqrt(1 - t * t)
    case 'square':
      return depth
    case 'v':
      return depth * (1 - t)
    case 'u': {
      // Wpust z zaokrąglonym dnem: pionowe ścianki przechodzą łukiem w płaskie dno.
      const r = Math.min(depth, half)
      const dx = ax - (half - r)
      return dx <= 0 ? depth : depth - r + Math.sqrt(Math.max(0, r * r - dx * dx))
    }
  }
}

export function buildFrontGeometry(input: FrontGeometryInput): FrontGeometryData {
  const { thicknessMm: g, heightMm: H, fluting } = input

  const step = fluting ? Math.max(0.4, Math.min(fluting.widthMm, fluting.pitchMm) / 10) : 10
  const samples = samplePath(input.path, step)
  const total = samples[samples.length - 1].s
  const count = samples.length

  // Obrót tak, by średnia normalna lica wskazywała oglądającego.
  const avg = samples.reduce<Point>((a, { n }) => [a[0] + n[0], a[1] + n[1]], [0, 0])
  const phi = -Math.atan2(avg[0], avg[1])
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const rot = (p: Point): Point => [p[0] * cos + p[1] * sin, -p[0] * sin + p[1] * cos]

  // Wzór ryflowania wyśrodkowany na licu.
  const maxDepth = g * 0.45
  const depthAt = (s: number) => {
    if (!fluting) return 0
    const p = fluting.pitchMm
    const offset = (total - Math.floor(total / p) * p) / 2
    const u = (((s - offset) % p) + p) % p
    return flutingDepth(fluting, u - p / 2, maxDepth)
  }

  const face: Point[] = []
  const back: Point[] = []
  for (const { p, n, s } of samples) {
    const d = depthAt(s)
    face.push(rot([p[0] - n[0] * d, p[1] - n[1] * d]))
    back.push(rot([p[0] - n[0] * g, p[1] - n[1] * g]))
  }

  // Wyśrodkowanie w X/Z.
  const all = [...face, ...back]
  const cx = (Math.min(...all.map((q) => q[0])) + Math.max(...all.map((q) => q[0]))) / 2
  const cz = (Math.min(...all.map((q) => q[1])) + Math.max(...all.map((q) => q[1]))) / 2
  for (const q of all) {
    q[0] -= cx
    q[1] -= cz
  }

  const positions: number[] = []
  const normals: number[] = []

  type V3 = [number, number, number]
  const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

  /** Czworokąt a-b-c-d; nawinięcie dobierane tak, by przód trójkątów patrzył wzdłuż normalnych. */
  const quad = (v: V3[], n: V3[]) => {
    const orient = dot(cross(sub(v[1], v[0]), sub(v[2], v[0])), n[0])
    const order = orient >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
    for (const k of order) {
      positions.push(v[k][0] * MM, v[k][1] * MM, v[k][2] * MM)
      normals.push(...n[k])
    }
  }

  /** Normalne krzywej w rzucie (różnice centralne), skierowane od drugiej powierzchni. */
  const curveNormals = (curve: Point[], other: Point[]): V3[] =>
    curve.map((pt, i) => {
      const a = curve[Math.max(0, i - 1)]
      const b = curve[Math.min(curve.length - 1, i + 1)]
      let nx = -(b[1] - a[1])
      let nz = b[0] - a[0]
      const len = Math.hypot(nx, nz) || 1
      nx /= len
      nz /= len
      const away: Point = [pt[0] - other[i][0], pt[1] - other[i][1]]
      const sign = nx * away[0] + nz * away[1] >= 0 ? 1 : -1
      return [nx * sign, 0, nz * sign]
    })

  const faceN = curveNormals(face, back)
  const backN = curveNormals(back, face)
  const up: V3 = [0, 1, 0]
  const down: V3 = [0, -1, 0]
  const at = (pt: Point, y: number): V3 => [pt[0], y, pt[1]]

  for (let i = 0; i < count - 1; i++) {
    const [f0, f1, b0, b1] = [face[i], face[i + 1], back[i], back[i + 1]]
    // Lico i tył.
    quad([at(f0, 0), at(f1, 0), at(f1, H), at(f0, H)], [faceN[i], faceN[i + 1], faceN[i + 1], faceN[i]])
    quad([at(b0, 0), at(b1, 0), at(b1, H), at(b0, H)], [backN[i], backN[i + 1], backN[i + 1], backN[i]])
    // Krawędź górna i dolna.
    for (const [y, n] of [
      [H, up],
      [0, down],
    ] as const) {
      quad([at(f0, y), at(f1, y), at(b1, y), at(b0, y)], [n, n, n, n])
    }
  }

  // Krawędzie boczne (czoła).
  for (const [i, j] of [
    [0, 1],
    [count - 1, count - 2],
  ]) {
    const t: V3 = [face[i][0] - face[j][0], 0, face[i][1] - face[j][1]]
    const len = Math.hypot(t[0], t[2]) || 1
    const n: V3 = [t[0] / len, 0, t[2] / len]
    quad([at(face[i], 0), at(back[i], 0), at(back[i], H), at(face[i], H)], [n, n, n, n])
  }

  // Obramowanie: krzywe lica i tyłu na górze i dole oraz pionowe krawędzie na końcach.
  const edges: number[] = []
  const segment = (a: V3, b: V3) => edges.push(a[0] * MM, a[1] * MM, a[2] * MM, b[0] * MM, b[1] * MM, b[2] * MM)
  for (const y of [0, H]) {
    for (const curve of [face, back]) {
      for (let i = 0; i < count - 1; i++) segment(at(curve[i], y), at(curve[i + 1], y))
    }
    segment(at(face[0], y), at(back[0], y))
    segment(at(face[count - 1], y), at(back[count - 1], y))
  }
  for (const i of [0, count - 1]) {
    segment(at(face[i], 0), at(face[i], H))
    segment(at(back[i], 0), at(back[i], H))
  }

  const min: [number, number, number] = [Infinity, Infinity, Infinity]
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k])
      max[k] = Math.max(max[k], positions[i + k])
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    edges: new Float32Array(edges),
    min,
    max,
  }
}
