// Rysunki ryflowań i zdjęcie z katalogu Primo (src/assets/catalog).
// Adresy generuje Vite; w buildzie SINGLE_FILE obrazki są wstawiane inline.

const files = import.meta.glob('../assets/catalog/*.{webp,png}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** Rysunek katalogowy po nazwie pliku (bez rozszerzenia), np. „F03”. */
export const catalogImage = (name: string): string | undefined => files[`../assets/catalog/${name}.webp`]

export const CTA_IMAGE = files['../assets/catalog/cta.png']
