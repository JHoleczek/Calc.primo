import { lazy, Suspense, useMemo, useState } from 'react'
import {
  DEFAULT_HEIGHT_MM,
  FLUTINGS,
  FRONT_TYPES,
  HEIGHT_RANGE,
  MATERIALS,
  SMOOTH_FLUTING_ID,
  THICKNESS_MM,
} from '../config/catalog'
import type { Configuration, Result } from '../lib/calculate'
import type { FrontGeometryInput } from '../lib/frontGeometry'
import { frontPath } from '../lib/frontPath'
import { resolvePaintColor } from '../lib/paintColor'
import { exportPlanSvg, svgToPng } from '../lib/planExport'
import { PlanView } from './PlanView'

// three.js jest duży – ładujemy go osobno, żeby formularz był gotowy od razu.
const FrontScene = lazy(() => import('./viz3d/FrontScene'))

type View = '3d' | 'plan'
type DownloadFormat = 'svg' | 'png'

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const fmtNum = (v: number, digits: number) =>
  Number.isFinite(v) ? v.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—'

interface Props {
  config: Configuration
  result: Result
}

export function VisualizationPanel({ config, result }: Props) {
  const [view, setView] = useState<View>('3d')

  const frontType = FRONT_TYPES.find((t) => t.id === config.typeId) ?? FRONT_TYPES[0]
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]
  // Ryflowanie po regułach materiału (laminat = tylko gładki) – tak jak w wyniku.
  const fluting = FLUTINGS.find((f) => f.id === result.flutingCode) ?? FLUTINGS[0]
  const paint = useMemo(() => resolvePaintColor(config.color), [config.color])

  // Niepoprawną wysokość z pola liczbowego zastępujemy najbliższą sensowną, żeby model nie znikał.
  const heightMm = Number.isFinite(config.heightMm)
    ? Math.min(HEIGHT_RANGE.max, Math.max(HEIGHT_RANGE.min, config.heightMm))
    : DEFAULT_HEIGHT_MM
  const { typeId, radiusMm, endingId, lengthMm, widthMm, sideExtension, zMm } = config

  const geometry = useMemo<FrontGeometryInput>(() => {
    const path = frontPath({
      typeId,
      radiusMm,
      endingId,
      lengthMm: Number.isFinite(lengthMm) ? lengthMm : radiusMm + 1,
      widthMm,
      sideExtension,
      zMm: Number.isFinite(zMm) ? zMm : radiusMm + 1,
    })
    return { path, thicknessMm: THICKNESS_MM, heightMm, fluting: fluting.profile }
  }, [typeId, radiusMm, endingId, lengthMm, widthMm, sideExtension, zMm, heightMm, fluting.profile])

  const colorText = config.color.trim()

  const [busy, setBusy] = useState<DownloadFormat | null>(null)
  const [downloadError, setDownloadError] = useState('')
  const download = async (format: DownloadFormat) => {
    setBusy(format)
    setDownloadError('')
    try {
      const title = `${result.code} ${result.flutingCode}`
      const subtitle = [
        frontType.name,
        `R ${config.radiusMm} mm`,
        `H ${heightMm} mm`,
        `grubość ${THICKNESS_MM} mm`,
        'wymiary w mm',
        'Primo Meble',
      ].join('  ·  ')
      const file = await exportPlanSvg(config, title, subtitle, format === 'png' ? 2 : 1)
      const blob = format === 'svg' ? new Blob([file.svg], { type: 'image/svg+xml' }) : await svgToPng(file)
      saveBlob(blob, `${result.code}-${result.flutingCode}-rzut.${format}`)
    } catch {
      setDownloadError('Nie udało się pobrać rysunku.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="viz">
      <div className="viz__bar">
        <div className="viz__tabs" role="tablist" aria-label="Widok">
          {(
            [
              ['3d', 'Model 3D'],
              ['plan', 'Rzut z góry'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`viz-tab-${id}`}
              aria-selected={view === id}
              className={`viz__tab${view === id ? ' viz__tab--active' : ''}`}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {view === '3d' && <span className="viz__hint">Przeciągnij, aby obrócić · kółko / szczypanie = zoom</span>}
        {view === 'plan' && (
          <div className="viz__download" role="group" aria-label="Pobierz rysunek techniczny">
            <span className="viz__download-label" aria-hidden="true">
              Pobierz rysunek
            </span>
            {(['svg', 'png'] as const).map((f) => (
              <button
                key={f}
                type="button"
                className="viz__download-btn"
                onClick={() => void download(f)}
                disabled={busy !== null}
                aria-label={`Pobierz rysunek techniczny jako ${f.toUpperCase()}`}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10" />
                </svg>
                {f.toUpperCase()}
              </button>
            ))}
            {downloadError && (
              <span className="viz__download-error" role="alert">
                {downloadError}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={`viz__stage${view === 'plan' ? ' viz__stage--plan' : ''}`} role="tabpanel" aria-labelledby={`viz-tab-${view}`}>
        {view === '3d' ? (
          <Suspense fallback={<p className="viz__loading">Ładowanie modelu 3D…</p>}>
            <FrontScene
              geometry={geometry}
              materialId={material.id}
              colorHex={paint?.hex ?? null}
              fallback={<PlanView config={config} />}
            />
          </Suspense>
        ) : (
          <PlanView config={config} interactive />
        )}
      </div>

      <dl className="viz__meta">
        <div className="viz__meta-result">
          <dt>Wynik</dt>
          <dd>
            {result.errors.length > 0 ? '—' : `${fmtNum(result.areaM2, 3)} m²`}
          </dd>
        </div>
        <div>
          <dt>Kod</dt>
          <dd>{result.code}</dd>
        </div>
        <div>
          <dt>Typ</dt>
          <dd>{frontType.name}</dd>
        </div>
        <div>
          <dt>R / H</dt>
          <dd>
            {config.radiusMm} / {Number.isFinite(config.heightMm) ? config.heightMm : '—'} mm
          </dd>
        </div>
        {fluting.id !== SMOOTH_FLUTING_ID && (
          <div>
            <dt>Ryflowanie</dt>
            <dd>
              {fluting.id} {fluting.name}
            </dd>
          </div>
        )}
        {colorText !== '' && (
          <div>
            <dt>Kolor</dt>
            <dd className="viz__color">
              {paint && <span className="viz__swatch" style={{ background: paint.hex }} aria-hidden="true" />}
              {colorText}
              <span className="viz__color-note">{paint ? `(${paint.source}, poglądowo)` : '(nierozpoznany)'}</span>
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}
