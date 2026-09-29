import { describe, expect, it } from 'vitest'
import { calculate, DEFAULT_CONFIGURATION, type Configuration } from './calculate'
import { priceLine } from './pricing'

const lak: Configuration = { ...DEFAULT_CONFIGURATION, typeId: 'narozne', radiusMm: 300, heightMm: 1000, materialId: 'lakierowane', color: 'RAL 9010' }
const area = (Math.PI * 300) / 2 / 1000
const price = (c: Configuration, qty = 1) => priceLine(c, calculate(c), qty)

describe('cennik', () => {
  it('lakier: gładki 2000, ryflowany 2600, F07/F08 2750 zł/m²', () => {
    expect(price(lak).rate).toBe(2000)
    expect(price(lak).unitPrice).toBe(Math.round(area * 2000))
    expect(price({ ...lak, flutingId: 'F03' }).rate).toBe(2600)
    expect(price({ ...lak, flutingId: 'F07' }).rate).toBe(2750)
    expect(price({ ...lak, flutingId: 'F08' }).rate).toBe(2750)
    expect(price(lak, 3).total).toBe(Math.round(area * 2000) * 3)
  })

  it('bryła +25%', () => {
    expect(price({ ...lak, body: true }).rate).toBeCloseTo(2500)
  })

  it('fornir i laminat – cena do ustalenia; H > 2780 dopisuje +30%', () => {
    expect(price({ ...lak, materialId: 'fornirowane' }).total).toBeNull()
    const tall = price({ ...lak, materialId: 'laminat', heightMm: 3000, body: true })
    expect(tall.total).toBeNull()
    expect(tall.surcharges.map((s) => s.rate)).toEqual([0.3, 0.25])
  })
})
