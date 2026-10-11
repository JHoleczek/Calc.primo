// Cennik frontów giętych [zł za m² powierzchni rozwiniętej po licu zewnętrznym].
// Klient nie widzi cen ani m² – trafiają tylko do biura w zapytaniu o wycenę.
// null = cena jeszcze nieustalona (pozycja do indywidualnej wyceny).

export interface MaterialPrices {
  /** Lico gładkie (FG). */
  smooth: number | null
  /** Lico ryflowane. */
  fluted: number | null
  /** Ryflowania z osobną stawką. */
  flutedSpecial?: Record<string, number>
  /** Wykonanie surowe (bez wykończenia) – z cennika, na razie niewybierane w kalkulatorze. */
  raw?: number
}

/** Klucz stawki: lakier, fornir dębowy, fornir orzechowy, laminat. */
export type PriceKey = 'lakierowane' | 'dab' | 'orzech' | 'laminat'

// Cennik szefa (cennik_giete.xlsx, październik 2026). Stawki netto.
export const PRICES_PER_M2: Record<PriceKey, MaterialPrices> = {
  lakierowane: { smooth: 1800, fluted: 2600, flutedSpecial: { FR07: 2750, FR12: 2750 }, raw: 1200 },
  dab: { smooth: 2700, fluted: 3100, flutedSpecial: { FR07: 3250, FR12: 3250 }, raw: 2000 },
  orzech: { smooth: 2850, fluted: 3200, flutedSpecial: { FR07: 3450, FR12: 3450 }, raw: 2100 },
  // Tylko gładki; sam laminat kupuje / pokrywa klient.
  laminat: { smooth: 2600, fluted: null },
}

/** Fornir bejcowany: dopłata do stawki [zł/m²] (gładki i ryflowany). */
export const STAIN_SURCHARGE_PER_M2 = 100

/** Dopłata za wysokość H powyżej TALL_HEIGHT_MM. */
export const TALL_SURCHARGE = 0.3

/** Dopłata za bryłę (front + środek). */
export const BODY_SURCHARGE = 0.25

/**
 * Czy stawki powyżej są netto (do ceny doliczany VAT) czy brutto.
 * Potwierdzone przez szefa: netto. W ofercie od tego zależy wyliczenie VAT i kwoty brutto.
 */
export const PRICE_BASIS: 'netto' | 'brutto' = 'netto'

