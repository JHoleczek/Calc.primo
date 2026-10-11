import { describe, expect, it } from 'vitest'
import { calculate, DEFAULT_CONFIGURATION, type Configuration } from './calculate'
import { priceLine } from './pricing'

const lak: Configuration = { ...DEFAULT_CONFIGURATION, typeId: 'narozne', radiusMm: 300, heightMm: 1000, materialId: 'lakierowane', color: 'RAL 9010' }
const area = (Math.PI * 300) / 2 / 1000
const price = (c: Configuration, qty = 1) => priceLine(c, calculate(c), qty)

describe('cennik (październik 2026, netto)', () => {
  it('lakier: gładki 1800, ryflowany 2600, FR07/FR12 2750 zł/m²', () => {
    expect(price(lak).rate).toBe(1800)
    expect(price(lak).unitPrice).toBe(Math.round(area * 1800))
    expect(price({ ...lak, flutingId: 'FR03' }).rate).toBe(2600)
    expect(price({ ...lak, flutingId: 'FR07' }).rate).toBe(2750)
    expect(price({ ...lak, flutingId: 'FR12' }).rate).toBe(2750)
    expect(price({ ...lak, flutingId: 'FR08' }).rate).toBe(2600)
    expect(price(lak, 3).total).toBe(Math.round(area * 1800) * 3)
  })

  it('fornir: dąb 2700 / 3100 / 3250, bejca +100 zł/m², orzech 2850 / 3200 / 3450', () => {
    const dab = { ...lak, materialId: 'fornirowane' as const, veneerId: 'dab' as const }
    expect(price(dab).rate).toBe(2700)
    expect(price({ ...dab, flutingId: 'FR03' }).rate).toBe(3100)
    expect(price({ ...dab, flutingId: 'FR12' }).rate).toBe(3250)
    expect(price({ ...dab, veneerId: 'dab-bejcowany' }).rate).toBe(2800)
    expect(price({ ...dab, veneerId: 'dab-bejcowany', flutingId: 'FR03' }).rate).toBe(3200)
    const orzech = { ...dab, veneerId: 'orzech' as const }
    expect(price(orzech).rate).toBe(2850)
    expect(price({ ...orzech, flutingId: 'FR01' }).rate).toBe(3200)
    expect(price({ ...orzech, flutingId: 'FR07' }).rate).toBe(3450)
  })

  it('laminat: 2600 zł/m², zawsze gładki', () => {
    expect(price({ ...lak, materialId: 'laminat', flutingId: 'FR03' }).rate).toBe(2600)
  })

  it('bryła +25%, H > 2780 +30% – dopłaty mnożone', () => {
    expect(price({ ...lak, body: true }).rate).toBeCloseTo(2250)
    const tall = price({ ...lak, materialId: 'laminat', heightMm: 3000, body: true })
    expect(tall.surcharges.map((s) => s.rate)).toEqual([0.3, 0.25])
    expect(tall.rate).toBeCloseTo(2600 * 1.3 * 1.25)
  })
})
