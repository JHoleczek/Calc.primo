import { describe, expect, it } from 'vitest'
import { buildFrontGeometry, flutingDepth } from './frontGeometry'
import { frontPath, pathLength, walkPath, type ShapeParams } from './frontPath'
import { resolvePaintColor } from './paintColor'

const shape: ShapeParams = {
  typeId: 'narozne',
  radiusMm: 300,
  endingId: 'n0',
  lengthMm: 700,
  widthMm: 600,
  sideExtension: false,
  zMm: 200,
}

describe('frontPath', () => {
  it('narożnik N1 ma przedłużenie na końcu łuku (w dół)', () => {
    const w = walkPath(frontPath({ ...shape, endingId: 'n1' })!)
    expect(w.map((s) => s.segment.kind)).toEqual(['arc', 'line'])
    expect(w[1].headingStart).toBe(90)
    expect(w[1].end[0]).toBeCloseTo(300)
    expect(w[1].end[1]).toBeCloseTo(350)
  })

  it('obustronne W600 ma gabaryt 600 × R', () => {
    const w = walkPath(frontPath({ ...shape, typeId: 'obustronne', radiusMm: 100 })!)
    const xs = w.flatMap((s) => [s.start[0], s.end[0]])
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(600)
  })

  it('bryła nie ma kształtu', () => {
    expect(frontPath({ ...shape, typeId: 'bryla' })).toBeNull()
  })
})

describe('buildFrontGeometry', () => {
  const path = frontPath(shape)!

  it('buduje łuk 90° o promieniu zewnętrznym R, licem do oglądającego', () => {
    const g = buildFrontGeometry({ path, thicknessMm: 18, heightMm: 720 })
    expect(g.positions.length % 9).toBe(0)
    expect(g.normals.length).toBe(g.positions.length)
    expect(g.min[1]).toBeCloseTo(0)
    expect(g.max[1]).toBeCloseTo(0.72)
    // Po obrocie łuk jest symetryczny względem osi Z: cięciwa ćwiartki = R·√2.
    expect(g.max[0] - g.min[0]).toBeCloseTo(0.3 * Math.SQRT2, 3)
    expect(g.max[0]).toBeCloseTo(-g.min[0], 3)
  })

  it('ryflowanie nie przebija frontu', () => {
    const g = buildFrontGeometry({
      path,
      thicknessMm: 18,
      heightMm: 720,
      fluting: { shape: 'square', widthMm: 10, pitchMm: 20, depthMm: 50 },
    })
    expect(g.positions.every(Number.isFinite)).toBe(true)
    expect(pathLength(path)).toBeCloseTo((Math.PI * 300) / 2)
  })
})

describe('flutingDepth', () => {
  it('liczy profile rowków', () => {
    const round = { shape: 'round' as const, widthMm: 10, pitchMm: 20, depthMm: 5 }
    expect(flutingDepth(round, 0, 10)).toBeCloseTo(5)
    expect(flutingDepth(round, 6, 10)).toBe(0)
    expect(flutingDepth({ ...round, shape: 'v' }, 2.5, 10)).toBeCloseTo(2.5)
    expect(flutingDepth({ ...round, shape: 'u' }, 0, 10)).toBeCloseTo(5)
    expect(flutingDepth({ ...round, shape: 'u' }, 4.99, 10)).toBeLessThan(1)
    expect(flutingDepth({ ...round, shape: 'rib', pitchMm: 10 }, 0, 10)).toBe(0)
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
