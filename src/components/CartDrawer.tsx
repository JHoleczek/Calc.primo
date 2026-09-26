import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select, [tabindex]:not([tabindex="-1"])'

/**
 * Panel koszyka wysuwany z prawej. Zamykanie: ✕, Esc, kliknięcie w tło.
 * Gdy otwarty, fokus zostaje w panelu, a strona pod spodem nie przewija się;
 * po zamknięciu fokus wraca tam, skąd panel otwarto.
 */
export function CartDrawer({ open, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLElement>('.drawer__close')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open])

  return (
    <div className={`drawer${open ? ' drawer--open' : ''}`} id="cart-drawer" inert={!open}>
      <div className="drawer__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="cart-title" ref={panel}>
        {children}
      </div>
    </div>
  )
}

/** Ikona koszyka (kontur) – dekoracyjna, opis w etykiecie przycisku. */
export function CartIcon() {
  return (
    <svg className="cart-button__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path
        d="M2.5 3.5h2.6l2.2 11.2h11.4l2-8H6.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="miter"
        strokeLinecap="square"
      />
      <circle cx="9" cy="19.2" r="1.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="19.2" r="1.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function CartButton({ count, open, onClick }: { count: number; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="cart-button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="cart-drawer"
      aria-label={`Koszyk – ${count} szt.`}
    >
      <CartIcon />
      {count > 0 && (
        <span className="cart-button__badge" aria-hidden="true">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
