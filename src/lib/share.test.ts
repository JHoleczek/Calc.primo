import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIGURATION } from './calculate'
import { configFromHash, offerCode, offerFromHash, planLink } from './share'

describe('link do rzutu', () => {
  it('koduje i odtwarza konfigurację (z polskimi znakami)', () => {
    const cfg = { ...DEFAULT_CONFIGURATION, radiusMm: 450, extLeftMm: 30, color: 'dąb żółty', body: true }
    const url = planLink(cfg, 'https://primomeble.pl/kalkulator/#stare')
    expect(url.startsWith('https://primomeble.pl/kalkulator/#rzut=')).toBe(true)
    expect(configFromHash(url.slice(url.indexOf('#')))).toEqual(cfg)
    expect(configFromHash('#cos-innego')).toBeNull()
    expect(configFromHash('#rzut=%%%')).toBeNull()
  })
})

describe('link do oferty', () => {
  it('koduje kontakt i pozycje, numer dopisuje serwer', () => {
    const a = { ...DEFAULT_CONFIGURATION, radiusMm: 450, color: 'dąb' }
    const b = { ...DEFAULT_CONFIGURATION, typeId: 'obustronne' as const, radiusMm: 100, sideExtension: true, zMm: 150 }
    const contact = { phone: '600 100 200', email: 'jan@example.com', company: 'Kowalski sp. z o.o.', notes: 'Pilne' }
    const code = offerCode([{ config: a, qty: 2 }, { config: b, qty: 1 }], contact)
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    const data = offerFromHash(`#oferta=${code}&nr=${encodeURIComponent('ZP/2026/0012')}`)
    expect(data?.number).toBe('ZP/2026/0012')
    expect(data?.contact).toEqual(contact)
    expect(data?.items).toEqual([{ config: a, qty: 2 }, { config: b, qty: 1 }])
    expect(offerFromHash('#oferta=%%%')).toBeNull()
    expect(offerFromHash('#rzut=abc')).toBeNull()
  })
})
