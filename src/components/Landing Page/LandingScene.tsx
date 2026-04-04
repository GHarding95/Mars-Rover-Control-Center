import { useRef, useMemo, useLayoutEffect, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Float, Sparkles, Environment } from '@react-three/drei'
import { RealisticStarfield } from './RealisticStarfield'
import * as THREE from 'three'

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

/** Stable 0–1 hash for integer lattice coords (3D value noise). */
function hash01(ix: number, iy: number, iz: number): number {
  let h = ix * 374761393 + iy * 668265263 + iz * 1274126177
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function valueNoise3D(px: number, py: number, pz: number): number {
  const x0 = Math.floor(px)
  const y0 = Math.floor(py)
  const z0 = Math.floor(pz)
  const fx = px - x0
  const fy = py - y0
  const fz = pz - z0
  const u = fx * fx * (3 - 2 * fx)
  const v = fy * fy * (3 - 2 * fy)
  const w = fz * fz * (3 - 2 * fz)

  const n000 = hash01(x0, y0, z0)
  const n100 = hash01(x0 + 1, y0, z0)
  const n010 = hash01(x0, y0 + 1, z0)
  const n110 = hash01(x0 + 1, y0 + 1, z0)
  const n001 = hash01(x0, y0, z0 + 1)
  const n101 = hash01(x0 + 1, y0, z0 + 1)
  const n011 = hash01(x0, y0 + 1, z0 + 1)
  const n111 = hash01(x0 + 1, y0 + 1, z0 + 1)

  const x00 = lerp(n000, n100, u)
  const x10 = lerp(n010, n110, u)
  const x01 = lerp(n001, n101, u)
  const x11 = lerp(n011, n111, u)
  const y0v = lerp(x00, x10, v)
  const y1v = lerp(x01, x11, v)
  return lerp(y0v, y1v, w)
}

/** Multi-octave 3D noise on the unit sphere direction — no stripe bias from planar sines. */
function fbmTerrain(sx: number, sy: number, sz: number): number {
  let sum = 0
  let amp = 0.52
  let freq = 2.6
  let norm = 0
  for (let o = 0; o < 4; o++) {
    sum +=
      amp *
      valueNoise3D(
        sx * freq + o * 19.2,
        sy * freq - o * 7.1,
        sz * freq + o * 3.7
      )
    norm += amp
    amp *= 0.51
    freq *= 2.05
  }
  return sum / norm
}

/** Short ridged passes — broken-up highs/lows, reads as rough broken ground. */
function ridgedTerrain(sx: number, sy: number, sz: number): number {
  let sum = 0
  let amp = 0.42
  let freq = 5.5
  let norm = 0
  for (let o = 0; o < 2; o++) {
    let v = valueNoise3D(sx * freq + 11, sy * freq - 3, sz * freq + 7)
    v = 1 - Math.abs(v * 2 - 1)
    sum += v * amp
    norm += amp
    amp *= 0.48
    freq *= 2.1
  }
  return norm > 0 ? sum / norm : 0
}

/** Blended noise with domain mixing so no single direction dominates. */
function terrainNoise01(sx: number, sy: number, sz: number): number {
  const a = fbmTerrain(sx, sy, sz)
  const b = fbmTerrain(sz * 0.71 + sy * 0.41, sx * 0.71 + sz * 0.41, sy * 0.71 + sx * 0.41)
  const base = a * 0.58 + b * 0.42
  const ridge = ridgedTerrain(sx, sy, sz)
  const mixed = base * 0.78 + ridge * 0.22
  const micro = valueNoise3D(sx * 31 + 2.1, sy * 29 - 1.4, sz * 33 + 5.6)
  const fine = valueNoise3D(sx * 79, sy * 77, sz * 81)
  return THREE.MathUtils.clamp(mixed * 0.88 + micro * 0.07 + fine * 0.05, 0, 1)
}

type CraterDef = { cx: number; cy: number; cz: number; alpha: number }

/** Fibonacci sphere — spread crater centers evenly; normalize to unit vectors. */
function fibonacciCraters(count: number, alphaMin: number, alphaMax: number, seed: number): CraterDef[] {
  const golden = Math.PI * (3 - Math.sqrt(5))
  const out: CraterDef[] = []
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1 || 1)) * 2
    const r = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = golden * i + seed
    const cx = Math.cos(theta) * r
    const cy = y
    const cz = Math.sin(theta) * r
    const len = Math.hypot(cx, cy, cz) || 1
    let frac = (Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1
    if (frac < 0) frac += 1
    const alpha = alphaMin + frac * (alphaMax - alphaMin)
    out.push({ cx: cx / len, cy: cy / len, cz: cz / len, alpha })
  }
  return out
}

