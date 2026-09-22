// Przybliżona zamiana wpisanego koloru farby na kolor ekranowy (hex) do podglądu.
// Obsługuje: RAL (tabela najpopularniejszych), NCS (przybliżenie z notacji),
// hex / rgb() oraz kilka polskich nazw. Kolory są poglądowe – ekran nie oddaje
// wzornika.

export type PaintSource = 'RAL' | 'NCS' | 'hex' | 'nazwa'

export interface PaintColor {
  hex: string
  source: PaintSource
}

/** Przybliżone wartości sRGB popularnych kolorów RAL. */
const RAL: Record<string, string> = {
  '1013': '#e3d9c6',
  '1015': '#e6d2b5',
  '3004': '#6b1c23',
  '5011': '#232c3f',
  '6029': '#006f3d',
  '7016': '#383e42',
  '7021': '#2f3234',
  '7035': '#cbd0cc',
  '7037': '#7d7f7d',
  '7039': '#6c6960',
  '7044': '#cac4b0',
  '8017': '#442f29',
  '9001': '#e9e0d2',
  '9002': '#d7d5cb',
  '9003': '#f4f4f4',
  '9005': '#0a0a0a',
  '9010': '#f4f0e6',
  '9016': '#f6f6f6',
  '9018': '#cfd3cd',
}

const NAMES: Record<string, string> = {
  biały: '#f4f3ef',
  bialy: '#f4f3ef',
  czarny: '#161616',
  szary: '#8c8c8a',
  grafit: '#3a3d40',
  grafitowy: '#3a3d40',
  beżowy: '#d8c7a8',
  bezowy: '#d8c7a8',
  beż: '#d8c7a8',
  kremowy: '#ece3cf',
  antracyt: '#34383b',
  zielony: '#3f6b4c',
  granatowy: '#1f2a44',
  niebieski: '#3a5f8f',
  czerwony: '#9b2a2a',
  brązowy: '#5a3d2b',
  brazowy: '#5a3d2b',
}

/** Elementarne barwy NCS (przybliżenie sRGB). */
const NCS_HUES: Record<string, [number, number, number]> = {
  Y: [255, 205, 0],
  R: [196, 2, 51],
  B: [0, 120, 190],
  G: [0, 159, 107],
}

const toHex = (rgb: [number, number, number]) =>
  '#' + rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')

function ncsToHex(blackness: number, chroma: number, hue: string): string | null {
  let base: [number, number, number]
  if (hue === 'N') {
    base = [128, 128, 128]
  } else {
    const m = /^([YRBG])(?:(\d{1,2})([YRBG]))?$/.exec(hue)
    if (!m) return null
    const from = NCS_HUES[m[1]]
    const to = m[3] ? NCS_HUES[m[3]] : from
    const t = m[2] ? Number(m[2]) / 100 : 0
    base = [0, 1, 2].map((k) => from[k] * (1 - t) + to[k] * t) as [number, number, number]
  }
  const s = blackness / 100
  const c = hue === 'N' ? 0 : chroma / 100
  const w = Math.max(0, 1 - s - c)
  return toHex([0, 1, 2].map((k) => 255 * w + base[k] * c) as [number, number, number])
}

export function resolvePaintColor(input: string): PaintColor | null {
  const text = input.trim()
  if (text === '') return null
  const lower = text.toLowerCase()

  const ral = /ral\s*(\d{4})/i.exec(text)
  if (ral && RAL[ral[1]]) return { hex: RAL[ral[1]], source: 'RAL' }

  // NCS, np. „NCS S 0502-Y”, „S 1050-Y90R”, „2005-G80Y”.
  const ncs = /(?:ncs\s*)?(?:s\s*)?(\d{2})(\d{2})\s*-\s*([YRBGN](?:\d{1,2}[YRBG])?)\b/i.exec(text)
  if (ncs) {
    const hex = ncsToHex(Number(ncs[1]), Number(ncs[2]), ncs[3].toUpperCase())
    if (hex) return { hex, source: 'NCS' }
  }

  const hex = /#?([0-9a-f]{6}|[0-9a-f]{3})\b/i.exec(text)
  if (hex && (text.startsWith('#') || /^[0-9a-f]{6}$/i.test(text))) {
    const h = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1]
    return { hex: `#${h.toLowerCase()}`, source: 'hex' }
  }

  for (const [name, value] of Object.entries(NAMES)) {
    if (lower.split(/[\s,.;]+/).includes(name)) return { hex: value, source: 'nazwa' }
  }
  return null
}
