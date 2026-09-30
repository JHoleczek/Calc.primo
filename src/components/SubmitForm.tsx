import { useState } from 'react'
import { CONTACT, QUOTE_RECIPIENT } from '../config/catalog'
import { contactErrors, EMPTY_CONTACT, inquirySubject, inquiryText, type CartLine, type Contact } from '../lib/cart'
import { QuoteNetworkError, sendQuote, SENT_HASH, submitQuoteForm } from '../lib/sendQuote'

interface Props {
  lines: CartLine[]
  /** Wyczyszczenie koszyka po wysłaniu zapytania. */
  onClear: () => void
}

type Status = 'idle' | 'form' | 'sending' | 'redirecting' | 'sent' | 'error'

/**
 * Koniec koszyka: „Zapytaj o wycenę” → telefon, e-mail, (firma) → wysyłka do biura.
 * Biuro dostaje m², ceny i proponowaną odpowiedź; klient ich nie widzi.
 */
export function SubmitForm({ lines, onClear }: Props) {
  const [contact, setContact] = useState<Contact>(EMPTY_CONTACT)
  // Powrót z wysyłki zwykłym formularzem (serwis przekierowuje z powrotem ze znacznikiem w adresie).
  const [status, setStatus] = useState<Status>(() => (window.location.hash === SENT_HASH ? 'sent' : 'idle'))
  const [touched, setTouched] = useState(false)
  const [honey, setHoney] = useState('')
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no')
  const [errorDetail, setErrorDetail] = useState('')
  const empty = lines.length === 0
  const invalid = lines.some((l) => l.result.errors.length > 0)
  const errors = contactErrors(contact)
  const shown = touched ? errors : {}
  const set = (key: keyof Contact) => (e: { target: { value: string } }) => setContact((c) => ({ ...c, [key]: e.target.value }))

  const submit = async () => {
    setTouched(true)
    if (empty || invalid || Object.keys(errors).length > 0) {
      const first = (['phone', 'email'] as const).find((k) => errors[k])
      if (first) document.getElementById(`quote-${first}`)?.focus()
      return
    }
    setStatus('sending')
    try {
      // Pole-pułapka na boty: wypełnione = udajemy sukces bez wysyłki.
      if (!honey) await sendQuote(lines, contact)
      setStatus('sent')
    } catch (e) {
      // Zapytanie w tle zablokowane (sieć, bloker reklam) – wysyłamy zwykłym formularzem.
      if (e instanceof QuoteNetworkError) {
        setStatus('redirecting')
        submitQuoteForm(lines, contact)
        return
      }
      // Odpowiedź serwisu wysyłki (np. prośba o aktywację) – pomaga ustalić przyczynę.
      setErrorDetail(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  const fallbackText = inquiryText(lines, contact)
  const subject = inquirySubject(lines)
  const mailto = `mailto:${QUOTE_RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fallbackText)}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Do: ${QUOTE_RECIPIENT}\nTemat: ${subject}\n\n${fallbackText}`)
      setCopied('yes')
    } catch {
      setCopied('failed')
    }
  }
  const phoneLink = <a href={`tel:+48${CONTACT.phone.replace(/\D/g, '')}`}>{CONTACT.phone}</a>

  if (status === 'sent') {
    return (
      <div className="submit" id="wyslij" role="status">
        <h3 className="submit__title">Dziękujemy – zapytanie wysłane</h3>
        <p className="cta__desc">
          {contact.email.trim()
            ? `Przygotujemy wycenę i odezwiemy się na ${contact.email.trim()} lub pod numer ${contact.phone.trim()}.`
            : 'Przygotujemy wycenę i odezwiemy się na podany adres e-mail lub telefon.'}
        </p>
        <div className="cta__actions">
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              onClear()
              setStatus('idle')
            }}
          >
            Wyczyść koszyk i zacznij od nowa
          </button>
        </div>
      </div>
    )
  }

  if (status === 'idle') {
    return (
      <div className="submit" id="wyslij">
        {empty && <p className="cta__hint">Dodaj co najmniej jeden front do koszyka, aby zapytać o wycenę.</p>}
        {invalid && <p className="cta__hint cta__hint--error">Popraw pozycje z błędem w koszyku.</p>}
        <div className="cta__actions">
          <button type="button" className="btn-primary" disabled={empty || invalid} onClick={() => setStatus('form')}>
            Zapytaj o wycenę
          </button>
        </div>
        <p className="cta__phone">Wolisz porozmawiać? Zadzwoń: {phoneLink}</p>
      </div>
    )
  }

  const field = (key: 'phone' | 'email' | 'company', label: string, props: Record<string, string | boolean>) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        id={`quote-${key}`}
        className={`text-input${contact[key].trim() ? ' text-input--filled' : ''}${shown[key] ? ' text-input--error' : ''}`}
        value={contact[key]}
        onChange={set(key)}
        aria-invalid={!!shown[key]}
        aria-describedby={shown[key] ? `quote-${key}-error` : undefined}
        {...props}
      />
      {shown[key] && (
        <span className="field__error" id={`quote-${key}-error`}>
          {shown[key]}
        </span>
      )}
    </label>
  )

  return (
    <form
      className="submit"
      id="wyslij"
      aria-labelledby="submit-title"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
    >
      <h3 id="submit-title" className="submit__title">
        Zapytaj o wycenę
      </h3>
      <p className="cta__desc">Zostaw kontakt – przygotujemy wycenę koszyka i odezwiemy się. To nie jest zamówienie ani płatność.</p>

      <div className="cta__fields">
        {field('phone', 'Telefon *', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', required: true })}
        {field('email', 'E-mail *', { type: 'email', autoComplete: 'email', required: true })}
        {field('company', 'Firma (opcjonalnie)', { type: 'text', autoComplete: 'organization' })}
        <label className="field">
          <span className="field__label">Uwagi (opcjonalnie)</span>
          <textarea id="quote-notes" className={`text-input${contact.notes.trim() ? ' text-input--filled' : ''}`} rows={3} value={contact.notes} onChange={set('notes')} />
        </label>
        <input
          className="submit__trap"
          type="text"
          name="_honey"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={honey}
          onChange={(e) => setHoney(e.target.value)}
        />
      </div>
      <p className="submit__required">* pola wymagane</p>

      <div className="cta__actions">
        <button type="submit" className="btn-primary" disabled={status === 'sending' || status === 'redirecting' || empty || invalid}>
          {status === 'sending' || status === 'redirecting' ? 'Wysyłanie…' : 'Wyślij zapytanie'}
        </button>
        <button type="button" className="link-btn" onClick={() => setStatus('idle')} disabled={status === 'sending' || status === 'redirecting'}>
          Anuluj
        </button>
      </div>

      <div role="alert">
        {status === 'error' && (
          <div className="submit__error">
            <p>Nie udało się wysłać zapytania. Wyślij je e-mailem do {QUOTE_RECIPIENT} albo zadzwoń: {phoneLink}.</p>
            {errorDetail && <p className="submit__detail">Odpowiedź serwera: {errorDetail}</p>}
            <div className="cta__actions">
              <a className="link-btn" href={mailto}>
                Otwórz w programie pocztowym
              </a>
              <button type="button" className="link-btn" onClick={copy}>
                Kopiuj treść zapytania
              </button>
            </div>
            {copied === 'yes' && <p className="cta__status">Skopiowano – wklej w wiadomości do {QUOTE_RECIPIENT}.</p>}
            {copied === 'failed' && <textarea className="text-input cta__fallback" readOnly rows={8} value={fallbackText} />}
          </div>
        )}
      </div>
    </form>
  )
}