/** Seamless equirectangular textures: sample uses 3D direction so u=0 meets u=1. */
function createMarsSurfaceTextures() {
  /** 512×256 keeps the procedural look while cutting main-thread work vs 1024×512. */
  const w = 512
  const h = 256
  const colorCanvas = document.createElement('canvas')
  colorCanvas.width = w
  colorCanvas.height = h
  const roughCanvas = document.createElement('canvas')
  roughCanvas.width = w
  roughCanvas.height = h

  const cctx = colorCanvas.getContext('2d')!
  const rctx = roughCanvas.getContext('2d')!
  const colorImg = cctx.createImageData(w, h)
  const roughImg = rctx.createImageData(w, h)
  const cd = colorImg.data
  const rd = roughImg.data

  // Dark basalt / shadowed slopes → rust → dusty tan (Viking / HiRISE–inspired palette)
  const deep = { r: 0.32, g: 0.2, b: 0.14 }
  const rust = { r: 0.58, g: 0.32, b: 0.2 }
  const dust = { r: 0.72, g: 0.44, b: 0.28 }
  const tan = { r: 0.78, g: 0.55, b: 0.38 }
  const oxide = { r: 0.52, g: 0.22, b: 0.14 }

  const majorCraters: CraterDef[] = [
    { cx: 0.62, cy: 0.35, cz: -0.71, alpha: 0.11 },
    { cx: -0.45, cy: 0.55, cz: 0.71, alpha: 0.085 },
    { cx: 0.2, cy: -0.85, cz: 0.48, alpha: 0.075 },
    { cx: -0.72, cy: -0.38, cz: -0.58, alpha: 0.095 },
    { cx: 0.88, cy: 0.12, cz: 0.46, alpha: 0.065 },
    { cx: -0.15, cy: 0.78, cz: -0.6, alpha: 0.07 },
    { cx: 0.33, cy: 0.42, cz: 0.84, alpha: 0.06 },
    { cx: -0.55, cy: -0.62, cz: 0.55, alpha: 0.08 },
    { cx: 0.1, cy: 0.25, cz: -0.96, alpha: 0.055 },
  ]

  const mediumCraters = fibonacciCraters(28, 0.028, 0.052, 2.17)
  const smallCraters = fibonacciCraters(55, 0.012, 0.026, 5.91)
  const allCraters: CraterDef[] = [...majorCraters, ...mediumCraters, ...smallCraters]

  for (let y = 0; y < h; y++) {
    const v = y / (h - 1)
    const phi = v * Math.PI
    const sinPhi = Math.sin(phi)
    const cosPhi = Math.cos(phi)
    for (let x = 0; x < w; x++) {
      const u = x / w
      const theta = u * Math.PI * 2
      const sx = sinPhi * Math.cos(theta)
      const sy = cosPhi
      const sz = sinPhi * Math.sin(theta)

      const n = terrainNoise01(sx, sy, sz)

      // Patchy oxide tint — low-frequency blob × finer breakup (cheap, not stripy)
      const oxLow = valueNoise3D(sx * 2.8 + 80, sy * 2.8 - 40, sz * 2.8 + 20)
      const oxMid = valueNoise3D(sx * 9.5, sy * 9.5, sz * 9.5)
      const oxideMix = oxLow * oxLow * oxMid * 0.34

      let craterDark = 0
      let ejectaBright = 0
      let roughBump = 0

      for (const { cx, cy, cz, alpha } of allCraters) {
        const dot = THREE.MathUtils.clamp(sx * cx + sy * cy + sz * cz, -1, 1)
        const cosAlpha = Math.cos(alpha)
        if (dot <= cosAlpha) continue

        const ang = Math.acos(dot)
        const t = ang / alpha

        // Deeper, steeper bowls for large impacts; gentler for small
        const depthExp = alpha > 0.058 ? 2.05 : alpha > 0.036 ? 1.78 : 1.58
        let bowl = Math.pow(Math.max(0, 1 - t), depthExp)

        // Micro-relief on floor (breaks up flat shading)
        const floorNoise = valueNoise3D(sx * 168 + cx * 41, sy * 168 + cy * 29, sz * 168 - cz * 23)
        const floorGrain = valueNoise3D(sx * 390 + cx * 7, sy * 390, sz * 390 + cz * 13)
        const floorVar = (floorNoise - 0.5) * 0.22 * (1 - t) * (1 - t) + (floorGrain - 0.5) * 0.1 * (1 - t)
        bowl = Math.max(0, bowl + floorVar)

        // Interior wall shadow band (slope between floor and rim)
        const wallShade =
          smoothstep(0.26, 0.48, t) * (1 - smoothstep(0.48, 0.74, t)) * (0.11 + alpha * 0.35)
        bowl += wallShade

        // Fine radial breakup (bigger craters get more edge detail)
        const ripple = Math.sin(ang * (38 + alpha * 160) + floorNoise * 5.5) * 0.035 * (1 - t) * Math.min(1, alpha * 14)
        bowl = Math.max(0, bowl + ripple)

        const depthScale = 0.42 + alpha * 0.75
        const scale = alpha > 0.04 ? 1 : 0.82
        craterDark += bowl * depthScale * scale

        // Raised ejecta / bright rim
        const rim = smoothstep(0.72, 0.9, t) * (1 - smoothstep(0.9, 1, t))
        ejectaBright += rim * 0.14 * Math.min(1, alpha * 8)

        roughBump += bowl * (0.055 + alpha * 0.04)
      }
      craterDark = Math.min(craterDark, 0.62)
      ejectaBright = Math.min(ejectaBright, 0.22)

      let r: number
      let g: number
      let b: number
      if (n < 0.28) {
        const k = n / 0.28
        r = deep.r + (oxide.r - deep.r) * k
        g = deep.g + (oxide.g - deep.g) * k
        b = deep.b + (oxide.b - deep.b) * k
      } else if (n < 0.52) {
        const k = (n - 0.28) / 0.24
        r = oxide.r + (rust.r - oxide.r) * k
        g = oxide.g + (rust.g - oxide.g) * k
        b = oxide.b + (rust.b - oxide.b) * k
      } else if (n < 0.78) {
        const k = (n - 0.52) / 0.26
        r = rust.r + (dust.r - rust.r) * k
        g = rust.g + (dust.g - rust.g) * k
        b = rust.b + (dust.b - rust.b) * k
      } else {
        const k = (n - 0.78) / 0.22
        r = dust.r + (tan.r - dust.r) * k
        g = dust.g + (tan.g - dust.g) * k
        b = dust.b + (tan.b - dust.b) * k
      }

      // Blend oxide tint
      r = r * (1 - oxideMix * 0.15) + oxide.r * oxideMix * 0.15
      g = g * (1 - oxideMix * 0.08)
      b = b * (1 - oxideMix * 0.12)

      const ao = 0.88 + n * 0.12
      const litR = r * ao
      const litG = g * ao
      const litB = b * ao

      // Crater shadow: darken toward same warm hue as the surface (not grey), like sunless soil
      const shadowR = 0.56
      const shadowG = 0.38
      const shadowB = 0.3
      r = lerp(litR, litR * shadowR, craterDark)
      g = lerp(litG, litG * shadowG, craterDark)
      b = lerp(litB, litB * shadowB, craterDark)

      r += ejectaBright * 0.55
      g += ejectaBright * 0.42
      b += ejectaBright * 0.28

      const i = (y * w + x) * 4
      cd[i] = Math.min(255, r * 255)
      cd[i + 1] = Math.min(255, g * 255)
      cd[i + 2] = Math.min(255, b * 255)
      cd[i + 3] = 255

      const grain =
        valueNoise3D(sx * 73 + 1.2, sy * 71 - 0.8, sz * 77) * 0.55 +
        valueNoise3D(sx * 127, sy * 131, sz * 119) * 0.45
      const rough = THREE.MathUtils.clamp(
        0.72 + (1 - n) * 0.2 + craterDark * 0.06 + roughBump * 0.42 + (grain - 0.5) * 0.14,
        0.62,
        0.99
      )
      const rv = Math.min(255, rough * 255)
      rd[i] = rv
      rd[i + 1] = rv
      rd[i + 2] = rv
      rd[i + 3] = 255
    }
  }

  cctx.putImageData(colorImg, 0, 0)
  rctx.putImageData(roughImg, 0, 0)

  const map = new THREE.CanvasTexture(colorCanvas)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8

  const roughnessMap = new THREE.CanvasTexture(roughCanvas)
  roughnessMap.colorSpace = THREE.NoColorSpace
  roughnessMap.anisotropy = 8

  return { map, roughnessMap }
}

