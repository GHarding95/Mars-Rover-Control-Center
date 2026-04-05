/**
 * Heuristic "lite" graphics profile for the WebGL landing scene.
 * Older phones throttle or drop frames when pixel fill, shadow maps, and per-frame
 * CPU work (instancing updates) stack up — newer SoCs hide it.
 */
export type LandingPerfProfile = 'full' | 'lite'

export function getLandingPerfProfile(): LandingPerfProfile {
  if (typeof window === 'undefined') return 'full'

  const cores = navigator.hardwareConcurrency ?? 8
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory

  if (cores <= 4) return 'lite'
  if (mem != null && mem <= 4) return 'lite'

  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const narrow = window.innerWidth <= 768
  if (coarsePointer && narrow && cores <= 8) return 'lite'

  return 'full'
}
