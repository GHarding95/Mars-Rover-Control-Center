import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Canvas } from '@react-three/fiber'

/** Code-split 3D scene: heavy three work loads in a separate chunk from the R3F shell. */
const LandingScene = lazy(() =>
  import('./LandingScene').then((m) => ({ default: m.LandingScene }))
)

function SceneReadyNotifier({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady()
  }, [onReady])
  return null
}

export type LandingCanvasProps = {
  liteGraphics: boolean
  reducedMotion: boolean
  narrowLayout: boolean
}

/**
 * WebGL subtree — black layer fades out once the scene commits so the 3D view
 * appears to fade in smoothly (does not cover the UI overlay above the stack).
 */
export default function LandingCanvas({
  liteGraphics,
  reducedMotion,
  narrowLayout,
}: LandingCanvasProps) {
  const [sceneReady, setSceneReady] = useState(false)
  const [fadeLayerGone, setFadeLayerGone] = useState(false)

  const announcedRef = useRef(false)
  const announceReady = useCallback(() => {
    if (announcedRef.current) return
    announcedRef.current = true
    setSceneReady(true)
  }, [])

  useEffect(() => {
    if (sceneReady) return
    const id = window.setTimeout(() => announceReady(), 20_000)
    return () => window.clearTimeout(id)
  }, [sceneReady, announceReady])

  return (
    <div className="landing-webgl-stack">
      <Canvas
        className="landing-canvas"
        shadows={liteGraphics ? false : 'percentage'}
        camera={{ position: [0, 2.85, 12.5], fov: 45, near: 0.1, far: 200 }}
        gl={{
          antialias: !liteGraphics,
          alpha: false,
          powerPreference: liteGraphics ? 'low-power' : 'high-performance',
          stencil: false,
          depth: true,
        }}
        dpr={liteGraphics ? 1 : [1, 2]}
      >
        <color attach="background" args={['#050810']} />
        <fog attach="fog" args={['#050810', 18, 55]} />
        <Suspense fallback={null}>
          <LandingScene
            reducedMotion={reducedMotion}
            narrowLayout={narrowLayout}
            liteGraphics={liteGraphics}
          />
          <SceneReadyNotifier onReady={announceReady} />
        </Suspense>
      </Canvas>

      {!reducedMotion && !fadeLayerGone && (
        <div
          className={
            sceneReady
              ? 'landing-webgl-fade landing-webgl-fade--out'
              : 'landing-webgl-fade'
          }
          aria-hidden="true"
          onTransitionEnd={(e) => {
            if (e.target !== e.currentTarget) return
            if (e.propertyName !== 'opacity') return
            if (sceneReady) setFadeLayerGone(true)
          }}
        />
      )}
    </div>
  )
}
