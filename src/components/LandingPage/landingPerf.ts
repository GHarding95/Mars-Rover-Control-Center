/**
 * Graphics profile for the WebGL landing scene (`full` vs `lite`).
 * Device heuristics are disabled — always use the full-quality path.
 */
export type LandingPerfProfile = 'full' | 'lite'

export function getLandingPerfProfile(): LandingPerfProfile {
  return 'full'
}
