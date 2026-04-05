/**
 * Graphics profile for the WebGL landing scene (`full` vs `lite`).
 * Device heuristics are disabled — always use the full-quality path.
 */
export type LandingPerfProfile = 'full' | 'lite'

export function getLandingPerfProfile(): LandingPerfProfile {
  return 'full'
}

/** Skip WebGL starfield when the user/agent asks for reduced data use or a very slow link. */
export function shouldSkipHeavyWebGL(): boolean {
  if (typeof navigator === 'undefined') return false
  try {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection
    if (c?.saveData) return true
    if (c?.effectiveType === 'slow-2g' || c?.effectiveType === '2g') return true
  } catch {
    /* ignore */
  }
  return false
}
