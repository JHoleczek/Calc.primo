import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Czcionka z serwera strony (bez Google Fonts – żadne dane nie trafiają do Google).
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
import './index.css'
import App from './App.tsx'
import { OfferPage } from './components/OfferPage'
import { detectAdmin } from './lib/admin'
import { offerFromHash } from './lib/share'

// Link „Utwórz ofertę” z maila do biura (#oferta=…) otwiera edytor oferty zamiast kalkulatora.
const offer = offerFromHash(window.location.hash)

// Link biura wklejony do już otwartej karty zmienia tylko „#” – przeładuj, żeby go sprawdzić.
window.addEventListener('hashchange', () => {
  if (window.location.hash.startsWith('#biuro=')) window.location.reload()
})

const root = createRoot(document.getElementById('root')!)
if (offer) root.render(<StrictMode><OfferPage data={offer} /></StrictMode>)
// Tryb biura (tajny link #biuro=…) ustalany przed pierwszym renderem – osobny koszyk, ceny, PDF.
else void detectAdmin()
  .catch(() => false)
  .then((admin) => root.render(<StrictMode><App admin={admin} /></StrictMode>))
