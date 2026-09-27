import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIGURATION } from './calculate'
import { exportPlanSvg } from './planExport'

describe('eksport rysunku technicznego', () => {
  it('samodzielny SVG z tłem, stylami, wymiarami i tabliczką', () => {
    const file = exportPlanSvg({ ...DEFAULT_CONFIGURATION, endingId: 'n2', radiusMm: 300 }, 'EG-N2-R300 F00', 'Narożne', 1, renderToStaticMarkup)
    expect(file.svg.startsWith('<?xml')).toBe(true)
    expect(file.svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(file.svg).toContain('<style>')
    expect(file.svg).toContain('R300')
    expect(file.svg).toContain('EG-N2-R300 F00')
    expect(file.width).toBe(1600)
    expect(file.height).toBeGreaterThan(100)

    const png = exportPlanSvg({ ...DEFAULT_CONFIGURATION }, 't', 's', 2, renderToStaticMarkup)
    expect(png.width).toBe(3200)
    expect(png.svg).toContain('stroke-width: 2.4px')
  })
})