/** Shared noise roughness map — extra matte grit without changing the low-poly comet look. */
let cometRoughnessMap: THREE.CanvasTexture | null = null
function getCometRoughnessMap() {
  if (!cometRoughnessMap) {
    const s = 128
    const canvas = document.createElement('canvas')
    canvas.width = s
    canvas.height = s
    const ctx = canvas.getContext('2d')!
    const img = ctx.createImageData(s, s)
    const d = img.data
    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const n =
          valueNoise3D(x * 0.11, y * 0.11, 0.4) * 0.55 + valueNoise3D(x * 0.31, y * 0.29, 1.2) * 0.45
        const rough = THREE.MathUtils.clamp(0.76 + n * 0.24, 0.68, 1)
        const v = Math.min(255, rough * 255)
        const i = (y * s + x) * 4
        d[i] = v
        d[i + 1] = v
        d[i + 2] = v
        d[i + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
    cometRoughnessMap = new THREE.CanvasTexture(canvas)
    cometRoughnessMap.colorSpace = THREE.NoColorSpace
    cometRoughnessMap.wrapS = THREE.RepeatWrapping
    cometRoughnessMap.wrapT = THREE.RepeatWrapping
  }
  return cometRoughnessMap
}

function MarsBody({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null)

  const { map, roughnessMap } = useMemo(() => createMarsSurfaceTextures(), [])

  useEffect(() => {
    return () => {
      map.dispose()
      roughnessMap.dispose()
    }
  }, [map, roughnessMap])

  useFrame((_, delta) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y += delta * 0.08
  })
  return (
    <mesh ref={ref} position={[-9, -0.5, -14]} scale={3.2}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        map={map}
        roughnessMap={roughnessMap}
        roughness={1}
        metalness={0.04}
        emissive="#2a1410"
        emissiveIntensity={0.06}
      />
    </mesh>
  )
}

