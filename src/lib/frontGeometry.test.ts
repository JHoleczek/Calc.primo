import { describe, expect, it } from 'vitest'
import { buildFrontGeometry, flutingDepth } from './frontGeometry'
import { resolvePaintColor } from './paintColor'

const base = {
  radiusMm: 300,
  angleDeg: 90,
  convex: true,
  thicknessMm: 19,
  heightMm: 720,
  extensionLeftMm: 0,
  extensionRightMm: 0,
}

describe('buildFrontGeometry', () => {
  it('buduje łuk o zadanym promieniu i wysokości', () => {
    const g = buildFrontGeometry(base)
    expect(g.positions.length % 9).toBe(0)
    expect(g.normals.length).toBe(g.positions.length)
    expect(g.min[1]).toBeCloseTo(0)
    expect(g.max[1]).toBeCloseTo(0.72)
    // R to promień zewnętrzny: najdalszy punkt w osi Z leży w odległości R.
    expect(g.max[2]).toBeCloseTo(0.3, 3)
    // Łuk 90° symetryczny: X od -R·sin45° do +R·sin45°.
    expect(g.max[0]).toBeCloseTo(0.3 * Math.SQRT1_2, 3)
    expect(g.min[0]).toBeCloseTo(-0.3 * Math.SQRT1_2, 3)
  })

  it('dokłada przedłużenia styczne do łuku', () => {
    const g = buildFrontGeometry({ ...base, angleDeg: 180, extensionLeftMm: 200, extensionRightMm: 200 })
    // Półłuk: przedłużenia biegną w stronę -Z od końców łuku.
    expect(g.min[2]).toBeCloseTo(-0.2, 3)
    expect(g.max[0]).toBeCloseTo(0.3, 3)
  })

  it('ryflowanie nie przebija frontu', () => {
    const g = buildFrontGeometry({
      ...base,
      fluting: { shape: 'square', widthMm: 10, pitchMm: 20, depthMm: 50 },
    })
    expect(g.max[2]).toBeCloseTo(0.3, 3)
    expect(g.positions.every(Number.isFinite)).toBe(true)
  })
})

describe('flutingDepth', () => {
  it('liczy profile rowków', () => {
    const round = { shape: 'round' as const, widthMm: 10, pitchMm: 20, depthMm: 5 }
    expect(flutingDepth(round, 0, 10)).toBeCloseTo(5)
    expect(flutingDepth(round, 6, 10)).toBe(0)
    expect(flutingDepth({ ...round, shape: 'v' }, 2.5, 10)).toBeCloseTo(2.5)
    expect(flutingDepth(round, 0, 3)).toBe(3)
  })
})

describe('resolvePaintColor', () => {
  it('rozpoznaje RAL, NCS, hex i nazwy', () => {
    expect(resolvePaintColor('RAL 9010')).toEqual({ hex: '#f4f0e6', source: 'RAL' })
    expect(resolvePaintColor('NCS S 0502-Y')?.source).toBe('NCS')
    expect(resolvePaintColor('s 1050-Y90R')?.source).toBe('NCS')
    expect(resolvePaintColor('#ABC')).toEqual({ hex: '#aabbcc', source: 'hex' })
    expect(resolvePaintColor('grafit mat')?.source).toBe('nazwa')
    expect(resolvePaintColor('coś dziwnego')).toBeNull()
  })
})
