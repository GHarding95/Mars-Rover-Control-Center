import {
  lazy,
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'

/** Code-split 3D scene: heavy three work loads in a separate chunk from the R3F shell. */
const LandingScene = lazy(() =>
  import('./LandingScene').then((m) => ({ default: m.LandingScene }))
)

/** Fires after shader compile + first drawn frame so the overlay does not lift on a blank/hitching WebGL surface. */
function FirstPaintReady({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree()
  const compiled = useRef(false)
  const fired = useRef(false)

  useLayoutEffect(() => {
    if (compiled.current) return
    compiled.current = true
    gl.compile(scene, camera)
  }, [gl, scene, camera])

  useFrame(() => {
    if (fired.current) return
    fired.current = true
    requestAnimationFrame(() => {
      onReady()
    })
  })
  return null
}

export type LandingCanvasProps = {
  liteGraphics: boolean
  reducedMotion: boolean
  narrowLayout: boolean
  /** Called once when the GPU has compiled and the first frame is ready; parent lifts the full-screen boot veil. */
  onBootReady?: () => void
}

/**
 * WebGL subtree — parent owns a full-screen black veil until `onBootReady` fires.
 */

export default function LandingCanvas({
  liteGraphics,
  reducedMotion,
  narrowLayout,
  onBootReady,
}: LandingCanvasProps) {
  const readyRef = useRef(false)
  const signalReady = useCallback(() => {
    if (readyRef.current) return
    readyRef.current = true
    onBootReady?.()
  }, [onBootReady])

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
          <FirstPaintReady onReady={signalReady} />
        </Suspense>
      </Canvas>
    </div>
  )
}
