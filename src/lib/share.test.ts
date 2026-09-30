import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIGURATION } from './calculate'
import { configFromHash, planLink } from './share'

describe('link do rzutu', () => {
  it('koduje i odtwarza konfigurację (z polskimi znakami)', () => {
    const cfg = { ...DEFAULT_CONFIGURATION, radiusMm: 450, extLeftMm: 30, color: 'dąb żółty', body: true }
    const url = planLink(cfg, 'https://jholeczek.github.io/Calc.primo/#stare')
    expect(url.startsWith('https://jholeczek.github.io/Calc.primo/#rzut=')).toBe(true)
    expect(configFromHash(url.slice(url.indexOf('#')))).toEqual(cfg)
    expect(configFromHash('#cos-innego')).toBeNull()
    expect(configFromHash('#rzut=%%%')).toBeNull()
  })
})
