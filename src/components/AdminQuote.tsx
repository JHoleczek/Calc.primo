import { useEffect, useState } from 'react'
import { EMPTY_CONTACT, type CartLine, type Contact } from '../lib/cart'
import { pln, quoteTotals } from '../lib/quote'
import { QuoteDocument } from './QuoteDocument'

// Tryb biura: sumy z rabatem, dane klienta i „Generuj PDF” (druk do PDF w układzie wyceny z maila).

/** Pole liczbowe trzymające surowy tekst (przecinek albo kropka). */
export function NumberField({
  id,
  value,
  placeholder,
  suffix,
  label,
  onCommit,
}: {
  id: string
  value: number | null
  placeholder?: string
  suffix: string
  label: string
  onCommit: (value: number | null) => void
}) {
  const shown = value === null ? '' : String(value).replace('.', ',')
  const [text, setText] = useState<string | null>(null)
  const commit = () => {
    if (text === null) return
    const t = text.replace(/\s/g, '').replace(',', '.')
    onCommit(t === '' ? null : Number(t))
    setText(null)
  }
  return (
    <label className="num-field" htmlFor={id}>
      <span className="sr-only">{label}</span>
      <input
        id={id}
        className="num-field__input"
        inputMode="decimal"
        placeholder={placeholder}
        value={text ?? shown}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
      <span className="num-field__suffix">{suffix}</span>
    </label>
  )
}

/** Cena pozycji w koszyku biura: cena netto/szt. (z cennika albo ręczna) i wartość pozycji. */
export function AdminLinePrice({ line, index, onPrice }: { line: CartLine; index: number; onPrice: (price: number | null) => void }) {
  const { item, price, unitNet, net } = line
  const manual = item.unitPrice !== undefined
  return (
    <div className="admin-line">
      <div className="admin-line__row">
        <NumberField
          id={`price-${item.id}`}
          value={unitNet}
          placeholder="cena"
          suffix="zł netto/szt."
          label={`Cena netto za sztukę – pozycja ${index + 1}`}
          onCommit={onPrice}
        />
        <span className="admin-line__total">{net === null ? 'do ustalenia' : pln(net)}</span>
      </div>
      <p className="admin-line__hint">
        {manual ? (
          <>
            Cena ręczna · cennik: {price.unitPrice === null ? 'brak' : pln(price.unitPrice)}{' '}
            <button type="button" className="link-btn" onClick={() => onPrice(null)}>
              Przywróć cennik
            </button>
          </>
        ) : price.unitPrice === null ? (
          `Brak ceny w cenniku${price.missing ? ` (${price.missing})` : ''} – wpisz cenę.`
        ) : (
          `Z cennika: ${line.result.areaM2.toLocaleString('pl-PL', { maximumFractionDigits: 3 })} m² × ${Math.round(price.rate ?? 0).toLocaleString('pl-PL')} zł/m²`
        )}
      </p>
    </div>
  )
}

const today = () => new Date().toLocaleDateString('pl-PL')

export function AdminQuote({ lines }: { lines: CartLine[] }) {
  const [discount, setDiscount] = useState<number | null>(null)
  const [number, setNumber] = useState('')
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT)
  const [printing, setPrinting] = useState(false)
  const totals = quoteTotals(lines, discount ?? 0)
  const empty = lines.length === 0
  const unpriced = !empty && totals.net === null

  // Druk dopiero po wyrenderowaniu dokumentu; tytuł strony = proponowana nazwa pliku PDF.
  useEffect(() => {
    if (!printing) return
    const title = document.title
    const name = ['Wycena', number.trim().replace(/[/\\]/g, '-'), contact.company.trim()].filter(Boolean).join(' ')
    document.title = name
    const done = () => {
      document.title = title
      setPrinting(false)
    }
    window.addEventListener('afterprint', done, { once: true })
    const t = window.setTimeout(() => window.print(), 50)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('afterprint', done)
      document.title = title
    }
  }, [printing, number, contact.company])

  const set = (key: keyof Contact) => (e: { target: { value: string } }) => setContact((c) => ({ ...c, [key]: e.target.value }))
  const text = (key: keyof Contact, label: string, type = 'text') => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        id={`admin-${key}`}
        className={`text-input${contact[key].trim() ? ' text-input--filled' : ''}`}
        type={type}
        value={contact[key]}
        onChange={set(key)}
      />
    </label>
  )

  return (
    <div className="admin-quote" id="wycena-biuro">
      <dl className="admin-sum">
        <div>
          <dt>Wartość netto</dt>
          <dd>{totals.net === null ? 'do ustalenia' : pln(totals.net)}</dd>
        </div>
        <div className="admin-sum__discount">
          <dt aria-hidden="true">Rabat</dt>
          <dd>
            <NumberField
              id="admin-discount"
              value={discount}
              placeholder="0"
              suffix="%"
              label="Rabat w procentach"
              onCommit={(v) => setDiscount(v === null || !Number.isFinite(v) ? null : Math.min(100, Math.max(0, v)))}
            />
            {totals.discount > 0 && <span className="admin-sum__minus">−{pln(totals.discount)}</span>}
          </dd>
        </div>
        <div className="admin-sum__main">
          <dt>Suma netto</dt>
          <dd>{totals.netAfter === null ? 'do ustalenia' : pln(totals.netAfter)}</dd>
        </div>
        <div>
          <dt>VAT 23%</dt>
          <dd>{totals.netAfter === null ? '—' : pln(totals.vat)}</dd>
        </div>
        <div>
          <dt>Brutto</dt>
          <dd>{totals.gross === null ? '—' : pln(totals.gross)}</dd>
        </div>
      </dl>

      <h3 className="submit__title">Wycena PDF</h3>
      <div className="cta__fields">
        <label className="field">
          <span className="field__label">Nr wyceny (opcjonalnie)</span>
          <input
            id="admin-number"
            className={`text-input${number.trim() ? ' text-input--filled' : ''}`}
            placeholder="np. ZP/2026/0017"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
        </label>
        {text('company', 'Klient – imię i nazwisko lub firma')}
        {text('email', 'E-mail', 'email')}
        {text('phone', 'Telefon', 'tel')}
        <label className="field">
          <span className="field__label">Uwagi klienta (w PDF jako „Państwa uwagi”)</span>
          <textarea
            id="admin-notes"
            className={`text-input${contact.notes.trim() ? ' text-input--filled' : ''}`}
            rows={3}
            value={contact.notes}
            onChange={set('notes')}
          />
        </label>
      </div>

      {empty && <p className="cta__hint">Dodaj co najmniej jeden front do koszyka.</p>}
      {unpriced && <p className="cta__hint cta__hint--error">Uzupełnij ceny pozycji bez ceny (lub popraw pozycje z błędem).</p>}
      <div className="cta__actions">
        <button type="button" className="btn-primary" disabled={empty || unpriced} onClick={() => setPrinting(true)}>
          Generuj PDF
        </button>
      </div>
      <p className="admin-quote__tip">W oknie drukowania wybierz „Zapisz jako PDF”.</p>

      {!empty && <QuoteDocument lines={lines} totals={totals} number={number} contact={contact} date={today()} />}
    </div>
  )
}
