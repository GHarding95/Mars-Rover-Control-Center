import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import './LandingPage.css'

/** Code-split 3D scene so it downloads while the welcome overlay is up. */
const LandingScene = lazy(() =>
  import('./LandingScene').then((m) => ({ default: m.LandingScene }))
)

type LandingPageProps = {
  onEnter: () => void
}

function readReducedMotion(): boolean {
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/** Fires once the Suspense boundary above has committed (scene + async drei assets like Environment). */
function SceneReadyNotifier({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady()
  }, [onReady])
  return null
}

export default function LandingPage({ onEnter }: LandingPageProps) {
  const [reducedMotion, setReducedMotion] = useState(() => readReducedMotion())
  const [showWelcomeBoot, setShowWelcomeBoot] = useState(() => !readReducedMotion())
  const [bootExiting, setBootExiting] = useState(false)
  /** WebGL + scene assets committed; canvas is shown when true (still behind boot until exit). */
  const [sceneReady, setSceneReady] = useState(false)

  const handleSceneReady = useCallback(() => {
    setSceneReady(true)
    setBootExiting(true)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    if (mq.matches) setShowWelcomeBoot(false)
    const onChange = () => {
      const m = mq.matches
      setReducedMotion(m)
      if (m) setShowWelcomeBoot(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  /** If loading stalls, avoid blocking the UI forever. */
  useEffect(() => {
    if (!showWelcomeBoot || bootExiting) return
    const fallbackMs = 20_000
    const id = window.setTimeout(() => {
      setSceneReady(true)
      setBootExiting(true)
    }, fallbackMs)
    return () => window.clearTimeout(id)
  }, [showWelcomeBoot, bootExiting])

  return (
    <div
      className="landing-page"
      role="dialog"
      aria-modal="true"
      aria-labelledby="landing-title"
      aria-describedby="landing-desc"
    >
      <Canvas
        className={
          sceneReady ? 'landing-canvas' : 'landing-canvas landing-canvas--concealed'
        }
        shadows="percentage"
        camera={{ position: [0, 2.85, 12.5], fov: 45, near: 0.1, far: 200 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#050810']} />
        <fog attach="fog" args={['#050810', 18, 55]} />
        <Suspense fallback={null}>
          <LandingScene reducedMotion={reducedMotion} />
          <SceneReadyNotifier onReady={handleSceneReady} />
        </Suspense>
      </Canvas>

      {showWelcomeBoot && (
        <div
          className={bootExiting ? 'landing-boot landing-boot--exit' : 'landing-boot'}
          aria-hidden="true"
          onAnimationEnd={(e) => {
            if (e.target !== e.currentTarget) return
            if (e.animationName !== 'landing-boot-fadeout') return
            setShowWelcomeBoot(false)
          }}
        >
          <p className="landing-boot__welcome">Welcome</p>
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
            <span className="landing-enter-btn__sub">Press to initialize console</span>
          </button>
        </div>

        <footer className="landing-footer">
          <span className="landing-footer__item">Rover Simulation</span>
          <span className="landing-footer__dot" aria-hidden="true" />
          <span className="landing-footer__item">100×100 grid</span>
          <span className="landing-footer__dot" aria-hidden="true" />
          <span className="landing-footer__item">Portfolio demo</span>
        </footer>
      </div>
    </div>
  )
}
