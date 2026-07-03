import { useSyncExternalStore } from 'react'

// Minimal hash router: #/browse?type=manhwa, #/title/:id, #/read/:id/:ch
const listeners = new Set()
window.addEventListener('hashchange', () => listeners.forEach((l) => l()))

function parse() {
  const raw = window.location.hash.replace(/^#/, '') || '/'
  const [path, query = ''] = raw.split('?')
  return { path, params: new URLSearchParams(query) }
}

let cached = parse()
let cachedRaw = window.location.hash

export function useRoute() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => {
      if (window.location.hash !== cachedRaw) {
        cachedRaw = window.location.hash
        cached = parse()
      }
      return cached
    }
  )
}

export function navigate(to, { replace = false } = {}) {
  const url = '#' + to
  if (replace) window.location.replace(url)
  else window.location.hash = to
}

export function Link({ to, className, children, ...rest }) {
  return (
    <a href={'#' + to} className={className} {...rest}>
      {children}
    </a>
  )
}
