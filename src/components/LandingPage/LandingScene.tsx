import { useRef, useMemo, useLayoutEffect, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RealisticStarfield } from './RealisticStarfield'

function LandingFloat({
  children,
  speed = 1,
  rotationIntensity = 1,
  floatIntensity = 1,
  floatingRange = [-0.1, 0.1] as [number, number],
}: {
  children: ReactNode
  speed?: number
  rotationIntensity?: number
  floatIntensity?: number
  floatingRange?: [number, number]
}) {
  const ref = useRef<THREE.Group>(null)
  const offset = useRef(Math.random() * 10000)
  useFrame((state) => {
    if (!ref.current || speed === 0) return
    const t = offset.current + state.clock.elapsedTime
    ref.current.rotation.x = (Math.cos((t / 4) * speed) / 8) * rotationIntensity
    ref.current.rotation.y = (Math.sin((t / 4) * speed) / 8) * rotationIntensity
    ref.current.rotation.z = (Math.sin((t / 4) * speed) / 20) * rotationIntensity
    let yPosition = Math.sin((t / 4) * speed) / 10
    yPosition = THREE.MathUtils.mapLinear(
      yPosition,
      -0.1,
      0.1,
      floatingRange[0],
      floatingRange[1]
    )
    ref.current.position.y = yPosition * floatIntensity
    ref.current.updateMatrix()
  })
  return (
    <group>
      <group ref={ref} matrixAutoUpdate={false}>
        {children}
      </group>
    </group>
  )
}

/** Lightweight Mars — solid material only (no procedural canvas textures). */
function MarsBody({
  reducedMotion,
  narrowLayout,
}: {
  reducedMotion: boolean
  narrowLayout: boolean
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y += delta * 0.05
  })

  const position = narrowLayout
    ? ([0, 3.15, -15.2] as const)
    : ([-9, -0.5, -14] as const)
  const scale = narrowLayout ? 2.75 : 3.2

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshStandardMaterial
        color="#7a4a38"
        roughness={0.95}
        metalness={0.04}
        emissive="#2a1410"
        emissiveIntensity={0.05}
      />
    </mesh>
  )
}

/** S-IC first stage: eight alternating black/white vertical stripes (Saturn V roll pattern). */
function SaturnRollPatternStage({
  yBottom,
  height,
  radiusBottom,
  radiusTop,
}: {
  yBottom: number
  height: number
  radiusBottom: number
  radiusTop: number
}) {
  const stripes = 8
  const theta = (Math.PI * 2) / stripes
  const cy = yBottom + height / 2
  return (
    <>
      {Array.from({ length: stripes }, (_, i) => {
        const isWhite = i % 2 === 0
        return (
          <mesh key={i} position={[0, cy, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[radiusTop, radiusBottom, height, 32, 1, false, i * theta, theta]} />
            <meshPhysicalMaterial
              color={isWhite ? '#e6e8ec' : '#131518'}
              metalness={isWhite ? 0.32 : 0.12}
              roughness={isWhite ? 0.48 : 0.82}
              clearcoat={isWhite ? 0.18 : 0.04}
              clearcoatRoughness={0.35}
              reflectivity={isWhite ? 0.45 : 0.2}
            />
          </mesh>
        )
      })}
    </>
  )
}

function SaturnWhiteStage({
  yBottom,
  height,
  radiusBottom,
  radiusTop,
}: {
  yBottom: number
  height: number
  radiusBottom: number
  radiusTop: number
}) {
  const cy = yBottom + height / 2
  return (
    <mesh position={[0, cy, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[radiusTop, radiusBottom, height, 40, 1]} />
      <meshPhysicalMaterial
        color="#e4e6ea"
        metalness={0.38}
        roughness={0.44}
        clearcoat={0.22}
        clearcoatRoughness={0.28}
        reflectivity={0.5}
      />
    </mesh>
  )
}

function BlackRing({ yBottom, height, radius }: { yBottom: number; height: number; radius: number }) {
  const cy = yBottom + height / 2
  return (
    <mesh position={[0, cy, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, 36, 1]} />
      <meshPhysicalMaterial color="#0c0e12" metalness={0.55} roughness={0.55} clearcoat={0.15} />
    </mesh>
  )
}

/** Circular porthole: metal bezel, glass, interior depth. */
function SivbPorthole({
  y,
  zSurface,
  hullTiltX,
}: {
  y: number
  zSurface: number
  hullTiltX: number
}) {
  const glassR = 0.09
  const torusMajor = 0.096
  const boltOrbit = torusMajor + 0.014

  return (
    <group position={[0, y, zSurface]} rotation={[hullTiltX, 0, 0]}>
      <mesh position={[0, 0, -0.038]} renderOrder={-2}>
        <circleGeometry args={[glassR * 0.94, 40]} />
        <meshStandardMaterial color="#050a12" roughness={0.95} metalness={0.15} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0, 0.016]} renderOrder={2}>
        <circleGeometry args={[glassR, 48]} />
        <meshPhysicalMaterial
          transparent
          color="#071a30"
          metalness={0.02}
          roughness={0.04}
          transmission={0.72}
          thickness={0.1}
          ior={1.52}
          clearcoat={1}
          clearcoatRoughness={0.03}
          emissive="#1a4060"
          emissiveIntensity={0.06}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh renderOrder={1}>
        <torusGeometry args={[torusMajor, 0.015, 14, 52]} />
        <meshPhysicalMaterial color="#5c646e" metalness={0.92} roughness={0.28} clearcoat={0.45} />
      </mesh>

      <mesh position={[0, 0, 0.004]}>
        <torusGeometry args={[glassR + 0.006, 0.004, 8, 40]} />
        <meshPhysicalMaterial color="#3a4048" metalness={0.6} roughness={0.5} />
      </mesh>

      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.12
        return (
          <mesh key={i} position={[Math.cos(a) * boltOrbit, Math.sin(a) * boltOrbit, 0.014]} castShadow>
            <cylinderGeometry args={[0.013, 0.011, 0.009, 8]} />
            <meshPhysicalMaterial color="#4a525c" metalness={0.95} roughness={0.32} />
          </mesh>
        )
      })}
    </group>
  )
}

