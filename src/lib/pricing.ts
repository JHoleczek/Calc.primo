import { MATERIALS, SMOOTH_FLUTING_ID, TALL_HEIGHT_MM, VENEERS } from '../config/catalog'
import { BODY_SURCHARGE, PRICES_PER_M2, STAIN_SURCHARGE_PER_M2, TALL_SURCHARGE, type PriceKey } from '../config/pricing'
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
  const veneer = VENEERS.find((v) => v.id === config.veneerId) ?? VENEERS[0]
  const veneered = material.id === 'fornirowane'
  const key: PriceKey =
    material.id === 'fornirowane' ? (veneer.id === 'orzech' ? 'orzech' : 'dab') : material.id
  const prices = PRICES_PER_M2[key]
  const fluted = result.flutingCode !== SMOOTH_FLUTING_ID
  const special = fluted ? prices.flutedSpecial?.[result.flutingCode] : undefined
  const listRate = special ?? (fluted ? prices.fluted : prices.smooth)
  // Bejca: stała dopłata do stawki za m² (przed dopłatami procentowymi).
  const stain = veneered && veneer.stained ? STAIN_SURCHARGE_PER_M2 : 0
  const baseRate = listRate === null ? null : listRate + stain
  const baseLabel = `${veneered ? `Fornir ${veneer.name.toLowerCase()}` : material.name} ${fluted ? `ryflowany ${result.flutingCode}` : 'gładki'}`

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
