import { useState, useEffect, useRef } from 'react'
import { Link, useRoute } from '../router.jsx'
import { searchTitles } from '../api.js'
import { Cover } from './TitleCard.jsx'

const TABS = [
  { to: '/', label: 'Home', icon: 'M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5' },
  { to: '/browse', label: 'Browse', icon: 'M4 5h16M4 12h16M4 19h10' },
  { to: '/library', label: 'Library', icon: 'M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z' },
  { to: '/history', label: 'History', icon: 'M12 8v4l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9z' },
  { to: '/profile', label: 'Profile', icon: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zM4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1' },
]

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

function SearchOverlay({ onClose }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState(null) // null = idle, [] = no matches
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const timer = useRef(null)

  useEffect(() => inputRef.current?.focus(), [])
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function onChange(value) {
    setQ(value)
    clearTimeout(timer.current)
    if (!value.trim()) { setResults(null); setBusy(false); return }
    setBusy(true)
    timer.current = setTimeout(async () => {
      try {
        const r = await searchTitles(value)
        setResults(r)
      } catch {
        setResults([])
      }
      setBusy(false)
    }, 350)
  }

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-panel" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Search MangaDex…"
          value={q}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="search-results">
          {busy && <p className="muted pad">Searching…</p>}
          {!busy && results && results.length === 0 && <p className="muted pad">No results for “{q}”</p>}
          {!busy && results?.map((t) => (
            <a key={t.id} href={'#/title/' + t.id} className="search-row" onClick={onClose}>
              <Cover title={t} />
              <div>
                <div className="search-row-title">{t.title}</div>
                <div className="muted small">
                  <span className={'type-tag ' + t.type}>{t.type}</span> · {t.genres.slice(0, 3).join(', ')}
                </div>
              </div>
              {t.rating != null && <span className="rating">★ {t.rating.toFixed(1)}</span>}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Shell({ children }) {
  const { path } = useRoute()
  const [searching, setSearching] = useState(false)
  const isReader = path.startsWith('/read/')

  // "/" opens search from anywhere
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !e.target.closest('input,textarea') && !isReader) {
        e.preventDefault()
        setSearching(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isReader])

  if (isReader) return children // reader is fully immersive: no chrome

  const active = (to) =>
    to === '/' ? path === '/' : path.startsWith(to)

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-hangul">연재</span>
          <span className="brand-name">Yeonjae</span>
        </Link>
        <nav className="topnav">
          {TABS.map((t) => (
            <Link key={t.to} to={t.to} className={active(t.to) ? 'active' : ''}>
              {t.label}
            </Link>
          ))}
        </nav>
        <button className="search-btn" onClick={() => setSearching(true)} aria-label="Search">
          <Icon d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.35-4.35" />
          <span className="search-hint">Search</span>
          <kbd>/</kbd>
        </button>
      </header>

      <main className="content">{children}</main>

      <nav className="bottomnav">
        {TABS.map((t) => (
          <Link key={t.to} to={t.to} className={active(t.to) ? 'active' : ''}>
            <Icon d={t.icon} />
            <span>{t.label}</span>
          </Link>
        ))}
      </nav>

      {searching && <SearchOverlay onClose={() => setSearching(false)} />}
    </div>
  )
}
