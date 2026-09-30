import { DEFAULT_CONFIGURATION, normalizeConfiguration, type Configuration } from './calculate'

// Link do konkretnego frontu: konfiguracja zakodowana w adresie (#rzut=…).
// Otwiera kalkulator z tym frontem i od razu pokazuje rzut z góry (np. z maila z zamówieniem).

const PREFIX = '#rzut='

const toBase64Url = (text: string) => {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (code: string) => {
  const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'))
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

/** Pełny adres kalkulatora otwierający rzut danego frontu. */
export function planLink(config: Configuration, base: string): string {
  // Tylko pola różne od domyślnych – krótszy link; brakujące uzupełnia normalizeConfiguration.
  const diff = Object.fromEntries(
    Object.entries(config).filter(([k, v]) => DEFAULT_CONFIGURATION[k as keyof Configuration] !== v),
  )
  return `${base.split('#')[0]}${PREFIX}${toBase64Url(JSON.stringify(diff))}`
}

/** Konfiguracja z adresu (#rzut=…) albo null. */
export function configFromHash(hash: string): Configuration | null {
  if (!hash.startsWith(PREFIX)) return null
  try {
    const data: unknown = JSON.parse(fromBase64Url(hash.slice(PREFIX.length)))
    return data && typeof data === 'object' ? normalizeConfiguration(data as Partial<Configuration>) : null
  } catch {
    return null
  }
}
