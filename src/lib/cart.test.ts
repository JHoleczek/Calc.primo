import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIGURATION } from './calculate'
import { addItem, cartLines, cartTotals, duplicateItem, quoteText, removeItem, setQty, updateItem } from './cart'

const cfg = { ...DEFAULT_CONFIGURATION, typeId: 'narozne' as const, radiusMm: 300, endingId: 'n0' as const, heightMm: 1000 }

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

  it('sumuje sztuki, mb i m² z uwzględnieniem ilości', () => {
    const cart = setQty(addItem([], cfg), addItem([], cfg)[0].id, 1)
    const two = setQty(cart, cart[0].id, 2)
    const t = cartTotals(cartLines(two))
    const quarter = (Math.PI * 300) / 2
    expect(t.pieces).toBe(2)
    expect(t.linearM).toBeCloseTo((2 * quarter) / 1000)
    expect(t.areaM2).toBeCloseTo((2 * quarter) / 1000)
  })

  it('treść zapytania zawiera kody, ilości, sumy i kontakt', () => {
    const cart = setQty(addItem([], cfg), '', 1)
    const text = quoteText(cartLines(setQty(cart, cart[0].id, 2)), { name: 'Jan', reply: '600 100 200', notes: 'pilne' })
    expect(text).toContain('EG-N0-R300 F00')
    expect(text).toContain('2 szt.')
    expect(text).toContain('Razem: 2 szt.')
    expect(text).toContain('Uwagi: pilne')
    expect(text).toContain('Kontakt: 600 100 200')
  })
})
