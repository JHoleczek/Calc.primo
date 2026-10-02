import { DIM_ICONS } from '../config/dimIcons'

/** Skala ikon kart [px na punkt PDF] – wspólna, więc wszystkie ikony mają te same proporcje co w projekcie. */
const SCALE = 1.1

/**
 * Ikona karty wymiaru (wektor z projektu): szary kształt frontu, złoto – wymiar, który wpisujesz.
 * W ikonie przedłużeń złote końce pokazują się tylko po stronach, które mają przedłużenie.
 */
export function DimIcon({ name, left = true, right = true }: { name: keyof typeof DIM_ICONS; left?: boolean; right?: boolean }) {
  const icon = DIM_ICONS[name]
  const pad = 1
  return (
    <svg
      className="dim-icon"
      viewBox={`${-pad} ${-pad} ${icon.w + pad * 2} ${icon.h + pad * 2}`}
      width={(icon.w + pad * 2) * SCALE}
      height={(icon.h + pad * 2) * SCALE}
      aria-hidden="true"
      focusable="false"
    >
      {icon.parts.map(([part, d], i) => {
        const off = (part === 'left' && !left) || (part === 'right' && !right)
        const cls = part === 'base' ? 'dim-icon__base' : off ? 'dim-icon__off' : 'dim-icon__gold'
        return <path key={i} className={cls} d={d} />
      })}
    </svg>
  )
}
