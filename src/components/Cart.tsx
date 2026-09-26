import { useState, type ReactNode } from 'react'
import { catalogImage, TYPE_IMAGES } from '../config/images'
import { cartTotals, describeConfig, MAX_QTY, type CartLine } from '../lib/cart'

interface Props {
  lines: CartLine[]
  editingId: string | null
  onQty: (id: string, qty: number) => void
  onEdit: (id: string) => void
  onDuplicate: (id: string) => void
  onRemove: (id: string) => void
  /** Element w nagłówku koszyka (np. przycisk zamknięcia panelu). */
  headerAction?: ReactNode
  /** Treść pod sumami (np. formularz „Wyślij do oceny”). */
  footer?: ReactNode
}

const fmt = (v: number, digits = 3) =>
  Number.isFinite(v) ? v.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—'

/** Polska odmiana: 1 pozycja, 2–4 pozycje, 5+ pozycji (z wyjątkiem 12–14). */
const positions = (n: number) =>
  n === 1 ? 'pozycja' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'pozycje' : 'pozycji'

/** Pole ilości z przyciskami −/+; wpisaną wartość zatwierdza przy opuszczeniu pola lub Enter. */
function QtyStepper({ id, qty, label, onQty }: { id: string; qty: number; label: string; onQty: (qty: number) => void }) {
  const [text, setText] = useState<string | null>(null)
  const commit = () => {
    if (text !== null) onQty(Number(text))
    setText(null)
  }
  return (
    <div className="qty" role="group" aria-label={`Ilość – ${label}`}>
      <button type="button" className="qty__btn" onClick={() => onQty(qty - 1)} disabled={qty <= 1} aria-label="Zmniejsz ilość">
        −
      </button>
      <input
        id={`qty-${id}`}
        className="qty__input"
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_QTY}
        value={text ?? String(qty)}
        aria-label="Ilość sztuk"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
      />
      <button type="button" className="qty__btn" onClick={() => onQty(qty + 1)} disabled={qty >= MAX_QTY} aria-label="Zwiększ ilość">
        +
      </button>
    </div>
  )
}

export function Cart({ lines, editingId, onQty, onEdit, onDuplicate, onRemove, headerAction, footer }: Props) {
  const totals = cartTotals(lines)

  return (
    <section className="cart" id="koszyk" aria-labelledby="cart-title">
      <div className="cart__head">
        <div className="cart__title">
          <h2 id="cart-title">Koszyk</h2>
          <span className="cart__count">
            {lines.length} {positions(lines.length)} · {totals.pieces} szt.
          </span>
        </div>
        {headerAction}
      </div>

      {lines.length === 0 ? (
        <p className="cart__empty">Koszyk jest pusty. Skonfiguruj front i kliknij „Dodaj do koszyka”.</p>
      ) : (
        <>
          <ol className="cart__list">
            {lines.map((l, i) => {
              const { item, result } = l
              const editing = item.id === editingId
              const invalid = result.errors.length > 0
              return (
                <li key={item.id} className={`cart-item${editing ? ' cart-item--editing' : ''}`}>
                  <img className="cart-item__img" src={catalogImage(TYPE_IMAGES[item.config.typeId])} alt="" />
                  <div className="cart-item__body">
                    <p className="cart-item__code">
                      <span className="cart-item__index">{String(i + 1).padStart(2, '0')}</span>
                      {result.code} <span className="cart-item__fluting">{result.flutingCode}</span>
                      {editing && <span className="cart-item__badge">Edytujesz</span>}
                    </p>
                    <p className="cart-item__desc">{describeConfig(item.config, result.flutingCode)}</p>
                    {invalid && <p className="cart-item__error">{result.errors[0]}</p>}
                    <div className="cart-item__row">
                      <QtyStepper id={item.id} qty={item.qty} label={result.code} onQty={(q) => onQty(item.id, q)} />
                      <p className="cart-item__sum">
                        {fmt(l.linearM)} mb · {fmt(l.areaM2)} m²
                        {item.qty > 1 && <span className="cart-item__per"> ({fmt(result.linearM)} mb / szt.)</span>}
                      </p>
                    </div>
                    <div className="cart-item__actions">
                      <button type="button" className="link-btn" onClick={() => onEdit(item.id)} aria-label={`Edytuj pozycję ${i + 1}`}>
                        Edytuj
                      </button>
                      <button type="button" className="link-btn" onClick={() => onDuplicate(item.id)} aria-label={`Duplikuj pozycję ${i + 1}`}>
                        Duplikuj
                      </button>
                      <button
                        type="button"
                        className="link-btn link-btn--danger"
                        onClick={() => onRemove(item.id)}
                        aria-label={`Usuń pozycję ${i + 1}`}
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>

          <dl className="cart__totals">
            <div>
              <dt>Sztuk</dt>
              <dd>{totals.pieces}</dd>
            </div>
            <div>
              <dt>Metry bieżące</dt>
              <dd>{fmt(totals.linearM)} mb</dd>
            </div>
            <div>
              <dt>Powierzchnia</dt>
              <dd>{fmt(totals.areaM2)} m²</dd>
            </div>
          </dl>
        </>
      )}
      {footer}
    </section>
  )
}
