import { useEffect, useRef, useState } from 'react'
import { CONTACT } from '../config/catalog'

const phoneHref = `tel:+48${CONTACT.phone.replace(/\D/g, '')}`

/** Stopka na końcu konfiguratora: kontakt, prawa, polityka prywatności i cookies. */
export function SiteFooter({ onPrivacy }: { onPrivacy: (section?: 'cookies') => void }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__contact">
        <span className="site-footer__brand">Primo Meble</span>
        <a href={phoneHref}>{CONTACT.phone}</a>
        <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
      </div>
      <div className="site-footer__links">
        <button type="button" className="link-btn" onClick={() => onPrivacy()}>
          Polityka prywatności
        </button>
        <button type="button" className="link-btn" onClick={() => onPrivacy('cookies')}>
          Cookies
        </button>
      </div>
      <p className="site-footer__copy">© {new Date().getFullYear()} Primo Meble. Ceny i wymiary w kalkulatorze mają charakter poglądowy – ostateczną wycenę przygotowuje biuro.</p>
    </footer>
  )
}

const NOTICE_KEY = 'primo-cookies-info-v1'

/** Informacja o cookies (strona nie używa cookies śledzących – nie ma czego „akceptować”). */
export function CookieNotice({ onPrivacy }: { onPrivacy: (section?: 'cookies') => void }) {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(NOTICE_KEY) !== '1'
    } catch {
      return true
    }
  })
  if (!visible) return null
  const close = () => {
    try {
      localStorage.setItem(NOTICE_KEY, '1')
    } catch {
      // Brak dostępu do pamięci przeglądarki – komunikat wróci po odświeżeniu.
    }
    setVisible(false)
  }
  return (
    <div className="cookie-notice" role="region" aria-label="Informacja o cookies">
      <p>
        Nie używamy plików cookies do śledzenia ani reklam. W pamięci Twojej przeglądarki zapisujemy tylko koszyk.{' '}
        <button type="button" className="link-btn" onClick={() => onPrivacy('cookies')}>
          Więcej
        </button>
      </p>
      <button type="button" className="btn-secondary cookie-notice__ok" onClick={close}>
        Rozumiem
      </button>
    </div>
  )
}

/** Polityka prywatności i cookies (natywne okno dialogowe – Esc i fokus obsługuje przeglądarka). */
export function PrivacyDialog({ open, section, onClose }: { open: boolean; section?: 'cookies'; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      const target = section ? d.querySelector<HTMLElement>(`#privacy-${section}`) : null
      if (target) target.scrollIntoView({ block: 'start' })
      else d.querySelector('.privacy__body')?.scrollTo(0, 0)
    }
    if (!open && d.open) d.close()
  }, [open, section])

  return (
    <dialog ref={ref} className="privacy" aria-labelledby="privacy-title" onClose={onClose} onCancel={onClose}>
      <div className="privacy__head">
        <h2 id="privacy-title">Polityka prywatności</h2>
        <button type="button" className="drawer__close" onClick={onClose} aria-label="Zamknij">
          ✕
        </button>
      </div>
      <div className="privacy__body">
        <h3>Administrator danych</h3>
        <p>
          Administratorem danych podanych w formularzu „Zapytaj o wycenę” jest Primo Meble. Kontakt w sprawie danych:{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>, tel. <a href={phoneHref}>{CONTACT.phone}</a>.
        </p>

        <h3>Jakie dane i po co</h3>
        <p>
          Zbieramy tylko to, co wpiszesz w formularz: numer telefonu, adres e-mail, opcjonalnie nazwę firmy i uwagi, a także
          konfigurację frontów z koszyka. Używamy ich wyłącznie do przygotowania wyceny i kontaktu w jej sprawie – to działania
          przed zawarciem umowy, podejmowane na Twoje żądanie (art. 6 ust. 1 lit. b RODO).
        </p>

        <h3>Komu przekazujemy dane</h3>
        <p>
          Wiadomość z formularza jest wysyłana do nas przez serwis Web3Forms, który dostarcza ją na naszą skrzynkę e-mail.
          Strona jest hostowana w serwisie GitHub Pages. Nie sprzedajemy danych i nie przekazujemy ich w celach marketingowych.
        </p>

        <h3>Jak długo</h3>
        <p>
          Przechowujemy korespondencję tak długo, jak jest potrzebna do przygotowania wyceny i ewentualnej realizacji zamówienia,
          a następnie przez okres wymagany przepisami (np. rozliczenia, przedawnienie roszczeń).
        </p>

        <h3>Twoje prawa</h3>
        <p>
          Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia oraz
          wniesienia sprzeciwu. Możesz też złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych. Podanie danych jest
          dobrowolne, ale bez telefonu i e-maila nie przygotujemy wyceny.
        </p>

        <h3 id="privacy-cookies">Cookies i pamięć przeglądarki</h3>
        <p>
          Strona nie używa plików cookies – ani analitycznych, ani reklamowych – i nie śledzi odwiedzających. W pamięci Twojej
          przeglądarki (localStorage) zapisujemy tylko zawartość koszyka i informację, że zamknięto komunikat o cookies. Te dane
          nie są nigdzie wysyłane; możesz je usunąć, czyszcząc dane witryny w przeglądarce.
        </p>
      </div>
    </dialog>
  )
}
