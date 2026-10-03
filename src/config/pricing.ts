// Cennik frontów giętych [zł za m² powierzchni rozwiniętej po licu zewnętrznym].
// Klient nie widzi cen ani m² – trafiają tylko do biura w zapytaniu o wycenę.
// null = cena jeszcze nieustalona (pozycja do indywidualnej wyceny).

import type { MaterialId } from './catalog'

export interface MaterialPrices {
  /** Lico gładkie (FG). */
  smooth: number | null
  /** Lico ryflowane. */
  fluted: number | null
  /** Ryflowania z osobną stawką. */
  flutedSpecial?: Record<string, number>
}

export const PRICES_PER_M2: Record<MaterialId, MaterialPrices> = {
  lakierowane: { smooth: 2000, fluted: 2600, flutedSpecial: { FR07: 2750, FR08: 2750 } },
  // Do ustalenia z szefem:
  fornirowane: { smooth: null, fluted: null },
  laminat: { smooth: null, fluted: null },
}

/** Dopłata za wysokość H powyżej TALL_HEIGHT_MM. */
export const TALL_SURCHARGE = 0.3

/** Dopłata za bryłę (front + środek). */
export const BODY_SURCHARGE = 0.25