/** Irregular rocky nucleus tumbling on orbit — original low-poly style, extra rough / matte. */
function OrbitingComet({
  radius,
  speed,
  phase,
  yOffset,
  accent,
  reducedMotion,
}: {
  radius: number
  speed: number
  phase: number
  yOffset: number
  accent: string
  reducedMotion: boolean
}) {
  const orbitRef = useRef<THREE.Group>(null)
  const tumbleRef = useRef<THREE.Group>(null)
  const roughnessMap = useMemo(() => getCometRoughnessMap(), [])

  useFrame((state, delta) => {
    if (!orbitRef.current) return
    const t = reducedMotion ? phase : state.clock.elapsedTime * speed + phase
    orbitRef.current.position.set(
      Math.cos(t) * radius,
      yOffset + Math.sin(t * 1.3) * 0.35,
      Math.sin(t) * radius
    )
    orbitRef.current.rotation.y += reducedMotion ? 0 : 0.008
    orbitRef.current.rotation.x = Math.sin(t * 0.7) * 0.18

    if (tumbleRef.current && !reducedMotion) {
      tumbleRef.current.rotation.x += delta * 0.85
      tumbleRef.current.rotation.y += delta * 0.62
      tumbleRef.current.rotation.z += delta * 0.38
    }
  })

  return (
    <group ref={orbitRef}>
      <group ref={tumbleRef}>
        <mesh castShadow>
          <dodecahedronGeometry args={[0.26, 0]} />
          <meshStandardMaterial
            color={accent}
            roughnessMap={roughnessMap}
            roughness={1}
            metalness={0.06}
            envMapIntensity={0.22}
            flatShading
            emissive="#1a0f0c"
            emissiveIntensity={0.12}
          />
        </mesh>
        <mesh position={[0.14, 0.1, -0.06]} rotation={[0.9, 0.4, 0.2]} castShadow>
          <icosahedronGeometry args={[0.14, 0]} />
          <meshStandardMaterial
            color="#3d3430"
            roughnessMap={roughnessMap}
            roughness={1}
            metalness={0.06}
            envMapIntensity={0.22}
            flatShading
            emissive="#120a08"
            emissiveIntensity={0.08}
          />
        </mesh>
        <mesh position={[-0.1, -0.12, 0.11]} rotation={[0.3, 1.1, 0.5]} castShadow>
          <tetrahedronGeometry args={[0.11, 0]} />
          <meshStandardMaterial
            color="#2a2522"
            roughnessMap={roughnessMap}
            roughness={1}
            metalness={0.08}
            envMapIntensity={0.2}
            flatShading
          />
        </mesh>
        <mesh position={[0.05, 0.16, 0.12]} rotation={[0.5, -0.3, 0.8]}>
          <sphereGeometry args={[0.045, 6, 6]} />
          <meshStandardMaterial
            color="#8b7359"
            roughnessMap={roughnessMap}
            roughness={1}
            metalness={0.1}
            envMapIntensity={0.22}
            flatShading
            emissive="#3d2818"
            emissiveIntensity={0.15}
          />
        </mesh>
        <pointLight intensity={reducedMotion ? 0 : 0.55} color="#ffc9a8" distance={2.8} decay={2} />
      </group>
    </group>
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
      {/* Cabin shadow / depth behind glass */}
      <mesh position={[0, 0, -0.038]} renderOrder={-2}>
        <circleGeometry args={[glassR * 0.94, 40]} />
        <meshStandardMaterial color="#050a12" roughness={0.95} metalness={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Glass pane */}
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

      {/* Outer metal bezel */}
      <mesh renderOrder={1}>
        <torusGeometry args={[torusMajor, 0.015, 14, 52]} />
        <meshPhysicalMaterial color="#5c646e" metalness={0.92} roughness={0.28} clearcoat={0.45} />
      </mesh>

      {/* Inner gasket ring */}
      <mesh position={[0, 0, 0.004]}>
        <torusGeometry args={[glassR + 0.006, 0.004, 8, 40]} />
        <meshPhysicalMaterial color="#3a4048" metalness={0.6} roughness={0.5} />
      </mesh>

      {/* Bolt heads */}
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

  /* Stage heights (Saturn V–style proportions, compressed for the scene). */
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
    <Float
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

        {/* Ullage / retro motor housings (S-I/S-II interstage) */}
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

        {/* SLA — conical adapter (Apollo-era white) */}
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

        {/* J-2 cluster hint on S-IVB (ring) */}
        <mesh position={[0, yAfterIS2 + s3 * 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[rS3b * 0.88, 0.014, 8, 40]} />
          <meshPhysicalMaterial color="#5a6578" metalness={0.85} roughness={0.28} />
        </mesh>

        <SivbPorthole y={winY} zSurface={winR * 0.985} hullTiltX={-0.14} />

        {/* S-II stringer lines (subtle) */}
        {[0.15, 0.45].map((f, i) => (
          <mesh key={i} position={[0, yAfterIS1 + s2 * f, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[(rS2b + rS2t) / 2 - 0.008, 0.008, 6, 48]} />
            <meshPhysicalMaterial color="#c5cad4" metalness={0.6} roughness={0.35} />
          </mesh>
        ))}

        {/* Engine throat glow — merged F-1 plume */}
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
    </Float>
  )
}

function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
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
    const t = state.clock.elapsedTime * 0.12
    camera.position.x = Math.sin(t) * 2
    camera.position.y = 2.85 + Math.sin(t * 0.7) * 0.4
    camera.position.z = 12.5 + Math.cos(t * 0.4) * 0.7
    camera.lookAt(0, aimY, 0)
  })
  return null
}

