import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  ShaderMaterial,
} from 'three'

const VS = /* glsl */ `
  uniform float uTime;
  uniform float uTwinkle;
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;
  attribute float aSpeed;

  varying vec3 vColor;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float tw = 1.0;
    if (uTwinkle > 0.5) {
      tw = 0.76 + 0.24 * sin(uTime * aSpeed + aPhase);
    }
    vColor = aColor * tw;
    float dist = -mvPosition.z;
    dist = max(dist, 1.0);
    gl_PointSize = clamp(aSize * (320.0 / dist), 1.5, 96.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FS = /* glsl */ `
  varying vec3 vColor;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;

    float core = 1.0 - smoothstep(0.0, 0.07, r);
    float inner = 1.0 - smoothstep(0.03, 0.24, r);
    float halo = 1.0 - smoothstep(0.1, 0.5, r);

    float intensity = core * 1.25 + inner * 0.5 + halo * 0.2;
    float alpha = core * 0.98 + inner * 0.5 + halo * 0.26;

    vec3 col = vColor * intensity;
    gl_FragColor = vec4(col, alpha);
  }
`

function hash01(i: number, j: number, k: number): number {
  let h = i * 127.1 + j * 311.7 + k * 74.7
  h = Math.sin(h) * 43758.5453123
  return h - Math.floor(h)
}

function starRgb(t: number): [number, number, number] {
  if (t < 0.07) return [0.68, 0.78, 1.0]
  if (t < 0.28) return [0.85, 0.92, 1.0]
  if (t < 0.62) return [1.0, 0.98, 0.96]
  if (t < 0.88) return [1.0, 0.9, 0.78]
  return [1.0, 0.72, 0.55]
}

function buildStarLayers(
  count: number,
  radii: number[],
  weights: number[]
): {
  positions: Float32Array
  aSize: Float32Array
  aColor: Float32Array
  aPhase: Float32Array
  aSpeed: Float32Array
} {
  const total = count
  const positions = new Float32Array(total * 3)
  const aSize = new Float32Array(total)
  const aColor = new Float32Array(total * 3)
  const aPhase = new Float32Array(total)
  const aSpeed = new Float32Array(total)

  const golden = Math.PI * (3 - Math.sqrt(5))
  let idx = 0

  const layerCounts = weights.map((w) => Math.max(8, Math.floor(total * w)))
  let sum = layerCounts.reduce((a, b) => a + b, 0)
  let fix = total - sum
  layerCounts[layerCounts.length - 1] += fix

  for (let L = 0; L < radii.length; L++) {
    const n = layerCounts[L]
    const radius = radii[L]
    const depthFade = 0.85 + L * 0.08

    for (let i = 0; i < n && idx < total; i++) {
      const y = 1 - (i / Math.max(1, n - 1)) * 2
      const rr = Math.sqrt(Math.max(0, 1 - y * y))
      const theta = golden * i + L * 2.17
      let x = Math.cos(theta) * rr
      let z = Math.sin(theta) * rr
      let yy = y

      const jx = (hash01(idx, 1, 2) - 0.5) * 0.028
      const jy = (hash01(idx, 3, 4) - 0.5) * 0.028
      const jz = (hash01(idx, 5, 6) - 0.5) * 0.028
      x += jx
      yy += jy
      z += jz
      const len = Math.hypot(x, yy, z) || 1
      x = (x / len) * radius
      yy = (yy / len) * radius
      z = (z / len) * radius

      positions[idx * 3] = x
      positions[idx * 3 + 1] = yy
      positions[idx * 3 + 2] = z

      const h = hash01(idx, 0, L)
      const bright = Math.pow(hash01(idx, 7, 8), 1.75)
      const rgb = starRgb(h)
      const lum = (0.35 + bright * 0.92) * depthFade

      aColor[idx * 3] = rgb[0] * lum
      aColor[idx * 3 + 1] = rgb[1] * lum
      aColor[idx * 3 + 2] = rgb[2] * lum

      const b = bright
      aSize[idx] = 1.8 + Math.pow(b, 0.55) * 9.5 + (h < 0.07 ? 2.2 : 0)

      aPhase[idx] = hash01(idx, 9, 10) * Math.PI * 2
      aSpeed[idx] = 1.1 + hash01(idx, 11, 12) * 1.8

      idx++
    }
  }

  return { positions, aSize, aColor, aPhase, aSpeed }
}

type RealisticStarfieldProps = {
  reducedMotion: boolean
  liteGraphics?: boolean
}

export function RealisticStarfield({
  reducedMotion,
  liteGraphics = false,
}: RealisticStarfieldProps) {
  const groupRef = useRef<Group>(null)
  const matRef = useRef<ShaderMaterial>(null)

  /* Lower counts = faster init + lighter GPU vs old 8k / 2.8k / 900. */
  const count = liteGraphics ? 350 : reducedMotion ? 900 : 2200
  const twinkleOff = reducedMotion || liteGraphics
  const stillStars = reducedMotion || liteGraphics

  const geometry = useMemo(() => {
    const { positions, aSize, aColor, aPhase, aSpeed } = buildStarLayers(count, [155, 118, 86], [0.52, 0.32, 0.16])

    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    geo.setAttribute('aSize', new BufferAttribute(aSize, 1))
    geo.setAttribute('aColor', new BufferAttribute(aColor, 3))
    geo.setAttribute('aPhase', new BufferAttribute(aPhase, 1))
    geo.setAttribute('aSpeed', new BufferAttribute(aSpeed, 1))
    return geo
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTwinkle: { value: twinkleOff ? 0 : 1 },
    }),
    [twinkleOff]
  )

  useFrame((state) => {
    if (matRef.current && !twinkleOff) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
    if (groupRef.current && !stillStars) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.018
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.04) * 0.012
    }
  })

  return (
    <group ref={groupRef}>
      <points key={count} geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={VS}
          fragmentShader={FS}
          transparent
          depthWrite={false}
          depthTest={true}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}
