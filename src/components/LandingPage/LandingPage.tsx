import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from 'react'
import './LandingPage.css'

const LandingCanvas = lazy(() => import('./LandingCanvas'))

type LandingPageProps = {
  onEnter: () => void
}

function readReducedMotion(): boolean {
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/** True for portrait phones and short viewports (e.g. mobile landscape) so 3D + overlay stay coherent. */
function readNarrowLandingLayout(): boolean {
  return typeof window !== 'undefined'
    ? window.matchMedia('(max-width: 500px), (max-height: 480px)').matches
    : false
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  const liteGraphics = false
  const skipWebGLForNetwork = false
  const [reducedMotion, setReducedMotion] = useState(() => readReducedMotion())
  const [narrowLayout, setNarrowLayout] = useState(() => readNarrowLandingLayout())
  /** Load WebGL only after main thread is idle — keeps first paint off the three/fiber critical path. */
  const [canvasReady, setCanvasReady] = useState(false)
  /** Full-screen black veil until WebGL first frame; then fades out over the whole landing UI. */
  const [bootRevealAllowed, setBootRevealAllowed] = useState(false)
  const [bootVeilGone, setBootVeilGone] = useState(false)

  const onBootReady = useCallback(() => {
    setBootRevealAllowed(true)
  }, [])

  useEffect(() => {
    if (reducedMotion || skipWebGLForNetwork) {
      setCanvasReady(false)
      return
    }
    let cancelled = false
    const run = () => {
      if (!cancelled) setCanvasReady(true)
    }
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(run, { timeout: 2500 })
      return () => {
        cancelled = true
        cancelIdleCallback(id)
      }
    }
    const tid = window.setTimeout(run, 1)
    return () => {
      cancelled = true
      window.clearTimeout(tid)
    }
  }, [reducedMotion, skipWebGLForNetwork])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = () => setReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 500px), (max-height: 480px)')
    setNarrowLayout(mq.matches)
    const onChange = () => setNarrowLayout(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reducedMotion || !canvasReady || bootVeilGone) return
    if (bootRevealAllowed) return
    const id = window.setTimeout(() => setBootRevealAllowed(true), 20_000)
    return () => window.clearTimeout(id)
  }, [reducedMotion, canvasReady, bootVeilGone, bootRevealAllowed])

  return (
    <div
      className={
        liteGraphics ? 'landing-page landing-page--lite' : 'landing-page'
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="landing-title"
      aria-describedby="landing-desc"
      aria-busy={!reducedMotion && !bootVeilGone}
    >
      {!reducedMotion && canvasReady && (
        <div className="landing-webgl-shell">
          {/* Solid black under WebGL: shows instantly while the lazy canvas chunk loads (Suspense null). */}
          <div className="landing-webgl-black-base" aria-hidden="true" />
          <Suspense fallback={null}>
            <LandingCanvas
              liteGraphics={liteGraphics}
              reducedMotion={reducedMotion}
              narrowLayout={narrowLayout}
              onBootReady={onBootReady}
            />
          </Suspense>
        </div>
      )}

      <div className="landing-overlay">
        <div className="landing-scanlines" aria-hidden="true" />
        <div className="landing-vignette" aria-hidden="true" />

        <header className="landing-header">
          <p className="landing-badge">NASA-inspired simulation</p>
          <h1 id="landing-title" className="landing-title">
            <span className="landing-title__line">Mars Rover</span>
            <span className="landing-title__accent">Control</span>
          </h1>
          <p id="landing-desc" className="landing-tagline">
            Navigate the red planet. Execute mission commands. Reach the perimeter.
          </p>
        </header>

        <div className="landing-cta">
          <button
            type="button"
            className="landing-enter-btn"
            onClick={onEnter}
          >
            <span className="landing-enter-btn__label">Enter Mission Control</span>
            <span className="landing-enter-btn__sub">Press to initialise console</span>
          </button>
        </div>

        <div className="landing-footer-block">
          <footer className="landing-footer">
            <span className="landing-footer__item">Rover Simulation</span>
            <span className="landing-footer__dot" aria-hidden="true" />
            <span className="landing-footer__item">100×100 grid</span>
            <span className="landing-footer__dot" aria-hidden="true" />
            <span className="landing-footer__item">Portfolio demo</span>
          </footer>
          <p className="landing-credit">
            © {new Date().getFullYear()} Glen Harding
          </p>
        </div>
      </div>

      {!reducedMotion && !bootVeilGone && (
        <div
          className={
            bootRevealAllowed
              ? 'landing-boot-veil landing-boot-veil--out'
              : 'landing-boot-veil'
          }
          aria-hidden="true"
          onTransitionEnd={(e) => {
            if (e.target !== e.currentTarget) return
            if (e.propertyName !== 'opacity') return
            if (bootRevealAllowed) setBootVeilGone(true)
          }}
        />
      )}
    </div>
  )
}
