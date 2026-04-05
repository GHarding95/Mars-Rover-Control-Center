import { lazy, Suspense, useEffect, useState } from 'react'

/** Defer analytics chunk so first paint stays on the main app bundle. */
const Analytics = lazy(() =>
  import('@vercel/analytics/react').then((m) => ({ default: m.Analytics }))
)

export function LazyAnalytics() {
  const [load, setLoad] = useState(false)
  useEffect(() => {
    let cancelled = false
    const run = () => {
      if (!cancelled) setLoad(true)
    }
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(run, { timeout: 4000 })
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
  }, [])

  if (!load) return null

  return (
    <Suspense fallback={null}>
      <Analytics />
    </Suspense>
  )
}
