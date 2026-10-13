import { FLUTINGS, FRONT_TYPES, MATERIALS, VENEERS } from '../config/catalog'
import { calculate, extensionText, normalizeConfiguration, type Configuration } from './calculate'
import { extensionMm } from './frontPath'
import { priceLine, type LinePrice } from './pricing'

// Koszyk frontów do oceny: czyste funkcje (łatwe do testowania) + zapis w przeglądarce.

export interface CartItem {
  id: string
  config: Configuration
  qty: number
}

export const MAX_QTY = 999

const clampQty = (qty: number) => Math.min(MAX_QTY, Math.max(1, Math.round(Number.isFinite(qty) ? qty : 1)))

let counter = 0
export const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 7)}`

export function addItem(cart: CartItem[], config: Configuration, qty = 1): CartItem[] {
  return [...cart, { id: newId(), config: { ...config }, qty: clampQty(qty) }]
}

export function updateItem(cart: CartItem[], id: string, config: Configuration): CartItem[] {
  return cart.map((item) => (item.id === id ? { ...item, config: { ...config } } : item))
}

export function removeItem(cart: CartItem[], id: string): CartItem[] {
  return cart.filter((item) => item.id !== id)
}

/** Kopia pozycji wstawiana tuż pod oryginałem. */
export function duplicateItem(cart: CartItem[], id: string): CartItem[] {
  const i = cart.findIndex((item) => item.id === id)
  if (i < 0) return cart
  const copy = { ...cart[i], id: newId(), config: { ...cart[i].config } }
  return [...cart.slice(0, i + 1), copy, ...cart.slice(i + 1)]
}

export function setQty(cart: CartItem[], id: string, qty: number): CartItem[] {
  return cart.map((item) => (item.id === id ? { ...item, qty: clampQty(qty) } : item))
}

export interface CartLine {
  item: CartItem
  result: ReturnType<typeof calculate>
  /** m² dla całej pozycji (sztuka × ilość) – tylko do wiadomości dla biura. */
  areaM2: number
  price: LinePrice
}

export function cartLines(cart: CartItem[]): CartLine[] {
  return cart.map((item) => {
    const result = calculate(item.config)
    return { item, result, areaM2: result.areaM2 * item.qty, price: priceLine(item.config, result, item.qty) }
  })
}

export function cartTotals(lines: CartLine[]) {
  return lines.reduce(
    (t, l) => ({
      pieces: t.pieces + l.item.qty,
      areaM2: t.areaM2 + l.areaM2,
      price: t.price + (l.price.total ?? 0),
      unpriced: t.unpriced + (l.price.total === null ? 1 : 0),
    }),
    { pieces: 0, areaM2: 0, price: 0, unpriced: 0 },
  )
}


/** Wykończenie: materiał z kolorem / fornirem / dekorem, np. „Laminat, dekor U999 ST2 (koszt laminatu po stronie klienta)”. */
export function finishText(config: Configuration): string {
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]
  const veneer = VENEERS.find((v) => v.id === config.veneerId) ?? VENEERS[0]
  const color = config.color.trim()
  if (material.id === 'fornirowane') return `Fornir ${veneer.name.toLowerCase()}${veneer.stained && color ? `, bejca ${color}` : ''}`
  if (material.id === 'laminat') return `Laminat${color ? `, dekor ${color}` : ''} (koszt laminatu po stronie klienta)`
  return `${material.name}${color ? `, ${color}` : ''}`
}

/** Przedłużenia w skrócie do tabeli: „0 mm”, „lewe 30 / prawe 50 mm”, „600 mm (L 700)”, „2 × 140 mm (Z 200)”. */
export function extensionsText(config: Configuration): string {
  const r = config.radiusMm
  switch (config.typeId) {
    case 'narozne': {
      const left = extensionMm(config.extLeftMm)
      const right = extensionMm(config.extRightMm)
      return left || right ? `lewe ${left} / prawe ${right} mm` : '0 mm'
    }
    case 'przedluzane':
      return `${Math.round(config.lengthMm - r)} mm (L ${Math.round(config.lengthMm)})`
    case 'obustronne':
      return config.sideExtension ? `2 × ${Math.round(config.zMm - r)} mm (Z ${Math.round(config.zMm)})` : '0 mm'
    default:
      return '0 mm'
  }
}

/**
 * Jednolinijkowy opis frontu (bez ilości), np.
 * „Narożne · FR03 Fala 18 · Fornir dąb naturalny · H 720 mm · przedłużenie lewe 50 mm, prawe 80 mm · bryła”.
 */
export function describeConfig(config: Configuration, flutingCode: string): string {
  const type = FRONT_TYPES.find((t) => t.id === config.typeId) ?? FRONT_TYPES[0]
  const fluting = FLUTINGS.find((f) => f.id === flutingCode) ?? FLUTINGS[0]
  const ext = extensionText(config)
  return [
    type.name,
    `${fluting.id} ${fluting.name}`,
    finishText(config),
    `H ${config.heightMm} mm`,
    ...(ext ? [ext] : []),
    ...(config.body ? ['bryła (front + środek)'] : []),
  ].join(' · ')
}

export interface Contact {
  phone: string
  email: string
  company: string
  notes: string
}

export const EMPTY_CONTACT: Contact = { phone: '', email: '', company: '', notes: '' }

const PHONE_RE = /^\+?[\d\s()-]{9,}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Błędy danych kontaktowych (telefon i e-mail wymagane, firma opcjonalna). */
export function contactErrors(c: Contact): Partial<Record<keyof Contact, string>> {
  const errors: Partial<Record<keyof Contact, string>> = {}
  const digits = c.phone.replace(/\D/g, '')
  if (!c.phone.trim()) errors.phone = 'Podaj numer telefonu.'
  else if (!PHONE_RE.test(c.phone.trim()) || digits.length < 9 || digits.length > 15)
    errors.phone = 'Podaj poprawny numer telefonu (min. 9 cyfr).'
  if (!c.email.trim()) errors.email = 'Podaj adres e-mail.'
  else if (!EMAIL_RE.test(c.email.trim())) errors.email = 'Podaj poprawny adres e-mail, np. jan@firma.pl.'
  return errors
}

function contactLines(contact: Contact): string[] {
  return [
    `Telefon: ${contact.phone.trim()}`,
    `E-mail: ${contact.email.trim()}`,
    ...(contact.company.trim() ? [`Firma: ${contact.company.trim()}`] : []),
    ...(contact.notes.trim() ? [`Uwagi: ${contact.notes.trim()}`] : []),
  ]
}

/** Zapytanie w wersji dla klienta (bez m² i cen) – np. do wysłania z własnej poczty. */
export function inquiryText(lines: CartLine[], contact: Contact): string {
  const totals = cartTotals(lines)
  const out = ['Dzień dobry,', '', 'proszę o wycenę poniższych frontów giętych:', '']
  lines.forEach((l, i) => {
    out.push(`${i + 1}. ${l.result.code} ${l.result.flutingCode} – ${l.item.qty} szt.`)
    out.push(`   ${describeConfig(l.item.config, l.result.flutingCode)}`)
  })
  out.push('', `Razem: ${totals.pieces} szt.`, '', ...contactLines(contact))
  return out.join('\n')
}

export const inquirySubject = (lines: CartLine[]) =>
  `Zapytanie o wycenę – fronty gięte (${lines.length} poz., ${cartTotals(lines).pieces} szt.)`

// --- Zapis w przeglądarce (tylko wygoda: pusty lub niedostępny storage nie psuje strony) ---

const STORAGE_KEY = 'primo-koszyk-v1'

export function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (x): x is CartItem => !!x && typeof x.id === 'string' && typeof x.qty === 'number' && !!x.config && typeof x.config === 'object',
      )
      .map((x) => ({ ...x, config: normalizeConfiguration(x.config) }))
  } catch {
    return []
  }
}

export function saveCart(cart: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart))
  } catch {
    // Brak dostępu do storage (tryb prywatny itp.) – koszyk działa do odświeżenia strony.
  }
}
