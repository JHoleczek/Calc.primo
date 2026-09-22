import type { FlutingProfile } from '../config/catalog'

// Geometria frontu giętego jako lista trójkątów (bez zależności od three.js).
//
// Układ współrzędnych (metry): X w prawo, Y w górę, Z w stronę oglądającego.
// Środek łuku leży w (0, 0, 0), łuk jest symetryczny względem osi Z, a front
// stoi na płaszczyźnie Y = 0. R to promień wewnętrzny; lico wypukłego frontu
// leży na promieniu R + g, wklęsłego na R. Ryflowanie to pionowe frezy w licu.

export interface FrontGeometryInput {
  radiusMm: number
  angleDeg: number
  convex: boolean
  thicknessMm: number
  heightMm: number
  extensionLeftMm: number
  extensionRightMm: number
  fluting?: FlutingProfile
}

export interface FrontGeometryData {
  positions: Float32Array
  normals: Float32Array
  uvs: Float32Array
  min: [number, number, number]
  max: [number, number, number]
}

type Vec2 = [number, number]

const MM = 0.001

/** Głębokość frezu [mm] w punkcie x liczonym od osi rowka (|x| ≤ pitch/2). */
export function flutingDepth(profile: FlutingProfile, x: number, maxDepthMm: number): number {
  const depth = Math.min(profile.depthMm, maxDepthMm)
  const half = profile.shape === 'rib' ? profile.pitchMm / 2 : profile.widthMm / 2
  const t = Math.abs(x) / half
  if (t >= 1) return profile.shape === 'rib' ? depth : 0
  switch (profile.shape) {
    case 'round':
      return depth * Math.sqrt(1 - t * t)
    case 'square':
      return depth
    case 'v':
      return depth * (1 - t)
    case 'rib':
      return depth * (1 - Math.sqrt(1 - t * t))
  }
}

