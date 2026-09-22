import { describe, expect, it } from 'vitest'
import { calculate, DEFAULT_CONFIGURATION, type Configuration } from './calculate'

const base: Configuration = {
  ...DEFAULT_CONFIGURATION,
  frontTypeId: 'FG-90-W',
  radiusMm: 300,
  heightMm: 1000,
  endingId: 'n0',
  materialId: 'fornirowane',
}

describe('calculate', () => {
  it('liczy łuk 90° po stronie wewnętrznej i zewnętrznej', () => {
    const r = calculate(base)
    expect(r.inner.arcMm).toBeCloseTo((Math.PI * 300) / 2)
    expect(r.outer.arcMm).toBeCloseTo((Math.PI * 319) / 2)
    expect(r.outer.areaM2).toBeCloseTo((((Math.PI * 319) / 2) * 1000) / 1e6)
    expect(r.billed).toBe(r.outer)
    expect(r.errors).toEqual([])
  })

  it('dolicza przedłużenia N2 do rozwinięcia', () => {
    const r = calculate({ ...base, endingId: 'n2', extensionMm: 150 })
    expect(r.extensionsTotalMm).toBe(300)
    expect(r.inner.developedMm).toBeCloseTo((Math.PI * 300) / 2 + 300)
    expect(r.notes.some((n) => n.text.includes('2 × 150 mm'))).toBe(true)
  })

  it('ignoruje długość przedłużenia dla N0', () => {
    const r = calculate({ ...base, endingId: 'n0', extensionMm: 5000 })
    expect(r.extensionsTotalMm).toBe(0)
    expect(r.errors).toEqual([])
  })

  it('rozlicza po stronie wewnętrznej gdy wybrano', () => {
    const r = calculate({ ...base, measureSide: 'inner' })
    expect(r.billed).toBe(r.inner)
  })

  it('wymaga koloru dla frontów lakierowanych', () => {
    expect(calculate({ ...base, materialId: 'lakierowane', color: ' ' }).errors).toHaveLength(1)
    expect(calculate({ ...base, materialId: 'lakierowane', color: 'RAL 9010' }).errors).toEqual([])
  })

  it('waliduje zakres wysokości i ostrzega o ponadstandardowej', () => {
    expect(calculate({ ...base, heightMm: 50 }).errors).toHaveLength(1)
    expect(calculate({ ...base, heightMm: 3000 }).notes.some((n) => n.level === 'warning')).toBe(true)
  })
})
