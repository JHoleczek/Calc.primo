import { ENDINGS, type EndingId } from '../config/catalog'

interface Props {
  endingId: EndingId
  /** Długości przedłużeń [mm]; 0 = brak (rysowane jako kontur przerywany). */
  leftMm: number
  rightMm: number
}

/**
 * Ikona zakończenia narożnika w stylu rysunków katalogowych: łuk 90°, przedłużenie
 * lewe (poziome) i prawe (pionowe). Obecne przedłużenia są wypełnione i opisane
 * długością, brakujące – tylko zaznaczone przerywanym konturem.
 */
export function EndingIcon({ endingId, leftMm, rightMm }: Props) {
  const ending = ENDINGS.find((e) => e.id === endingId) ?? ENDINGS[0]
  const hasLeft = leftMm > 0
  const hasRight = rightMm > 0
  const sides = [hasLeft && `lewe ${leftMm} mm`, hasRight && `prawe ${rightMm} mm`].filter(Boolean).join(', ')
  return (
    <figure className="ending-icon">
      <svg viewBox="0 0 210 200" role="img" aria-label={`${ending.name} – ${sides ? `przedłużenie ${sides}` : ending.description.toLowerCase()}`}>
        <path className="ending-icon__arc" d="M 60 26 A 100 100 0 0 1 160 126 L 148 126 A 88 88 0 0 0 60 38 Z" />
        <rect className={hasLeft ? 'ending-icon__ext' : 'ending-icon__ghost'} x={12} y={26} width={48} height={12} />
        <rect className={hasRight ? 'ending-icon__ext' : 'ending-icon__ghost'} x={148} y={126} width={12} height={48} />
        {hasLeft && (
          <text className="ending-icon__dim" x={36} y={16}>
            {leftMm}
          </text>
        )}
        {hasRight && (
          <text className="ending-icon__dim" x={184} y={154}>
            {rightMm}
          </text>
        )}
      </svg>
      <figcaption>
        <strong>{ending.name}</strong> · {ending.description}
      </figcaption>
    </figure>
  )
}
