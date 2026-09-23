import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// SINGLE_FILE=1 składa wszystko w jeden plik JS (podgląd jako pojedynczy HTML).
const singleFile = process.env.SINGLE_FILE === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Osobny chunk z three.js (~1 MB) jest ładowany leniwie.
    chunkSizeWarningLimit: 1200,
    // W pojedynczym pliku HTML obrazki katalogowe muszą być wstawione inline.
    assetsInlineLimit: singleFile ? 10_000_000 : 4096,
    rollupOptions: singleFile ? { output: { inlineDynamicImports: true } } : undefined,
  },
})
