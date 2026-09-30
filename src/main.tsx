import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Czcionka z serwera strony (bez Google Fonts – żadne dane nie trafiają do Google).
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import '@fontsource/figtree/600.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
