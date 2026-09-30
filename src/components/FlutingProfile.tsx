import type { FlutingProfile as Profile } from '../config/catalog'

const BOARD = 18 // grubość płyty [mm]

/**
 * Przekrój płyty z frezem (widok z boku): szary kształt z jasnym konturem.
 * Rysowany z wymiarów profilu z katalogu – każdy wzór ma swój kształt.
 */
export function FlutingProfile({ profile }: { profile?: Profile }) {
  const W = profile ? Math.max(profile.pitchMm * 3, 48) : 48
  // Gładki (bez profilu): prosty prostokąt.
  let top = `M 0 0 L ${W} 0`
  if (profile) {
    const { shape, widthMm: w, pitchMm: p, depthMm: d } = profile
    const count = Math.max(1, Math.floor(W / p))
    const first = (W - (count - 1) * p) / 2
    const parts: string[] = []
    for (let i = 0; i < count; i++) {
      const c = first + i * p
      const a = c - w / 2
      const b = c + w / 2
      switch (shape) {
        case 'square':
          parts.push(`L ${a} 0 L ${a} ${d} L ${b} ${d} L ${b} 0`)
          break
        case 'v':
          parts.push(`L ${a} 0 L ${c} ${d} L ${b} 0`)
          break
        case 'u': {
          const r = Math.min(w / 2, d)
          parts.push(`L ${a} 0 L ${a} ${d - r} A ${w / 2} ${r} 0 0 0 ${b} ${d - r} L ${b} 0`)
          break
        }
        case 'round': {
          const R = (w * w) / 4 / (2 * d) + d / 2
          parts.push(`L ${a} 0 A ${R} ${R} 0 0 0 ${b} 0`)
          break
        }
        case 'rib': {
          // Wałki wystają ponad lico: podstawa na głębokości d, łuk w górę.
          const R = (w * w) / 4 / (2 * d) + d / 2
          parts.push(`L ${a} ${d} A ${R} ${R} 0 0 1 ${b} ${d}`)
          break
        }
      }
    }
    const startY = profile.shape === 'rib' ? profile.depthMm : 0
    top = `M 0 ${startY} ${parts.join(' ')} L ${W} ${startY}`
  }
  const d = `${top} L ${W} ${BOARD} L 0 ${BOARD} Z`
  const pad = 1
  return (
    <svg className="fluting-profile" viewBox={`${-pad} ${-pad} ${W + pad * 2} ${BOARD + pad * 2}`} aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  )
}