/** F-1 engine bell cluster (five-engine layout: center + square). */
function F1Cluster() {
  const spread = 0.27
  const positions: [number, number][] = [
    [0, 0],
    [spread, 0],
    [-spread, 0],
    [0, spread],
    [0, -spread],
  ]
  return (
    <group position={[0, -0.06, 0]}>
      {positions.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh castShadow rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.11, 0.2, 20, 1, true]} />
            <meshPhysicalMaterial color="#3d4654" metalness={0.92} roughness={0.22} clearcoat={0.35} />
          </mesh>
          <mesh position={[0, -0.1, 0]} castShadow rotation={[Math.PI, 0, 0]}>
            <cylinderGeometry args={[0.065, 0.1, 0.14, 16]} />
            <meshPhysicalMaterial color="#1e232c" metalness={0.75} roughness={0.42} />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.04, 0.065, 0.1, 12]} />
            <meshStandardMaterial
              color="#0a0c10"
              metalness={0.5}
              roughness={0.9}
              emissive="#ff3a18"
              emissiveIntensity={0.12}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.5, 0.09, 32]} />
        <meshPhysicalMaterial color="#4a5566" metalness={0.88} roughness={0.26} clearcoat={0.4} />
      </mesh>
    </group>
  )
}

function Rocket({ reducedMotion }: { reducedMotion: boolean }) {
  const plumeA = useRef<THREE.Mesh>(null)
  const plumeB = useRef<THREE.Mesh>(null)
  const plumeC = useRef<THREE.Mesh>(null)
  const plumeD = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  const flameMats = useMemo(() => {
    const mk = (color: string, opacity: number) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    return {
      core: mk('#fffaf0', 0.96),
      inner: mk('#ffd080', 0.78),
      mid: mk('#ff7020', 0.58),
      outer: mk('#c42808', 0.38),
      glow: mk('#ff9a50', 0.52),
    }
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pulse = reducedMotion ? 1 : 0.88 + Math.sin(t * 24) * 0.12
    const flicker = reducedMotion ? 1 : 0.92 + Math.sin(t * 37 + 1.2) * 0.08
    const roll = reducedMotion ? 1 : 0.9 + Math.sin(t * 19 + 0.4) * 0.1

    if (plumeA.current) plumeA.current.scale.set(1, pulse * 1.06, 1)
    if (plumeB.current) plumeB.current.scale.set(flicker, pulse * 1.14, flicker)
    if (plumeC.current) plumeC.current.scale.set(roll, pulse * 1.2, roll)
    if (plumeD.current) plumeD.current.scale.set(1, pulse * 1.32, 1)
    if (glowRef.current) {
      const g = reducedMotion ? 0.24 : 0.2 + Math.sin(t * 31) * 0.07
      glowRef.current.scale.setScalar(1 + g)
    }

    flameMats.core.opacity = reducedMotion ? 0.85 : 0.88 + Math.sin(t * 40) * 0.08
    flameMats.outer.opacity = reducedMotion ? 0.3 : 0.34 + Math.sin(t * 18) * 0.06
  })

  const y0 = 0
  const s1 = 1.08
  const is1 = 0.07
  const s2 = 0.62
  const is2 = 0.07
  const s3 = 0.56
  const iu = 0.07
  const rS1b = 0.52
  const rS1t = 0.48
  const rS2b = 0.45
  const rS2t = 0.42
  const rS3b = 0.38
  const rS3t = 0.35

  const yAfterS1 = y0 + s1
  const yAfterIS1 = yAfterS1 + is1
  const yAfterS2 = yAfterIS1 + s2
  const yAfterIS2 = yAfterS2 + is2
  const yAfterS3 = yAfterIS2 + s3
  const yAfterIU = yAfterS3 + iu
  const slaBaseY = yAfterIU
  const slaH = 0.44

  const winY = yAfterIS2 + s3 * 0.76
  const winR = rS3b + (rS3t - rS3b) * 0.76

  return (
    <LandingFloat
      speed={reducedMotion ? 0 : 2}
      rotationIntensity={reducedMotion ? 0 : 0.28}
      floatIntensity={reducedMotion ? 0 : 0.55}
    >
      <group rotation={[0.1, 0, 0]}>
        <pointLight position={[2.8, 2.2, 4]} intensity={reducedMotion ? 0.18 : 0.6} color="#c8dcff" distance={22} />
        <pointLight position={[-2.2, 1.2, 2.5]} intensity={reducedMotion ? 0.14 : 0.45} color="#ffd4b8" distance={18} />

        <F1Cluster />

        <SaturnRollPatternStage yBottom={y0} height={s1} radiusBottom={rS1b} radiusTop={rS1t} />

        <BlackRing yBottom={yAfterS1} height={is1} radius={(rS1t + rS2b) * 0.5 + 0.01} />

        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + 0.2
          const rr = (rS1t + rS2b) * 0.5 + 0.025
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * rr, yAfterS1 + is1 * 0.5, Math.sin(a) * rr]}
              rotation={[0, -a + Math.PI / 2, 0]}
              castShadow
            >
              <boxGeometry args={[0.07, 0.055, 0.1]} />
              <meshPhysicalMaterial color="#1e2228" metalness={0.6} roughness={0.5} />
            </mesh>
          )
        })}

        <SaturnWhiteStage yBottom={yAfterIS1} height={s2} radiusBottom={rS2b} radiusTop={rS2t} />

        <BlackRing yBottom={yAfterS2} height={is2} radius={(rS2t + rS3b) * 0.5 + 0.01} />

        <SaturnWhiteStage yBottom={yAfterIS2} height={s3} radiusBottom={rS3b} radiusTop={rS3t} />

        <BlackRing yBottom={yAfterS3} height={iu} radius={rS3t * 1.02} />

        <mesh position={[0, slaBaseY + slaH * 0.5, 0]} castShadow>
          <coneGeometry args={[rS3t * 0.92, slaH, 32]} />
          <meshPhysicalMaterial
            color="#dcdfe5"
            metalness={0.35}
            roughness={0.46}
            clearcoat={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh position={[0, yAfterIS2 + s3 * 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[rS3b * 0.88, 0.014, 8, 40]} />
          <meshPhysicalMaterial color="#5a6578" metalness={0.85} roughness={0.28} />
        </mesh>

        <SivbPorthole y={winY} zSurface={winR * 0.985} hullTiltX={-0.14} />

        {[0.15, 0.45].map((f, i) => (
          <mesh key={i} position={[0, yAfterIS1 + s2 * f, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[(rS2b + rS2t) / 2 - 0.008, 0.008, 6, 48]} />
            <meshPhysicalMaterial color="#c5cad4" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}

        <mesh ref={glowRef} position={[0, -0.42, 0]} material={flameMats.glow}>
          <sphereGeometry args={[0.32, 20, 20]} />
        </mesh>

        <mesh ref={plumeA} position={[0, -0.58, 0]} rotation={[Math.PI, 0, 0]} material={flameMats.core}>
          <coneGeometry args={[0.2, 0.75, 28, 1, true]} />
        </mesh>
        <mesh ref={plumeB} position={[0, -0.66, 0]} rotation={[Math.PI, 0, 0]} material={flameMats.inner}>
          <coneGeometry args={[0.32, 0.95, 28, 1, true]} />
        </mesh>
        <mesh ref={plumeC} position={[0, -0.74, 0]} rotation={[Math.PI, 0, 0]} material={flameMats.mid}>
          <coneGeometry args={[0.48, 1.15, 32, 1, true]} />
        </mesh>
        <mesh ref={plumeD} position={[0, -0.85, 0]} rotation={[Math.PI, 0, 0]} material={flameMats.outer}>
          <coneGeometry args={[0.62, 1.38, 36, 1, true]} />
        </mesh>

        <pointLight position={[0, -0.55, 0]} intensity={reducedMotion ? 0.75 : 4} color="#ffb060" distance={7} decay={2} />
        <pointLight position={[0, -0.4, 0.2]} intensity={reducedMotion ? 0 : 1.4} color="#ffffff" distance={4} decay={2} />
      </group>
    </LandingFloat>
  )
}

function OrbitingRock({
  radius,
  speed,
  phase,
  yOffset,
  color,
  reducedMotion,
  radiusX,
  radiusZ,
  orbitYaw = 0,
  xzFreqX = 1,
  xzFreqZ = 1,
  verticalAmp = 0.22,
  verticalFreq = 1.2,
  verticalAmp2 = 0,
  verticalFreq2 = 1,
}: {
  radius: number
  speed: number
  phase: number
  yOffset: number
  color: string
  reducedMotion: boolean
  /** Defaults to `radius` when omitted. */
  radiusX?: number
  radiusZ?: number
  /** Rotate the orbit in the horizontal plane (radians). */
  orbitYaw?: number
  /** `t` multipliers for horizontal motion; unequal values yield Lissajous-style paths. */
  xzFreqX?: number
  xzFreqZ?: number
  verticalAmp?: number
  verticalFreq?: number
  verticalAmp2?: number
  verticalFreq2?: number
}) {
  const ref = useRef<THREE.Group>(null)
  const rX = radiusX ?? radius
  const rZ = radiusZ ?? radius
  useFrame((state) => {
    if (!ref.current) return
    const t = reducedMotion ? phase : state.clock.elapsedTime * speed + phase
    const x0 = Math.cos(t * xzFreqX) * rX
    const z0 = Math.sin(t * xzFreqZ) * rZ
    const cy = Math.cos(orbitYaw)
    const sy = Math.sin(orbitYaw)
    const x = cy * x0 - sy * z0
    const z = sy * x0 + cy * z0
    const y =
      yOffset +
      Math.sin(t * verticalFreq) * verticalAmp +
      (verticalAmp2 !== 0 ? Math.sin(t * verticalFreq2) * verticalAmp2 : 0)
    ref.current.position.set(x, y, z)
  })

  return (
    <group ref={ref}>
      <mesh>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={color} roughness={0.92} metalness={0.06} flatShading />
      </mesh>
    </group>
  )
}

function CameraRig({
  reducedMotion,
  narrowLayout,
}: {
  reducedMotion: boolean
  narrowLayout: boolean
}) {
  const { camera } = useThree()
  const aimY = 1.55

  useLayoutEffect(() => {
    if (reducedMotion) {
      camera.position.set(0, 2.85, 12.5)
      camera.lookAt(0, aimY, 0)
    }
  }, [camera, reducedMotion])

  useFrame((state) => {
    if (reducedMotion) return
    const t = state.clock.elapsedTime * 0.1
    const xSway = narrowLayout ? 0 : 1.2
    const yBob = narrowLayout ? 0.12 : 0.25
    const zSway = narrowLayout ? 0.2 : 0.45
    camera.position.x = Math.sin(t) * xSway
    camera.position.y = 2.85 + Math.sin(t * 0.65) * yBob
    camera.position.z = 12.5 + Math.cos(t * 0.35) * zSway
    camera.lookAt(0, aimY, 0)
  })
  return null
}

export function LandingScene({
  reducedMotion,
  narrowLayout = false,
  liteGraphics = false,
}: {
  reducedMotion: boolean
  narrowLayout?: boolean
  liteGraphics?: boolean
}) {
  const motionOff = reducedMotion || liteGraphics

  return (
    <>
      <ambientLight intensity={0.38} />
      <directionalLight position={[10, 12, 8]} intensity={1.2} color="#fff5e8" />
      <directionalLight position={[-6, 3, -5]} intensity={0.4} color="#3a9cff" />
      <pointLight position={[3, 1.5, 5]} intensity={0.45} color="#fc3d21" distance={18} />

      <RealisticStarfield reducedMotion={reducedMotion} liteGraphics />

      <MarsBody reducedMotion={motionOff} narrowLayout={narrowLayout} />

      <OrbitingRock
        radius={5.2}
        radiusX={5.65}
        radiusZ={4.75}
        speed={0.16}
        phase={0}
        yOffset={1.05}
        orbitYaw={0.38}
        verticalAmp={0.26}
        verticalFreq={1.05}
        verticalAmp2={0.11}
        verticalFreq2={2.25}
        color="#6a564c"
        reducedMotion={motionOff}
      />
      <OrbitingRock
        radius={6.4}
        radiusX={6.05}
        radiusZ={6.95}
        speed={-0.13}
        phase={2.1}
        yOffset={-0.35}
        orbitYaw={-0.58}
        xzFreqX={1}
        xzFreqZ={1.42}
        verticalAmp={0.2}
        verticalFreq={1.48}
        color="#554840"
        reducedMotion={motionOff}
      />
      <OrbitingRock
        radius={4.6}
        radiusX={4.35}
        radiusZ={5.15}
        speed={0.11}
        phase={4.2}
        yOffset={0.45}
        orbitYaw={0.95}
        xzFreqZ={2.05}
        verticalAmp={0.34}
        verticalFreq={0.92}
        verticalAmp2={0.08}
        verticalFreq2={3.1}
        color="#5c4a42"
        reducedMotion={motionOff}
      />
      <OrbitingRock
        radius={7.0}
        radiusX={7.35}
        radiusZ={6.35}
        speed={-0.09}
        phase={1.35}
        yOffset={1.35}
        orbitYaw={1.15}
        xzFreqX={1.18}
        xzFreqZ={0.88}
        verticalAmp={0.24}
        verticalFreq={1.62}
        color="#4a3d36"
        reducedMotion={motionOff}
      />
      <OrbitingRock
        radius={5.85}
        radiusX={6.25}
        radiusZ={5.35}
        speed={0.19}
        phase={5.0}
        yOffset={-0.92}
        orbitYaw={-0.82}
        xzFreqX={1}
        xzFreqZ={1.58}
        verticalAmp={0.3}
        verticalFreq={1.75}
        verticalAmp2={0.14}
        verticalFreq2={1.1}
        color="#635045"
        reducedMotion={motionOff}
      />
      <OrbitingRock
        radius={7.35}
        radiusX={6.75}
        radiusZ={8.05}
        speed={0.075}
        phase={3.65}
        yOffset={0.12}
        orbitYaw={0.48}
        xzFreqX={0.82}
        xzFreqZ={1.22}
        verticalAmp={0.18}
        verticalFreq={2.05}
        verticalAmp2={0.1}
        verticalFreq2={2.9}
        color="#483c34"
        reducedMotion={motionOff}
      />

      <group position={[0, -0.35, 0]}>
        <Rocket reducedMotion={motionOff} />
      </group>

      <CameraRig reducedMotion={motionOff} narrowLayout={narrowLayout} />
    </>
  )
}
