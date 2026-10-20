import { createPortal } from 'react-dom'
import { COMPANY, CONTACT, PUBLIC_QUOTE_EMAIL } from '../config/catalog'
import { finishText, type CartLine, type Contact } from '../lib/cart'
import type { Configuration } from '../lib/calculate'
import { planGeometry } from '../lib/planGeometry'
import { acceptMailto, pln, type QuoteTotals } from '../lib/quote'
import { PlanContent } from './PlanDrawing'

// Wycena do PDF (tryb biura): treść jak wycena z maila, ale w wersji do druku –
// czarno-biała, bez teł i przycisków, z rzutem z góry przy każdej pozycji.
// Na ekranie niewidoczna; przy drukowaniu („Zapisz jako PDF”) zastępuje całą stronę.

/** Układ miniatury rzutu [px]: opisy i wymiary liczone dla tej wielkości, potem skalowane w druku. */
const THUMB_W = 300
const THUMB_H = 220

/** Rzut z góry do druku: czarny rysunek na białym tle (kolory z .qdoc__plan). */
function PlanThumb({ config, id }: { config: Configuration; id: string }) {
  const geo = planGeometry(config, Math.min(THUMB_W, THUMB_H))
  const { x, y, w, h } = geo.view
  const px = Math.max(w / THUMB_W, h / THUMB_H)
  const cx = x + w / 2
  const cy = y + h / 2
  const vw = THUMB_W * px
  const vh = THUMB_H * px
  return (
    <svg className="plan qdoc__plan" viewBox={`${cx - vw / 2} ${cy - vh / 2} ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet">
      <PlanContent geo={geo} px={px} hatchId={`qdoc-hatch-${id}`} />
    </svg>
  )
}

interface Props {
  lines: CartLine[]
  totals: QuoteTotals
  number: string
  contact: Contact
  date: string
}

const LAMINATE_NOTE = /\s*\(koszt laminatu po stronie klienta\)$/

export function QuoteDocument({ lines, totals, number, contact, date }: Props) {
  const laminate = lines.some((l) => l.item.config.materialId === 'laminat')
  const client = contact.company.trim()
  const reach = [contact.email.trim(), contact.phone.trim()].filter(Boolean).join(' · ')
  const notes = contact.notes.trim()

  return createPortal(
    <article className="qdoc" aria-hidden="true">
      <header className="qdoc__bar">
        <span className="qdoc__brand">PRIMO MEBLE</span>
        <span className="qdoc__no">{number.trim() ? `Wycena nr ${number.trim()}` : 'Wycena'}</span>
      </header>

      <div className="qdoc__meta">
        <div>
          {client && (
            <p>
              <span className="qdoc__label">Dla</span>
              <b>{client}</b>
              {reach && <span className="qdoc__reach">{reach}</span>}
            </p>
          )}
        </div>
        <p>
          <span className="qdoc__label">Data</span>
          {date}
        </p>
      </div>

      <p className="qdoc__intro">
        Dzień dobry,
        <br />
        przesyłamy wycenę frontów giętych przygotowaną na podstawie Państwa zapytania.
      </p>

      {notes && (
        <div className="qdoc__notes">
          <span className="qdoc__label">Państwa uwagi</span>
          <p>{notes}</p>
        </div>
      )}

      <table className="qdoc__table">
        <thead>
          <tr>
            <th>LP</th>
            <th>RZUT Z GÓRY</th>
            <th>PRODUKT</th>
            <th>H</th>
            <th>WYGLĄD</th>
            <th>RYFLOWANIE</th>
            <th>BRYŁA</th>
            <th className="qdoc__num">ILOŚĆ</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const lam = l.item.config.materialId === 'laminat'
            return (
              <tr key={l.item.id}>
                <td>{i + 1}</td>
                <td className="qdoc__plan-cell">
                  <PlanThumb config={l.item.config} id={l.item.id.replace(/[^\w-]/g, '')} />
                </td>
                <td>
                  <b>{l.result.code}</b>
                </td>
                <td className="qdoc__nowrap">{l.item.config.heightMm} mm</td>
                <td>
                  {finishText(l.item.config).replace(LAMINATE_NOTE, '')}
                  {lam && <sup>*</sup>}
                </td>
                <td>{l.result.flutingCode}</td>
                <td>{l.item.config.body ? 'TAK' : 'NIE'}</td>
                <td className="qdoc__num qdoc__nowrap">{l.item.qty} szt.</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="qdoc__sum">
        {totals.net === null || totals.netAfter === null || totals.gross === null ? (
          <p className="qdoc__total">
            Suma NETTO: <b>do ustalenia</b>
          </p>
        ) : (
          <>
            {totals.discount > 0 && (
              <>
                <p className="qdoc__sub">Wartość netto: {pln(totals.net)}</p>
                <p className="qdoc__sub">
                  Rabat {String(totals.discountPct).replace('.', ',')}%: −{pln(totals.discount)}
                </p>
              </>
            )}
            <p className="qdoc__total">
              Suma NETTO: <b>{pln(totals.netAfter)}</b>
            </p>
            <p className="qdoc__vat">+23% VAT · brutto {pln(totals.gross)}</p>
          </>
        )}
      </div>

      {laminate && (
        <p className="qdoc__laminate">
          <b>*</b> Dekor laminatu po stronie klienta – koszt laminatu nie jest wliczony w cenę.
        </p>
      )}

      <p className="qdoc__cta">
        Aby potwierdzić wycenę, napisz na{' '}
        <a href={acceptMailto(number, totals, client)}>{PUBLIC_QUOTE_EMAIL}</a> lub zadzwoń:{' '}
        <a href={`tel:+48${CONTACT.phone.replace(/\D/g, '')}`}>{CONTACT.phone}</a>.
      </p>

      <footer className="qdoc__foot">
        <span className="qdoc__brand">PRIMO MEBLE</span>
        <br />
        {COMPANY.legalName} s.c. · {COMPANY.street}, {COMPANY.city}
        <br />
        NIP {COMPANY.nip} · tel. {CONTACT.phone} · {COMPANY.www}
      </footer>
    </article>,
    document.body,
  )
}
