// Zdjęcie z katalogu Primo (src/assets/catalog) oraz ikony z design systemu.

import type { FrontTypeId } from './catalog'
// Adresy generuje Vite; w buildzie SINGLE_FILE obrazki są wstawiane inline.

const files = import.meta.glob('../assets/catalog/*.{webp,png}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export const CTA_IMAGE = files['../assets/catalog/cta.png']

// Ikony z design systemu (primo_calc_design-system.pdf) – wycięte 1:1, przezroczyste tło.
const icons = import.meta.glob('../assets/icons/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
const icon = (name: string) => icons[`../assets/icons/${name}.webp`]

export const TYPE_ICONS: Record<FrontTypeId, string> = {
  narozne: icon('type-narozne'),
  przedluzane: icon('type-przedluzane'),
  obustronne: icon('type-obustronne'),
  luk: icon('type-luk'),
}

export const HEIGHT_ICON = icon('height')

/** Zakończenie: złote przedłużenie tam, gdzie jest wpisane, przerywany kontur tam, gdzie go brak. */
export const endingIconFor = (hasLeft: boolean, hasRight: boolean) =>
  icon(hasLeft && hasRight ? 'ending-n2' : hasLeft ? 'ending-n1-left' : hasRight ? 'ending-n1-right' : 'ending-n0')
