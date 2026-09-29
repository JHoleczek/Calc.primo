import { MATERIALS, SMOOTH_FLUTING_ID, TALL_HEIGHT_MM } from '../config/catalog'
import { BODY_SURCHARGE, PRICES_PER_M2, TALL_SURCHARGE } from '../config/pricing'
import { isTall, type Configuration, type Result } from './calculate'

// Wycena pozycji – tylko do wiadomości dla biura (klient nie widzi cen ani m²).

export interface Surcharge {
  label: string
  /** Np. 0.3 = +30 %. */
  rate: number
}

export interface LinePrice {
  /** Stawka bazowa [zł/m²]; null = cena do ustalenia. */
  baseRate: number | null
  baseLabel: string
  surcharges: Surcharge[]
  /** Stawka po dopłatach [zł/m²]. */
  rate: number | null
  /** Cena 1 szt. [zł], zaokrąglona do złotówki. */
  unitPrice: number | null
  /** Cena pozycji (× ilość) [zł]. */
  total: number | null
  /** Powód braku ceny. */
  missing?: string
}

/** Dopłaty są mnożone kolejno (np. H > 2780 i bryła: × 1,30 × 1,25). */
export function priceLine(config: Configuration, result: Result, qty: number): LinePrice {
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]
  const prices = PRICES_PER_M2[material.id]
  const fluted = result.flutingCode !== SMOOTH_FLUTING_ID
  const special = fluted ? prices.flutedSpecial?.[result.flutingCode] : undefined
  const baseRate = special ?? (fluted ? prices.fluted : prices.smooth)
  const baseLabel = `${material.name} ${fluted ? `ryflowany ${result.flutingCode}` : 'gładki'}`

  const surcharges: Surcharge[] = []
  if (isTall(config.heightMm)) surcharges.push({ label: `H > ${TALL_HEIGHT_MM} mm`, rate: TALL_SURCHARGE })
  if (config.body) surcharges.push({ label: 'bryła', rate: BODY_SURCHARGE })

  if (result.errors.length > 0) {
    return { baseRate, baseLabel, surcharges, rate: null, unitPrice: null, total: null, missing: 'błąd konfiguracji' }
  }
  if (baseRate === null) {
    return { baseRate, baseLabel, surcharges, rate: null, unitPrice: null, total: null, missing: `brak stawki: ${baseLabel.toLowerCase()}` }
  }
  const rate = surcharges.reduce((r, s) => r * (1 + s.rate), baseRate)
  const unitPrice = Math.round(result.areaM2 * rate)
  return { baseRate, baseLabel, surcharges, rate, unitPrice, total: unitPrice * qty }
}
