import { describe, expect, it } from 'vitest'
import { allowedRadius, calculate, DEFAULT_CONFIGURATION, type Configuration } from './calculate'

const base: Configuration = { ...DEFAULT_CONFIGURATION, heightMm: 1000, materialId: 'fornirowane' }
const quarter = (r: number) => (Math.PI * r) / 2

describe('calculate', () => {
  it('narożne N0/N1/N2: łuk 90° po zewnętrznej + przedłużenia 50 mm', () => {
    const n0 = calculate({ ...base, typeId: 'narozne', radiusMm: 300, extLeftMm: 0, extRightMm: 0 })
    expect(n0.code).toBe('EG-N0-R300')
    expect(n0.developedMm).toBeCloseTo(quarter(300))
    expect(n0.areaM2).toBeCloseTo(quarter(300) / 1000)

    const n2 = calculate({ ...base, typeId: 'narozne', radiusMm: 50, extLeftMm: 50, extRightMm: 50 })
    expect(n2.code).toBe('EG-N2-R050')
    expect(n2.developedMm).toBeCloseTo(quarter(50) + 100)
    expect(n2.areaM2).toBeCloseTo(((quarter(50) + 100) * 1000) / 1e6)
  })

  it('m² = (łuk + przedłużenia) × H – przykład EG-N2-R300, H 472', () => {
    const r = calculate({ ...base, typeId: 'narozne', radiusMm: 300, extLeftMm: 50, extRightMm: 50, heightMm: 472 })
    expect(r.arcMm).toBeCloseTo(471.24, 1)
    expect(r.straightMm).toBe(100)
    expect(r.areaM2).toBeCloseTo(((quarter(300) + 100) * 472) / 1e6)
    expect(r.areaM2.toFixed(3)).toBe('0.270')
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

  it('laminat tylko gładki: ryflowanie wraca do F00', () => {
    const r = calculate({ ...base, materialId: 'laminat', flutingId: 'F03' })
    expect(r.flutingCode).toBe('F00')
    expect(calculate({ ...base, materialId: 'fornirowane', flutingId: 'F03' }).flutingCode).toBe('F03')
  })

  it('dociąga promień do listy katalogowej typu', () => {
    expect(allowedRadius('luk', 50)).toBe(200)
    expect(allowedRadius('luk', 400)).toBe(350)
    expect(allowedRadius('obustronne', 450)).toBe(100)
    expect(allowedRadius('narozne', 350)).toBe(350)
  })

  it('brak koloru przy lakierze to ostrzeżenie, a wynik jest liczony; pilnuje wysokości', () => {
    const noColor = calculate({ ...base, materialId: 'lakierowane', color: ' ' })
    expect(noColor.errors).toEqual([])
    expect(noColor.areaM2).toBeGreaterThan(0)
    expect(noColor.notes.some((n) => n.level === 'warning' && n.text.includes('kolor'))).toBe(true)
    const withColor = calculate({ ...base, materialId: 'lakierowane', color: 'RAL 9010' })
    expect(withColor.notes.some((n) => n.level === 'warning')).toBe(false)
    expect(calculate({ ...base, heightMm: 3300 }).errors).toHaveLength(1)
  })

  it('zakończenie wynika z przedłużeń: 0 i 0 → N0, jedno → N1, oba → N2; zakres 10–50 mm', () => {
    const narozne = { ...base, typeId: 'narozne' as const, radiusMm: 300 }
    expect(calculate(DEFAULT_CONFIGURATION).code).toBe('EG-N0-R300')
    const n0 = calculate({ ...narozne, extLeftMm: NaN, extRightMm: 0 })
    expect(n0.code).toBe('EG-N0-R300')
    expect(n0.straightMm).toBe(0)
    expect(n0.errors).toEqual([])

    const left = calculate({ ...narozne, extLeftMm: 30, extRightMm: 0 })
    expect(left.code).toBe('EG-N1-R300')
    expect(left.straightMm).toBe(30)
    expect(left.notes.some((n) => n.text.includes('przedłużenie lewe 30 mm'))).toBe(true)
    expect(calculate({ ...narozne, extLeftMm: 0, extRightMm: 45 }).code).toBe('EG-N1-R300')

    const n2 = calculate({ ...narozne, extLeftMm: 10, extRightMm: 50 })
    expect(n2.code).toBe('EG-N2-R300')
    expect(n2.straightMm).toBe(60)
    expect(n2.notes.some((n) => n.text.includes('lewe 10 mm, prawe 50 mm'))).toBe(true)

    expect(calculate({ ...narozne, extLeftMm: 5 }).errors[0]).toContain('lewe')
    expect(calculate({ ...narozne, extRightMm: 60 }).errors[0]).toContain('prawe')
  })

  it('H > 2780: tylko laminat gładki', () => {
    expect(calculate({ ...base, heightMm: 2800, materialId: 'lakierowane', color: 'RAL 9010' }).errors[0]).toContain('laminat')
    expect(calculate({ ...base, heightMm: 2800, materialId: 'laminat' }).errors).toEqual([])
    expect(calculate({ ...base, heightMm: 2780, materialId: 'lakierowane', color: 'RAL 9010' }).errors).toEqual([])
  })
})
