// Rysunki techniczne i zdjęcia z katalogu Primo (src/assets/catalog).
// Adresy generuje Vite; w buildzie SINGLE_FILE obrazki są wstawiane inline.

import type { FrontTypeId } from './catalog'

const files = import.meta.glob('../assets/catalog/*.{webp,png}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** Rysunek katalogowy po nazwie pliku (bez rozszerzenia), np. „F03”, „N1”, „EG-P-R300”. */
export const catalogImage = (name: string): string | undefined => files[`../assets/catalog/${name}.webp`]

/** Poglądowy rysunek każdego typu frontu. */
export const TYPE_IMAGES: Record<FrontTypeId, string> = {
  narozne: 'EG-N2-R300',
  przedluzane: 'EG-N1-R300-L700',
  obustronne: 'EG-D-R100-W600-Z200',
  luk: 'EG-P-R300',
}

/** Rysunek elementu przedłużanego dla danego R (dla R50 katalog ma wariant EG-N2-R050-L700). */
export const extendedImage = (radiusMm: number) =>
  catalogImage(radiusMm === 50 ? 'EG-N2-R050-L700' : `EG-N1-R${String(radiusMm).padStart(3, '0')}-L700`)

export const CTA_IMAGE = files['../assets/catalog/cta.png']
