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
import { PlanView } from './PlanView'

// three.js jest duży – ładujemy go osobno, żeby formularz był gotowy od razu.
const FrontScene = lazy(() => import('./viz3d/FrontScene'))

type View = '3d' | 'plan'

interface Props {
  config: Configuration
  result: Result
}

export function VisualizationPanel({ config, result }: Props) {
  const [view, setView] = useState<View>('3d')

  const frontType = FRONT_TYPES.find((t) => t.id === config.typeId) ?? FRONT_TYPES[0]
  const material = MATERIALS.find((m) => m.id === config.materialId) ?? MATERIALS[0]
  const fluting = FLUTINGS.find((f) => f.id === config.flutingId) ?? FLUTINGS[0]
  const paint = useMemo(() => resolvePaintColor(config.color), [config.color])

  // Niepoprawną wysokość z pola liczbowego zastępujemy najbliższą sensowną, żeby model nie znikał.
  const heightMm = Number.isFinite(config.heightMm)
    ? Math.min(HEIGHT_RANGE.max, Math.max(HEIGHT_RANGE.min, config.heightMm))
    : DEFAULT_HEIGHT_MM
  const { typeId, radiusMm, endingId, lengthMm, widthMm, sideExtension, zMm } = config

  const geometry = useMemo<FrontGeometryInput | null>(() => {
    const path = frontPath({
      typeId,
      radiusMm,
      endingId,
      lengthMm: Number.isFinite(lengthMm) ? lengthMm : radiusMm + 1,
      widthMm,
      sideExtension,
      zMm: Number.isFinite(zMm) ? zMm : radiusMm + 1,
    })
    return path ? { path, thicknessMm: THICKNESS_MM, heightMm, fluting: fluting.profile } : null
  }, [typeId, radiusMm, endingId, lengthMm, widthMm, sideExtension, zMm, heightMm, fluting.profile])

  const colorText = config.color.trim()

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
      </div>

      <div className={`viz__stage${view === 'plan' ? ' viz__stage--plan' : ''}`} role="tabpanel" aria-labelledby={`viz-tab-${view}`}>
        {!geometry ? (
          <p className="viz__loading">{frontType.name}: wykonanie na indywidualne zamówienie – brak podglądu.</p>
        ) : view === '3d' ? (
          <Suspense fallback={<p className="viz__loading">Ładowanie modelu 3D…</p>}>
            <FrontScene
              geometry={geometry}
              materialId={material.id}
              colorHex={paint?.hex ?? null}
              fallback={<PlanView config={config} />}
            />
          </Suspense>
        ) : (
          <PlanView config={config} />
        )}
      </div>

      <dl className="viz__meta">
        {result.code && (
          <div>
            <dt>Kod</dt>
            <dd>{result.code}</dd>
          </div>
        )}
        <div>
          <dt>Typ</dt>
          <dd>{frontType.name}</dd>
        </div>
        {geometry && (
          <div>
            <dt>R / H</dt>
            <dd>
              {config.radiusMm} / {Number.isFinite(config.heightMm) ? config.heightMm : '—'} mm
            </dd>
          </div>
        )}
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
