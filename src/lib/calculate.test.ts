import { describe, expect, it } from 'vitest'
import { allowedRadius, calculate, DEFAULT_CONFIGURATION, type Configuration } from './calculate'

const base: Configuration = { ...DEFAULT_CONFIGURATION, heightMm: 1000, materialId: 'fornirowane' }
const quarter = (r: number) => (Math.PI * r) / 2

describe('calculate', () => {
  it('narożne N0/N1/N2: łuk 90° po zewnętrznej + przedłużenia 50 mm', () => {
    const n0 = calculate({ ...base, typeId: 'narozne', radiusMm: 300, endingId: 'n0' })
    expect(n0.code).toBe('EG-N0-R300')
    expect(n0.developedMm).toBeCloseTo(quarter(300))
    expect(n0.areaM2).toBeCloseTo(quarter(300) / 1000)

    const n2 = calculate({ ...base, typeId: 'narozne', radiusMm: 50, endingId: 'n2' })
    expect(n2.code).toBe('EG-N2-R050')
    expect(n2.developedMm).toBeCloseTo(quarter(50) + 100)
    expect(n2.linearM).toBeCloseTo((quarter(50) + 100) / 1000)
  })

  it('przedłużane: łuk + prosty odcinek L − R', () => {
    const r = calculate({ ...base, typeId: 'przedluzane', radiusMm: 300, lengthMm: 700 })
    expect(r.code).toBe('EG-N1-R300-L700')
    expect(r.straightMm).toBe(400)
    expect(r.developedMm).toBeCloseTo(quarter(300) + 400)
    expect(calculate({ ...base, typeId: 'przedluzane', radiusMm: 600, lengthMm: 620 }).errors).toHaveLength(1)
  })

  it('obustronne: dwa łuki R100, środek W − 200, boki Z − R', () => {
    const w = calculate({ ...base, typeId: 'obustronne', radiusMm: 100, widthMm: 600 })
    expect(w.code).toBe('EG-D-R100-W600')
    expect(w.developedMm).toBeCloseTo(2 * quarter(100) + 400)

    const z = calculate({ ...base, typeId: 'obustronne', radiusMm: 100, widthMm: 800, sideExtension: true, zMm: 200 })
    expect(z.code).toBe('EG-D-R100-W800-Z200')
    expect(z.developedMm).toBeCloseTo(2 * quarter(100) + 600 + 200)
  })

  it('w łuk: półokrąg', () => {
    const r = calculate({ ...base, typeId: 'luk', radiusMm: 300 })
    expect(r.code).toBe('EG-P-R300')
    expect(r.developedMm).toBeCloseTo(Math.PI * 300)
  })

  it('bryła: wycena indywidualna bez kodu i obliczeń', () => {
    const r = calculate({ ...base, typeId: 'bryla' })
    expect(r.individual).toBe(true)
    expect(r.code).toBeNull()
    expect(r.developedMm).toBe(0)
  })

  it('dociąga promień do listy katalogowej typu', () => {
    expect(allowedRadius('luk', 50)).toBe(200)
    expect(allowedRadius('obustronne', 450)).toBe(100)
    expect(allowedRadius('narozne', 350)).toBe(350)
  })

  it('wymaga koloru dla lakierowanych i pilnuje wysokości', () => {
    expect(calculate({ ...base, materialId: 'lakierowane', color: ' ' }).errors).toHaveLength(1)
    expect(calculate({ ...base, materialId: 'lakierowane', color: 'RAL 9010' }).errors).toEqual([])
    expect(calculate({ ...base, heightMm: 3300 }).errors).toHaveLength(1)
  })
})
