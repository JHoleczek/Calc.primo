import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Czcionka z serwera strony (bez Google Fonts – żadne dane nie trafiają do Google).
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
import './index.css'
import App from './App.tsx'
import { OfferPage } from './components/OfferPage'
import { offerFromHash } from './lib/share'

// Link „Utwórz ofertę” z maila do biura (#oferta=…) otwiera edytor oferty zamiast kalkulatora.
const offer = offerFromHash(window.location.hash)

createRoot(document.getElementById('root')!).render(<StrictMode>{offer ? <OfferPage data={offer} /> : <App />}</StrictMode>)
