// Ikony z design systemu (primo_calc_design-system.pdf) – wycięte 1:1, przezroczyste tło.
// Adresy generuje Vite; w buildzie SINGLE_FILE obrazki są wstawiane inline.

import type { FrontTypeId } from './catalog'

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
