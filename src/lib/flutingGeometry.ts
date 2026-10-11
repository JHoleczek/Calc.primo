import type { FlutingProfile as Profile } from '../config/catalog'

// Geometria przekroju ryflowania – wspólna dla kafelków i rysunku wymiarowego.

const BOARD = 18 // grubość płyty [mm]

/** Środki rowków / wałków na wycinku o szerokości `width` (wzór wyśrodkowany). */
export function grooveCenters(profile: Profile, width: number): number[] {
  const count = Math.max(1, Math.floor(width / profile.pitchMm))
  const first = (width - (count - 1) * profile.pitchMm) / 2
  return Array.from({ length: count }, (_, i) => first + i * profile.pitchMm)
}

/** Obrys przekroju płyty z frezem: wierzch według profilu (bez profilu – gładki), dół płaski. */
export function profileOutline(profile: Profile | undefined, width: number, board = BOARD): string {
  let top = `M 0 0 L ${width} 0`
  if (profile) {
    const { shape, widthMm: w, depthMm: d } = profile
    const parts = grooveCenters(profile, width).map((c) => {
      const a = c - w / 2
      const b = c + w / 2
      switch (shape) {
        case 'square':
          return `L ${a} 0 L ${a} ${d} L ${b} ${d} L ${b} 0`
        case 'v':
          return `L ${a} 0 L ${c} ${d} L ${b} 0`
        case 'u': {
          const r = Math.min(w / 2, d)
          return `L ${a} 0 L ${a} ${d - r} A ${w / 2} ${r} 0 0 0 ${b} ${d - r} L ${b} 0`
        }
        case 'round': {
          const R = (w * w) / 4 / (2 * d) + d / 2
          return `L ${a} 0 A ${R} ${R} 0 0 0 ${b} 0`
        }
        case 'rib': {
          // Wałki wystają ponad lico: podstawa na głębokości d, łuk w górę.
          const R = (w * w) / 4 / (2 * d) + d / 2
          return `L ${a} ${d} A ${R} ${R} 0 0 1 ${b} ${d}`
        }
      }
    })
    const startY = shape === 'rib' ? d : 0
    top = `M 0 ${startY} ${parts.join(' ')} L ${width} ${startY}`
  }
  return `${top} L ${width} ${board} L 0 ${board} Z`
}
