import { useEffect, useMemo, useState } from 'react'
import { COMPANY, CONTACT, FRONT_TYPES, OFFER_DEFAULTS } from '../config/catalog'
import { PRICE_BASIS } from '../config/pricing'
import { calculate } from '../lib/calculate'
import { describeConfig } from '../lib/cart'
import { priceLine } from '../lib/pricing'
import type { OfferData } from '../lib/share'
import { PlanView } from './PlanView'

// Oferta dla klienta, przygotowywana przez biuro z linku „Utwórz ofertę” w mailu z zapytaniem.
// Biuro poprawia ceny i warunki, drukuje do PDF i wysyła klientowi. Dopiero ta oferta jest wiążąca.

const round2 = (v: number) => Math.round(v * 100) / 100
const money = (v: number) => `${v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`
const isoDate = (d: Date) => d.toISOString().slice(0, 10)
const plDate = (iso: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('pl-PL') : '…')
const parseNum = (s: string) => {
  const v = Number(s.replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(v) && s.trim() !== '' ? v : null
}

interface State {
  offerNo: string
  issued: string
  validUntil: string
  buyer: string
  /** Ceny netto za sztukę (tekst z pola – pozwala swobodnie wpisywać). */
  unit: string[]
  vatPct: string
  depositPct: string
  depositDays: string
  leadTime: string
  bankAccount: string
  remarks: string
}

function initialState(data: OfferData): State {
  const today = new Date()
  const valid = new Date(today)
  valid.setDate(valid.getDate() + OFFER_DEFAULTS.validDays)
  const vat = OFFER_DEFAULTS.vatPct
  return {
    offerNo: data.number ? data.number.replace(/^ZP/, 'OF') : `OF/${today.getFullYear()}/`,
    issued: isoDate(today),
    validUntil: isoDate(valid),
    buyer: [data.contact.company].filter(Boolean).join('\n'),
    unit: data.items.map(({ config }) => {
      const p = priceLine(config, calculate(config), 1).unitPrice
      if (p === null) return ''
      return String(round2(PRICE_BASIS === 'brutto' ? p / (1 + vat / 100) : p)).replace('.', ',')
    }),
    vatPct: String(vat),
    depositPct: String(OFFER_DEFAULTS.depositPct),
    depositDays: String(OFFER_DEFAULTS.depositDays),
    leadTime: OFFER_DEFAULTS.leadTime,
    bankAccount: COMPANY.bankAccount,
    remarks: '',
  }
}

/** Pole edytowalne na ekranie, w wydruku zwykły tekst. */
function Edit({
  value,
  onChange,
  label,
  className = '',
  ...props
}: { value: string; onChange: (v: string) => void; label: string; className?: string } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
>) {
  return (
    <input
      className={`offer-edit ${className}${value.trim() ? '' : ' offer-edit--empty'}`}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
}

export function OfferPage({ data }: { data: OfferData }) {
  const storageKey = `primo-oferta-${data.number || 'bez-numeru'}`
  const [s, setS] = useState<State>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) return { ...initialState(data), ...(JSON.parse(saved) as Partial<State>) }
    } catch {
      // Brak pamięci przeglądarki – startujemy od wartości z kalkulatora.
    }
    return initialState(data)
  })
  // Zmiany biura zostają po odświeżeniu (tylko w tej przeglądarce).
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(s))
    } catch {
      // Bez zapisu – edycja działa dalej.
    }
  }, [s, storageKey])
  useEffect(() => {
    document.body.classList.add('offer-mode')
    document.title = `Oferta ${s.offerNo} – ${COMPANY.brand}`
    return () => document.body.classList.remove('offer-mode')
  }, [s.offerNo])

  const set = <K extends keyof State>(key: K) => (v: State[K]) => setS((p) => ({ ...p, [key]: v }))
  const setUnit = (i: number) => (v: string) => setS((p) => ({ ...p, unit: p.unit.map((u, j) => (j === i ? v : u)) }))

  const rows = useMemo(
    () =>
      data.items.map(({ config, qty }, i) => {
        const result = calculate(config)
        const unit = parseNum(s.unit[i] ?? '')
        return {
          config,
          qty,
          result,
          type: FRONT_TYPES.find((t) => t.id === config.typeId)?.name ?? '',
          unit,
          value: unit === null ? null : round2(unit * qty),
        }
      }),
    [data.items, s.unit],
  )
  const missing = rows.filter((r) => r.value === null).length
  const net = round2(rows.reduce((t, r) => t + (r.value ?? 0), 0))
  const vatPct = parseNum(s.vatPct) ?? 0
  const vat = round2((net * vatPct) / 100)
  const gross = round2(net + vat)
  const depositPct = parseNum(s.depositPct) ?? 0
  const deposit = round2((gross * depositPct) / 100)
  const ready = missing === 0 && s.bankAccount.trim() !== '' && s.offerNo.trim() !== ''

  const c = data.contact
  const mailBody = [
    'Dzień dobry,',
    '',
    `w załączniku przesyłamy ofertę nr ${s.offerNo}${data.number ? ` do zapytania ${data.number}` : ''}.`,
    `Wartość zamówienia: ${money(gross)} brutto.`,
    '',
    'Aby złożyć zamówienie:',
    `1. odpowiedz na tę wiadomość: „Akceptuję ofertę nr ${s.offerNo}”,`,
    `2. wpłać zadatek ${money(deposit)} na konto ${s.bankAccount || '[numer konta]'}, tytuł: ${s.offerNo}.`,
    'Po zaksięgowaniu zadatku potwierdzimy zamówienie i termin realizacji.',
    '',
    `Oferta jest ważna do ${plDate(s.validUntil)}.`,
    '',
    'Pozdrawiamy',
    `${COMPANY.brand}, tel. ${CONTACT.phone}`,
  ].join('\n')
  const mailto = `mailto:${c.email}?subject=${encodeURIComponent(`Oferta nr ${s.offerNo} – ${COMPANY.brand}`)}&body=${encodeURIComponent(mailBody)}`
  const [copied, setCopied] = useState(false)

  return (
    <div className="offer-page">
      <div className="offer-toolbar" role="toolbar" aria-label="Oferta">
        <div className="offer-toolbar__info">
          <strong>Oferta do wysłania klientowi</strong>
          <span>
            Sprawdź wymiary i ceny, uzupełnij pola na żółto, potem „Zapisz PDF” i wyślij PDF klientowi.
            {!ready && ' Brakuje: ' + [missing ? `${missing} cen` : '', s.bankAccount.trim() ? '' : 'numeru konta'].filter(Boolean).join(', ') + '.'}
          </span>
        </div>
        <div className="offer-toolbar__actions">
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            Zapisz PDF / drukuj
          </button>
          <a className="btn-secondary" href={mailto}>
            Napisz do klienta
          </a>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              void navigator.clipboard?.writeText(mailBody).then(() => setCopied(true))
            }}
          >
            {copied ? 'Skopiowano' : 'Kopiuj treść maila'}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              if (confirm('Przywrócić ceny i warunki z kalkulatora? Twoje zmiany zostaną usunięte.')) setS(initialState(data))
            }}
          >
            Przywróć z kalkulatora
          </button>
        </div>
      </div>

      <article className="offer" aria-label={`Oferta ${s.offerNo}`}>
        <header className="offer__head">
          <div>
            <p className="offer__brand">{COMPANY.brand}</p>
            <p className="offer__seller">
              {COMPANY.legalName} {COMPANY.legalForm}
              <br />
              {COMPANY.street}, {COMPANY.city}
              <br />
              NIP {COMPANY.nip} · REGON {COMPANY.regon}
              <br />
              tel. {CONTACT.phone} · {CONTACT.email} · {COMPANY.www}
            </p>
          </div>
          <dl className="offer__meta">
            <dt>Oferta nr</dt>
            <dd>
              <Edit label="Numer oferty" value={s.offerNo} onChange={set('offerNo')} className="offer-edit--strong" />
            </dd>
            {data.number && (
              <>
                <dt>Do zapytania</dt>
                <dd>{data.number}</dd>
              </>
            )}
            <dt>Data</dt>
            <dd>
              <Edit label="Data wystawienia" type="date" value={s.issued} onChange={set('issued')} className="screen-only" />
              <span className="print-only">{plDate(s.issued)}</span>
            </dd>
            <dt>Ważna do</dt>
            <dd>
              <Edit label="Oferta ważna do" type="date" value={s.validUntil} onChange={set('validUntil')} className="screen-only" />
              <span className="print-only">{plDate(s.validUntil)}</span>
            </dd>
          </dl>
        </header>

        <section className="offer__buyer">
          <h2>Zamawiający</h2>
          <textarea
            className={`offer-edit offer-edit--area${s.buyer.trim() ? '' : ' offer-edit--empty'}`}
            aria-label="Zamawiający – nazwa i adres"
            placeholder="Imię i nazwisko / firma, adres, NIP"
            rows={3}
            value={s.buyer}
            onChange={(e) => set('buyer')(e.target.value)}
          />
          <p>
            {c.email}
            {c.phone && ` · tel. ${c.phone}`}
          </p>
          {c.notes && <p className="offer__notes">Uwagi klienta: {c.notes}</p>}
        </section>

        <table className="offer__table">
          <thead>
            <tr>
              <th>LP</th>
              <th>Rzut</th>
              <th>Front</th>
              <th className="num">Ilość</th>
              <th className="num">Cena netto / szt.</th>
              <th className="num">Wartość netto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td className="offer__plan">
                  <div className="offer__plan-box">
                    <PlanView config={r.config} />
                  </div>
                </td>
                <td>
                  <strong>
                    {r.result.code} {r.result.flutingCode}
                  </strong>
                  <br />
                  <span className="offer__desc">{describeConfig(r.config, r.result.flutingCode)}</span>
                </td>
                <td className="num">{r.qty} szt.</td>
                <td className="num">
                  <Edit
                    label={`Cena netto pozycji ${i + 1}`}
                    inputMode="decimal"
                    placeholder="cena"
                    value={s.unit[i] ?? ''}
                    onChange={setUnit(i)}
                    className="offer-edit--num"
                  />
                </td>
                <td className="num">{r.value === null ? '—' : money(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="offer__sum">
          <dt>Razem netto</dt>
          <dd>{money(net)}</dd>
          <dt>
            VAT <Edit label="Stawka VAT" inputMode="numeric" value={s.vatPct} onChange={set('vatPct')} className="offer-edit--pct" />%
          </dt>
          <dd>{money(vat)}</dd>
          <dt className="offer__gross">Razem brutto</dt>
          <dd className="offer__gross">{money(gross)}</dd>
          <dt>
            Zadatek <Edit label="Zadatek w procentach" inputMode="numeric" value={s.depositPct} onChange={set('depositPct')} className="offer-edit--pct" />%
          </dt>
          <dd>{money(deposit)}</dd>
        </dl>

        <section className="offer__how">
          <h2>Jak zamówić</h2>
          <ol>
            <li>
              Odpowiedz na e-mail z ofertą: <strong>„Akceptuję ofertę nr {s.offerNo}”</strong>.
            </li>
            <li>
              Wpłać zadatek <strong>{money(deposit)}</strong> w ciągu{' '}
              <Edit label="Dni na wpłatę zadatku" inputMode="numeric" value={s.depositDays} onChange={set('depositDays')} className="offer-edit--pct" /> dni na
              konto{' '}
              <Edit label="Numer konta" value={s.bankAccount} onChange={set('bankAccount')} placeholder="numer konta" className="offer-edit--account" />
              , tytuł przelewu: <strong>{s.offerNo}</strong>.
            </li>
            <li>Po zaksięgowaniu zadatku potwierdzimy zamówienie i rozpoczniemy produkcję.</li>
          </ol>
        </section>

        <section className="offer__terms">
          <h2>Warunki</h2>
          <ol>
            <li>Oferta jest ważna do {plDate(s.validUntil)}. Ceny w ofercie są cenami netto; do kwoty netto doliczamy VAT.</li>
            <li>
              Umowa zostaje zawarta z chwilą przyjęcia oferty przez Zamawiającego (odpowiedź e-mail z akceptacją). Kwota wpłacona
              po akceptacji jest zadatkiem w rozumieniu art. 394 Kodeksu cywilnego. Pozostała kwota jest płatna przed odbiorem.
            </li>
            <li>
              Termin realizacji:{' '}
              <Edit label="Termin realizacji" value={s.leadTime} onChange={set('leadTime')} className="offer-edit--wide" />.
            </li>
            <li>
              Fronty są wykonywane na indywidualne zamówienie, według wymiarów i rysunków podanych w ofercie. Akceptując ofertę,
              Zamawiający potwierdza wymiary, materiał, kolor i ryflowanie.
            </li>
            <li>
              Zamawiającemu będącemu konsumentem nie przysługuje prawo odstąpienia od umowy zawartej na odległość, ponieważ
              przedmiotem świadczenia jest rzecz wyprodukowana według jego specyfikacji (art. 38 ust. 1 pkt 3 ustawy o prawach
              konsumenta).
            </li>
          </ol>
          <textarea
            className={`offer-edit offer-edit--area${s.remarks.trim() ? '' : ' offer-edit--optional'}`}
            aria-label="Dodatkowe uwagi do oferty"
            placeholder="Dodatkowe uwagi (opcjonalnie – puste pole nie drukuje się)"
            rows={2}
            value={s.remarks}
            onChange={(e) => set('remarks')(e.target.value)}
          />
        </section>
      </article>
    </div>
  )
}
