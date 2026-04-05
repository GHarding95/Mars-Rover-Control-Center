import {
  lazy,
  Suspense,
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

function readNarrowLandingLayout(): boolean {
  return typeof window !== 'undefined'
    ? window.matchMedia('(max-width: 500px)').matches
    : false
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  const liteGraphics = false
  const skipWebGLForNetwork = false
  const [reducedMotion, setReducedMotion] = useState(() => readReducedMotion())
  const [narrowLayout, setNarrowLayout] = useState(() => readNarrowLandingLayout())
  /** Load WebGL only after main thread is idle — keeps first paint off the three/fiber critical path. */
  const [canvasReady, setCanvasReady] = useState(false)

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
    const mq = window.matchMedia('(max-width: 500px)')
    setNarrowLayout(mq.matches)
    const onChange = () => setNarrowLayout(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <div
      className={
        liteGraphics ? 'landing-page landing-page--lite' : 'landing-page'
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="landing-title"
      aria-describedby="landing-desc"
    >
      {!reducedMotion && canvasReady && (
        <Suspense fallback={null}>
          <LandingCanvas
            liteGraphics={liteGraphics}
            reducedMotion={reducedMotion}
            narrowLayout={narrowLayout}
          />
        </Suspense>
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
    </div>
  )
}