function DebrisField({ reducedMotion }: { reducedMotion: boolean }) {
  const count = reducedMotion ? 40 : 120
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const data = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 24,
      y: (Math.random() - 0.5) * 14,
      z: (Math.random() - 0.5) * 10 - 4,
      s: 0.02 + Math.random() * 0.06,
      rot: Math.random() * Math.PI * 2,
    }))
  }, [count])

  useLayoutEffect(() => {
    if (!ref.current) return
    data.forEach((d, i) => {
      dummy.position.set(d.x, d.y, d.z)
      dummy.rotation.set(d.rot, d.rot * 0.5, 0)
      dummy.scale.setScalar(d.s)
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [data, dummy])

  useFrame((state) => {
    if (!ref.current || reducedMotion) return
    const t = state.clock.elapsedTime * 0.15
    data.forEach((d, i) => {
      dummy.position.set(d.x, d.y + Math.sin(t + d.rot) * 0.08, d.z)
      dummy.rotation.set(t * 0.5 + d.rot, t * 0.3, 0)
      dummy.scale.setScalar(d.s)
      dummy.updateMatrix()
      ref.current!.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <tetrahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#9ca8bc" metalness={0.9} roughness={0.2} />
    </instancedMesh>
  )
}

export function LandingScene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <>
      <Environment preset="night" environmentIntensity={0.42} />
      <ambientLight intensity={0.22} />
      <directionalLight
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={32}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        position={[10, 12, 8]}
        intensity={1.15}
        color="#fff5e8"
      />
      <directionalLight position={[-8, 4, -6]} intensity={0.45} color="#288bff" />
      <pointLight position={[4, 2, 6]} intensity={0.8} color="#fc3d21" distance={20} />

      <RealisticStarfield reducedMotion={reducedMotion} />

      <MarsBody reducedMotion={reducedMotion} />

      <OrbitingComet
        radius={5.5}
        speed={0.22}
        phase={0}
        yOffset={1.2}
        accent="#6a564c"
        reducedMotion={reducedMotion}
      />
      <OrbitingComet
        radius={6.8}
        speed={-0.16}
        phase={2.1}
        yOffset={-0.4}
        accent="#554840"
        reducedMotion={reducedMotion}
      />
      <OrbitingComet
        radius={4.2}
        speed={0.31}
        phase={4.2}
        yOffset={2}
        accent="#4d3f38"
        reducedMotion={reducedMotion}
      />
      <OrbitingComet
        radius={7.4}
        speed={0.14}
        phase={1.4}
        yOffset={0.6}
        accent="#5c4a42"
        reducedMotion={reducedMotion}
      />
      <OrbitingComet
        radius={3.6}
        speed={-0.28}
        phase={5.5}
        yOffset={-1.1}
        accent="#3d332e"
        reducedMotion={reducedMotion}
      />
      <OrbitingComet
        radius={8.1}
        speed={0.19}
        phase={3.7}
        yOffset={1.8}
        accent="#625348"
        reducedMotion={reducedMotion}
      />
      <OrbitingComet
        radius={5}
        speed={-0.24}
        phase={0.8}
        yOffset={-0.9}
        accent="#4a3f37"
        reducedMotion={reducedMotion}
      />

      <DebrisField reducedMotion={reducedMotion} />

      <group position={[0, -0.35, 0]}>
        <Rocket reducedMotion={reducedMotion} />
        {!reducedMotion && (
          <Sparkles
            count={60}
            scale={[9, 14, 9]}
            size={2.5}
            speed={0.4}
            color="#5eb0ff"
            opacity={0.5}
          />
        )}
      </group>

      <CameraRig reducedMotion={reducedMotion} />
    </>
  )
}
