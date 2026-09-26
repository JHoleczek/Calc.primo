import { useState } from 'react'
import { CONTACT } from '../config/catalog'
import { cartTotals, quoteText, type CartLine, type Contact } from '../lib/cart'

interface Props {
  lines: CartLine[]
}

const fmt = (v: number) => v.toLocaleString('pl-PL', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

/**
 * Zakończenie w koszyku: zamiast „kup teraz” – „Wyślij do oceny”.
 * Nie ma tu płatności ani serwera: przycisk tworzy gotową wiadomość z całym koszykiem
 * do biura Primo (program pocztowy), a treść można też skopiować.
 */
export function SubmitForm({ lines }: Props) {
  const [contact, setContact] = useState<Contact>({ name: '', reply: '', notes: '' })
  const [status, setStatus] = useState<'idle' | 'opened' | 'copied' | 'copy-failed'>('idle')
  const empty = lines.length === 0
  const invalid = lines.some((l) => l.result.errors.length > 0)
  const totals = cartTotals(lines)
  const text = quoteText(lines, contact)
  const subject = `Fronty gięte do oceny – ${lines.length} poz., ${fmt(totals.linearM)} mb`
  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
  const set = (key: keyof Contact) => (e: { target: { value: string } }) => setContact((c) => ({ ...c, [key]: e.target.value }))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Do: ${CONTACT.email}\nTemat: ${subject}\n\n${text}`)
      setStatus('copied')
    } catch {
      setStatus('copy-failed')
    }
  }

  return (
        <form
          className="submit"
          id="wyslij"
          aria-labelledby="submit-title"
          onSubmit={(e) => {
            e.preventDefault()
            if (empty || invalid) return
            window.location.href = mailto
            setStatus('opened')
          }}
        >
          <h3 id="submit-title" className="submit__title">
            Wyślij do oceny
          </h3>
          <p className="cta__desc">
            Prześlij koszyk do biura Primo – ocenimy wykonalność i przygotujemy wycenę. To nie jest zamówienie ani płatność.
          </p>

          <div className="cta__fields">
            <label className="field">
              <span className="field__label">Imię i nazwisko / firma</span>
              <input id="cta-name" className="text-input" value={contact.name} onChange={set('name')} autoComplete="name" />
            </label>
            <label className="field">
              <span className="field__label">Telefon lub e-mail do odpowiedzi</span>
              <input id="cta-reply" className="text-input" value={contact.reply} onChange={set('reply')} autoComplete="email" />
            </label>
            <label className="field">
              <span className="field__label">Uwagi (opcjonalnie)</span>
              <textarea id="cta-notes" className="text-input" rows={3} value={contact.notes} onChange={set('notes')} />
            </label>
          </div>

          {empty && <p className="cta__hint">Dodaj co najmniej jeden front do koszyka, aby wysłać go do oceny.</p>}
          {invalid && <p className="cta__hint cta__hint--error">Popraw pozycje z błędem wymiaru w koszyku.</p>}

          <div className="cta__actions">
            <button type="submit" className="btn-primary" disabled={empty || invalid}>
              Wyślij do oceny
            </button>
            <button type="button" className="link-btn" onClick={copy} disabled={empty}>
              Kopiuj treść zapytania
            </button>
          </div>

          <p className="cta__status" role="status">
            {status === 'opened' &&
              `Otworzyliśmy wiadomość do ${CONTACT.email} w programie pocztowym – wyślij ją, aby przekazać koszyk. Nic się nie otworzyło? Skopiuj treść i wyślij ją ręcznie.`}
            {status === 'copied' && `Skopiowano. Wklej treść w wiadomości do ${CONTACT.email}.`}
            {status === 'copy-failed' && 'Nie udało się skopiować automatycznie – zaznacz treść poniżej i skopiuj ręcznie.'}
          </p>
          {status === 'copy-failed' && <textarea className="text-input cta__fallback" readOnly rows={8} value={text} />}

          <p className="cta__phone">
            Wolisz porozmawiać? Zadzwoń: <a href={`tel:+48${CONTACT.phone.replace(/\D/g, '')}`}>{CONTACT.phone}</a>
          </p>
        </form>
  )
}
