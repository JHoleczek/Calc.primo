// Tryb biura (tylko dla Primo): otwierany tajnym linkiem …/kalkulator/#biuro=KLUCZ.
// W kodzie jest tylko skrót SHA-256 klucza, nie sam klucz. Po pierwszym wejściu przeglądarka
// zapamiętuje tryb biura (do „Wyjdź z trybu biura”), a klucz znika z paska adresu.

const ADMIN_KEY_SHA256 = '8a7af5873c7173e7f3d13f7580af79dc7795a81b193464239764afeaa8490d86'
const STORAGE_KEY = 'primo-biuro-v1'

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function remembered(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === ADMIN_KEY_SHA256
  } catch {
    return false
  }
}

/** Czy otworzyć kalkulator w trybie biura (link z kluczem albo zapamiętane wcześniej). */
export async function detectAdmin(): Promise<boolean> {
  const match = /^#biuro=([\w-]+)$/.exec(window.location.hash)
  if (match) {
    history.replaceState(null, '', window.location.pathname + window.location.search)
    if (crypto?.subtle && (await sha256(match[1])) === ADMIN_KEY_SHA256) {
      try {
        localStorage.setItem(STORAGE_KEY, ADMIN_KEY_SHA256)
      } catch {
        // Bez storage tryb biura działa do odświeżenia strony.
      }
      return true
    }
  }
  return remembered()
}

export function leaveAdmin() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nic
  }
  window.location.reload()
}
