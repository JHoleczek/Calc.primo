import { useEffect } from 'react'

const SHOW_MS = 6000

/**
 * Powiadomienie na środku ekranu po wysłaniu zapytania. Znika samo po kilku sekundach
 * (albo po kliknięciu / Esc) – strona jest już wtedy wyczyszczona do nowego zapytania.
 */
export function SentNotice({ number, email, onClose }: { number: string | null; email: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, SHOW_MS)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="sent-notice" onClick={onClose}>
      <div className="sent-notice__card" role="status" aria-live="polite">
        <span className="sent-notice__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 12.5 10 17.5 19 7" />
          </svg>
        </span>
        <p className="sent-notice__title">Dziękujemy – zapytanie wysłane</p>
        {number && <p className="sent-notice__number">{number}</p>}
        <p className="sent-notice__text">
          Potwierdzenie wysłaliśmy na {email}. Biuro przygotuje wycenę i prześle ją mailem.
        </p>
        <span className="sent-notice__bar" style={{ animationDuration: `${SHOW_MS}ms` }} aria-hidden="true" />
      </div>
    </div>
  )
}