export function buildFrontGeometry(input: FrontGeometryInput): FrontGeometryData {
  const { radiusMm: R, thicknessMm: g, heightMm: H, convex, fluting } = input
  const theta = (input.angleDeg * Math.PI) / 180
  const aStart = Math.PI / 2 + theta / 2
  const aEnd = Math.PI / 2 - theta / 2
  const faceRadius = convex ? R + g : R

  const extL = Math.max(0, input.extensionLeftMm)
  const extR = Math.max(0, input.extensionRightMm)
  const arcLen = faceRadius * theta
  const total = extL + arcLen + extR

  const polar = (r: number, a: number): Vec2 => [r * Math.cos(a), r * Math.sin(a)]
  const leftDir: Vec2 = [-Math.sin(aStart), Math.cos(aStart)]
  const rightDir: Vec2 = [Math.sin(aEnd), -Math.cos(aEnd)]

  /** Punkt na powierzchni wewnętrznej i normalna (od środka łuku) dla współrzędnej s na licu. */
  const station = (s: number): { p: Vec2; n: Vec2 } => {
    if (s < extL) {
      const t = extL - s
      const base = polar(R, aStart)
      return { p: [base[0] + leftDir[0] * t, base[1] + leftDir[1] * t], n: polar(1, aStart) }
    }
    if (s <= extL + arcLen) {
      const a = aStart - (s - extL) / faceRadius
      return { p: polar(R, a), n: polar(1, a) }
    }
    const t = s - extL - arcLen
    const base = polar(R, aEnd)
    return { p: [base[0] + rightDir[0] * t, base[1] + rightDir[1] * t], n: polar(1, aEnd) }
  }

  // Gęstość próbkowania: frez potrzebuje ~10 próbek na szerokość, gładki łuk ~2°.
  const flutingStep = fluting ? Math.min(fluting.widthMm, fluting.pitchMm) / 10 : Infinity
  const arcStep = faceRadius * (2 * Math.PI) / 180
  const step = Math.max(0.5, Math.min(flutingStep, arcStep, 10))
  const count = Math.max(2, Math.ceil(total / step) + 1)

  // Wzór ryflowania wyśrodkowany na licu.
  const maxDepth = g * 0.45
  const depthAt = (s: number) => {
    if (!fluting) return 0
    const p = fluting.pitchMm
    const offset = (total - Math.floor(total / p) * p) / 2
    const u = (((s - offset) % p) + p) % p
    return flutingDepth(fluting, u - p / 2, maxDepth)
  }

  const face: Vec2[] = []
  const back: Vec2[] = []
  const sValues: number[] = []
  for (let i = 0; i < count; i++) {
    const s = (total * i) / (count - 1)
    const { p, n } = station(s)
    const d = depthAt(s)
    const faceOffset = convex ? g - d : d
    const backOffset = convex ? 0 : g
    face.push([p[0] + n[0] * faceOffset, p[1] + n[1] * faceOffset])
    back.push([p[0] + n[0] * backOffset, p[1] + n[1] * backOffset])
    sValues.push(s)
  }

  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []

  type V3 = [number, number, number]
  const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
  const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

  /** Czworokąt a-b-c-d; nawinięcie dobierane tak, by przód trójkątów patrzył wzdłuż normalnych. */
  const quad = (v: V3[], n: V3[], uv: Vec2[]) => {
    const orient = dot(cross(sub(v[1], v[0]), sub(v[2], v[0])), n[0])
    const order = orient >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
    for (const k of order) {
      positions.push(v[k][0] * MM, v[k][1] * MM, v[k][2] * MM)
      normals.push(...n[k])
      uvs.push(uv[k][0] * MM, uv[k][1] * MM)
    }
  }

  /** Normalne krzywej w rzucie (różnice centralne), skierowane od drugiej powierzchni. */
  const curveNormals = (curve: Vec2[], other: Vec2[]): V3[] =>
    curve.map((pt, i) => {
      const a = curve[Math.max(0, i - 1)]
      const b = curve[Math.min(curve.length - 1, i + 1)]
      let nx = -(b[1] - a[1])
      let nz = b[0] - a[0]
      const len = Math.hypot(nx, nz) || 1
      nx /= len
      nz /= len
      const away: Vec2 = [pt[0] - other[i][0], pt[1] - other[i][1]]
      const sign = nx * away[0] + nz * away[1] >= 0 ? 1 : -1
      return [nx * sign, 0, nz * sign]
    })

  const faceN = curveNormals(face, back)
  const backN = curveNormals(back, face)
  const up: V3 = [0, 1, 0]
  const down: V3 = [0, -1, 0]
  const at = (pt: Vec2, y: number): V3 => [pt[0], y, pt[1]]

  for (let i = 0; i < count - 1; i++) {
    const [s0, s1] = [sValues[i], sValues[i + 1]]
    const [f0, f1, b0, b1] = [face[i], face[i + 1], back[i], back[i + 1]]
    // Lico i tył: u = współrzędna wzdłuż frontu, v = wysokość (usłojenie pionowo).
    quad([at(f0, 0), at(f1, 0), at(f1, H), at(f0, H)], [faceN[i], faceN[i + 1], faceN[i + 1], faceN[i]], [
      [s0, 0],
      [s1, 0],
      [s1, H],
      [s0, H],
    ])
    quad([at(b0, 0), at(b1, 0), at(b1, H), at(b0, H)], [backN[i], backN[i + 1], backN[i + 1], backN[i]], [
      [s0, 0],
      [s1, 0],
      [s1, H],
      [s0, H],
    ])
    // Krawędź górna i dolna.
    for (const [y, n] of [
      [H, up],
      [0, down],
    ] as const) {
      quad([at(f0, y), at(f1, y), at(b1, y), at(b0, y)], [n, n, n, n], [
        [s0, 0],
        [s1, 0],
        [s1, g],
        [s0, g],
      ])
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
    quad([at(face[i], 0), at(back[i], 0), at(back[i], H), at(face[i], H)], [n, n, n, n], [
      [0, 0],
      [g, 0],
      [g, H],
      [0, H],
    ])
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
    uvs: new Float32Array(uvs),
    min,
    max,
  }
}
