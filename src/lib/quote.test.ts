import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIGURATION } from './calculate'
import { addItem, cartLines, setUnitPrice, updateItem } from './cart'
import { acceptMailto, pln, quoteTotals } from './quote'

const cfg = { ...DEFAULT_CONFIGURATION, typeId: 'narozne' as const, materialId: 'lakierowane' as const, radiusMm: 300, heightMm: 1000 }

describe('wycena biura', () => {
  it('ręczna cena zastępuje cennik, a zmiana frontu przywraca cennik', () => {
    let cart = addItem([], cfg, 2)
    const id = cart[0].id
    const listPrice = cartLines(cart)[0].unitNet
    expect(listPrice).toBeGreaterThan(0)

    cart = setUnitPrice(cart, id, 1000)
    expect(cartLines(cart)[0]).toMatchObject({ unitNet: 1000, net: 2000 })

    expect(cartLines(setUnitPrice(cart, id, null))[0].unitNet).toBe(listPrice)
    expect(cartLines(updateItem(cart, id, { ...cfg, heightMm: 1200 }))[0].item.unitPrice).toBeUndefined()
  })

  it('liczy rabat, VAT i brutto', () => {
    const cart = setUnitPrice(addItem([], cfg, 2), addItem([], cfg)[0].id, null)
    const lines = cartLines(setUnitPrice(cart, cart[0].id, 1000))
    expect(quoteTotals(lines, 10)).toEqual({ net: 2000, discountPct: 10, discount: 200, netAfter: 1800, vat: 414, gross: 2214 })
    expect(quoteTotals(lines, 0).discount).toBe(0)
    expect(quoteTotals([], 0).net).toBeNull()
  })

  it('formatuje kwoty i link potwierdzenia jak w mailu', () => {
    expect(pln(12345)).toBe('12 345 PLN')
    expect(pln(1800.5)).toBe('1 800,50 PLN')
    const href = decodeURIComponent(acceptMailto('ZP/2026/0017', quoteTotals([], 0), 'Meble Kowalski'))
    expect(href).toContain('subject=Potwierdzam wycenę nr ZP/2026/0017')
    expect(href).toContain('Meble Kowalski')
  })
})
