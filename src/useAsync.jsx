import { useState, useEffect } from 'react'

// Load async data tied to `deps`. Returns { data, error, loading, retry }.
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, error: null, loading: true }))
    fn().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (error) => alive && setState({ data: null, error, loading: false })
    )
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  return { ...state, retry: () => setAttempt((a) => a + 1) }
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading">
      <span className="spinner" />
      <span className="muted">{label}</span>
    </div>
  )
}

export function LoadError({ error, retry }) {
  return (
    <div className="empty">
      <p>Couldn’t reach MangaDex. {String(error?.message || error)}</p>
      <button className="btn ghost" onClick={retry}>Try again</button>
    </div>
  )
}
