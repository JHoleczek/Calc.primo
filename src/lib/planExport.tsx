import type { ReactElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { PlanContent } from '../components/PlanDrawing'
import type { Configuration } from './calculate'
import { planGeometry } from './planGeometry'

const EXPORT_WIDTH = 1600

/** Style rysunku osadzane w pliku (plik ma działać bez arkusza strony); grubości linii × `k`. */
const exportCss = (k: number) =>
  `
.plan * { vector-effect: non-scaling-stroke; }
.plan__section { stroke: #f2f2f2; stroke-width: 1.2px; stroke-linejoin: round; }
.plan__hatch { stroke: #9b9b9b; }
.plan__face { fill: none; stroke: #f2f2f2; stroke-width: 2px; stroke-linecap: round; }
.plan__seam { stroke: #f2f2f2; stroke-width: 0.8px; stroke-dasharray: 2 3; }
.plan__thin { fill: none; stroke: #9b9b9b; stroke-width: 0.8px; }
.plan__arrow { fill: #9b9b9b; }
.plan__dim line { stroke: #9b9b9b; stroke-width: 0.8px; }
.plan__dim .plan__ext { stroke-dasharray: 1 3; }
.plan__dashed { fill: none; stroke: #9b9b9b; stroke-width: 0.8px; stroke-dasharray: 5 4; }
.plan__text, .plan__dim text { fill: #e4e4e4; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 500; text-anchor: middle; dominant-baseline: middle; }
.plan__caption { fill: #8a8a8a; font-family: 'Helvetica Neue', Arial, sans-serif; }
.plan__title { fill: #f2f2f2; font-family: 'Helvetica Neue', Arial, sans-serif; font-weight: 600; letter-spacing: 0.06em; }
.plan__rule { stroke: #3a3a3a; stroke-width: 1px; }
`.replace(/([\d.]+)px/g, (_, n: string) => `${+n * k}px`)

/** Renderuje element do tekstu HTML/SVG w odłączonym węźle DOM (bez react-dom/server). */
export function renderMarkup(element: ReactElement): string {
  const host = document.createElement('div')
  const root = createRoot(host)
  flushSync(() => root.render(element))
  const html = host.innerHTML
  root.unmount()
  return html
}

export interface PlanExport {
  svg: string
  width: number
  height: number
}

/**
 * Samodzielny plik SVG z całym rysunkiem (bez względu na bieżący zoom),
 * czarnym tłem, dekoracyjną kratką i tabliczką z opisem frontu.
 */
export function exportPlanSvg(
  config: Configuration,
  title: string,
  subtitle: string,
  /** Skala pliku (np. 2 dla PNG) – ten sam układ, grubsze linie i większe wymiary w pikselach. */
  scale = 1,
  render: (element: ReactElement) => string = renderMarkup,
): PlanExport {
  const geo = planGeometry(config)
  const { x, y, w, h } = geo.view
  const px = w / EXPORT_WIDTH
  const band = px * 72
  const width = EXPORT_WIDTH * scale
  const height = Math.round(((h + band) / px) * scale)
  const grid = px * 24

  const markup = render(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="plan"
      width={width}
      height={height}
      viewBox={`${x} ${y} ${w} ${h + band}`}
    >
      <title>{`${title} – rzut z góry`}</title>
      <style>{exportCss(scale)}</style>
      <defs>
        <pattern id="grid" width={grid} height={grid} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path d={`M ${grid} 0 L 0 0 L 0 ${grid}`} fill="none" stroke="#1b1b1b" strokeWidth={px} vectorEffect="none" />
        </pattern>
      </defs>
      <rect x={x} y={y} width={w} height={h + band} fill="#0c0c0c" />
      <rect x={x} y={y} width={w} height={h} fill="url(#grid)" />
      <PlanContent geo={geo} px={px} hatchId="hatch" />
      <line className="plan__rule" x1={x} y1={y + h} x2={x + w} y2={y + h} />
      <text className="plan__title" x={x + px * 24} y={y + h + px * 32} fontSize={px * 18}>
        {title}
      </text>
      <text className="plan__caption" x={x + px * 24} y={y + h + px * 56} fontSize={px * 13}>
        {subtitle}
      </text>
    </svg>,
  )
  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\n${markup}`, width, height }
}

/** PNG narysowany z pliku SVG (w jego rozmiarze). */
export async function svgToPng({ svg, width, height }: PlanExport): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Nie udało się przygotować obrazu.'))
      img.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Brak obsługi canvas.')
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Nie udało się zapisać PNG.'))), 'image/png'),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
