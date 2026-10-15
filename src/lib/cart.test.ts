import { describe, expect, it } from 'vitest'
import { quotePayload } from './sendQuote'
import { DEFAULT_CONFIGURATION } from './calculate'
import {
  addItem,
  cartLines,
  cartTotals,
  contactErrors,
  duplicateItem,
  inquiryText,
  loadCart,
  removeItem,
  setQty,
  updateItem,
} from './cart'

const cfg = { ...DEFAULT_CONFIGURATION, typeId: 'narozne' as const, radiusMm: 300, extLeftMm: 0, extRightMm: 0, heightMm: 1000 }

describe('koszyk', () => {
  it('dodaje, zmienia ilość, duplikuje, edytuje i usuwa', () => {
    let cart = addItem([], cfg)
    const id = cart[0].id
    cart = setQty(cart, id, 3)
    expect(cart[0].qty).toBe(3)
    expect(setQty(cart, id, 0)[0].qty).toBe(1)
    expect(setQty(cart, id, 5000)[0].qty).toBe(999)

    cart = duplicateItem(cart, id)
    expect(cart).toHaveLength(2)
    expect(cart[1].id).not.toBe(id)
    expect(cart[1].qty).toBe(3)

    cart = updateItem(cart, cart[1].id, { ...cfg, radiusMm: 600 })
    expect(cart[1].config.radiusMm).toBe(600)
    expect(cart[0].config.radiusMm).toBe(300)

    cart = removeItem(cart, id)
    expect(cart).toHaveLength(1)
    expect(cart[0].config.radiusMm).toBe(600)
  })

  it('sumuje sztuki i m² z uwzględnieniem ilości', () => {
    const cart = setQty(addItem([], cfg), addItem([], cfg)[0].id, 1)
    const two = setQty(cart, cart[0].id, 2)
    const t = cartTotals(cartLines(two))
    const quarter = (Math.PI * 300) / 2
    expect(t.pieces).toBe(2)
    expect(t.areaM2).toBeCloseTo((2 * quarter) / 1000)
  })

  it('zapytanie klienta nie zawiera m² ani cen; do biura: kontakt i pozycje z ceną, ilością i m²', () => {
    const cart = addItem([], { ...cfg, materialId: 'lakierowane', color: 'RAL 9010', flutingId: 'FR07' }, 2)
    const lines = cartLines(cart)
    const contact = { phone: '600 100 200', email: 'jan@firma.pl', company: 'Firma Sp. z o.o.', notes: 'pilne' }

    const client = inquiryText(lines, contact)
    expect(client).toContain('FGN-N0-R300 FR07')
    expect(client).toContain('2 szt.')
    expect(client).not.toContain('m²')
    expect(client).not.toContain('zł')

    const payload = quotePayload(lines, contact)
    const area = (Math.PI * 300) / 2 / 1000
    const unit = Math.round(area * 2750)
    expect(payload.contact).toEqual(contact)
    expect(payload.items[0]).toMatchObject({
      code: 'FGN-N0-R300',
      fluting: 'FR07',
      flutingName: 'Wałek 9',
      height: cfg.heightMm,
      ext: '0 mm',
      finish: 'Lakierowane, RAL 9010',
      body: false,
      qty: 2,
      unit,
      total: unit * 2,
    })
    expect(payload.items[0].area).toBeCloseTo(area * 2, 3)
    expect(cartTotals(lines).price).toBe(unit * 2)
  })

  it('pozycje bez ceny (np. błędny wymiar) idą do biura jako „do ustalenia”', () => {
    const lines = cartLines(addItem([], { ...cfg, heightMm: 50 }))
    const payload = quotePayload(lines, { phone: '600100200', email: 'a@b.pl', company: '', notes: '' })
    expect(lines[0].price.total).toBeNull()
    expect(payload.items[0].unit).toBeNull()
    expect(payload.items[0].total).toBeNull()
    expect(cartTotals(lines).unpriced).toBe(1)
  })

  it('wymaga klienta (imię i nazwisko lub firma), telefonu i e-maila', () => {
    expect(contactErrors({ phone: '', email: '', company: '', notes: '' })).toHaveProperty('phone')
    expect(contactErrors({ phone: '', email: '', company: '', notes: '' })).toHaveProperty('company')
    expect(contactErrors({ phone: '12', email: 'x', company: '', notes: '' })).toHaveProperty('email')
    expect(contactErrors({ phone: '+48 600 100 200', email: 'jan@firma.pl', company: 'Jan Kowalski', notes: '' })).toEqual({})
  })

  it('koszyk zapisany starszą wersją dostaje nowe pola', () => {
    const store = new Map<string, string>()
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    } as Storage
    const old = { ...cfg } as Record<string, unknown>
    delete old.body
    delete old.extLeftMm
    delete old.extRightMm
    old.endingId = 'n1'
    store.set('primo-koszyk-v1', JSON.stringify([{ id: 'a', qty: 1, config: old }]))
    const [item] = loadCart()
    expect(item.config.body).toBe(false)
    expect(item.config.extLeftMm).toBe(0)
    expect(item.config.extRightMm).toBe(50)
    expect(item.config).not.toHaveProperty('endingId')
  })
})
