import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, navigate } from '../router.jsx'
import { fetchTitle, fetchChapters, fetchPages, snapshotOf } from '../api.js'
import { useStore, store } from '../store.js'
import { useAsync, Loading, LoadError } from '../useAsync.jsx'

// Immersive reader. Vertical strip for webtoons (manhwa/manhua), paged for manga.
// Tap center → toggle UI. Paged mode: tap sides / arrow keys to turn pages.
export default function Reader({ id, chapterId }) {
  const { settings } = useStore()
  const [ui, setUi] = useState(true)
  const [page, setPage] = useState(0)
  const [pct, setPct] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const scrollRef = useRef(null)
  const saveTimer = useRef(null)

  const { data, error, loading, retry } = useAsync(
    async () => {
      const [title, chapters, pages] = await Promise.all([
        fetchTitle(id),
        fetchChapters(id),
        fetchPages(chapterId),
      ])
      const index = chapters.findIndex((c) => c.id === chapterId)
      return { title, chapters, pages, index }
    },
    [id, chapterId]
  )

  const title = data?.title
  const chapter = data?.chapters[data.index]
  const mode = settings.mode === 'auto'
    ? (title?.type === 'manga' ? 'paged' : 'vertical')
    : settings.mode

  useEffect(() => {
    setPage(0)
    setPct(0)
    scrollRef.current?.scrollTo(0, 0)
  }, [chapterId, mode])

  const save = useCallback((p, fraction) => {
    if (!title || !chapter) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      store.saveProgress(snapshotOf(title), chapter, p, fraction)
    }, 400)
  }, [title, chapter])

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const goChapter = useCallback((offset) => {
    const next = data?.chapters[data.index + offset]
    if (next) navigate(`/read/${id}/${next.id}`)
  }, [data, id])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') navigate('/title/' + id)
      if (mode === 'paged') {
        if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); turn(1) }
        if (e.key === 'ArrowLeft') { e.preventDefault(); turn(-1) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (loading) {
    return (
      <div className="reader">
        <div className="reader-center"><Loading label="Loading chapter…" /></div>
      </div>
    )
  }
  if (error) {
    return (
      <div className="reader">
        <div className="reader-center">
          <LoadError error={error} retry={retry} />
          <Link to={'/title/' + id} className="btn ghost">Back to title</Link>
        </div>
      </div>
    )
  }

  const { chapters, pages, index } = data
  const hasPrev = index > 0
  const hasNext = index < chapters.length - 1

  function turn(dir) {
    const next = page + dir
    if (next < 0) { if (hasPrev) goChapter(-1); return }
    if (next >= pages.length) { if (hasNext) goChapter(1); return }
    setPage(next)
    const fraction = (next + 1) / pages.length
    setPct(fraction)
    save(next + 1, fraction)
    // warm the next page so turns feel instant
    if (next + 1 < pages.length) { const im = new Image(); im.src = pages[next + 1] }
  }

  function onScroll(e) {
    const el = e.target
    const max = el.scrollHeight - el.clientHeight
    const fraction = max > 0 ? el.scrollTop / max : 1
    setPct(fraction)
    save(Math.max(1, Math.ceil(fraction * pages.length)), fraction)
  }

  function onStripTap(e) {
    const x = e.clientX / window.innerWidth
    if (x > 0.3 && x < 0.7) setUi((u) => !u)
  }

  function onPagedTap(e) {
    const x = e.clientX / window.innerWidth
    if (x < 0.3) turn(-1)
    else if (x > 0.7) turn(1)
    else setUi((u) => !u)
  }

  const widthClass = settings.width === 'full' ? 'w-full' : settings.width === 'compact' ? 'w-compact' : 'w-comfort'
  const chapterLabel = chapter.number === 'oneshot' ? 'Oneshot' : `Chapter ${chapter.number}`

  return (
    <div className="reader">
      <div className={'reader-bar top' + (ui ? '' : ' hidden')}>
        <Link to={'/title/' + id} className="reader-back" aria-label="Back to title">‹</Link>
        <div className="reader-title">
          <div className="reader-name">{title.title}</div>
          <div className="muted small">
            {chapterLabel} · {index + 1}/{chapters.length}
            {chapter.group ? ` · ${chapter.group}` : ''}
          </div>
        </div>
        <button className="reader-back" onClick={() => setSettingsOpen((s) => !s)} aria-label="Reader settings">⚙</button>
      </div>

      {settingsOpen && (
        <div className="reader-settings">
          <div className="setting-group">
            <span className="muted small">Mode</span>
            {['auto', 'vertical', 'paged'].map((m) => (
              <button key={m} className={'chip' + (settings.mode === m ? ' on' : '')}
                onClick={() => store.setSetting('mode', m)}>{m}</button>
            ))}
          </div>
          <div className="setting-group">
            <span className="muted small">Width</span>
            {['compact', 'comfort', 'full'].map((w) => (
              <button key={w} className={'chip' + (settings.width === w ? ' on' : '')}
                onClick={() => store.setSetting('width', w)}>{w}</button>
            ))}
          </div>
        </div>
      )}

      {mode === 'vertical' ? (
        <div className="reader-strip" ref={scrollRef} onScroll={onScroll} onClick={onStripTap}>
          <div className={'strip-inner ' + widthClass}>
            {pages.map((src, i) => (
              <img key={src} src={src} alt={`Page ${i + 1}`} loading={i < 3 ? 'eager' : 'lazy'} />
            ))}
            <div className="chapter-end">
              <p className="muted">End of {chapterLabel}</p>
              <div className="chapter-end-actions">
                {hasPrev && (
                  <button className="btn ghost" onClick={(e) => { e.stopPropagation(); goChapter(-1) }}>‹ Previous</button>
                )}
                {hasNext ? (
                  <button className="btn primary" onClick={(e) => { e.stopPropagation(); goChapter(1) }}>Next chapter ›</button>
                ) : (
                  <Link to={'/title/' + id} className="btn primary">You’re all caught up ✓</Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="reader-paged" onClick={onPagedTap}>
          <img src={pages[page]} alt={`Page ${page + 1}`} draggable="false" />
          <div className={'page-indicator' + (ui ? '' : ' hidden')}>{page + 1} / {pages.length}</div>
        </div>
      )}

      <div className={'reader-bar bottom' + (ui ? '' : ' hidden')}>
        <button className="btn ghost small" disabled={!hasPrev} onClick={() => goChapter(-1)}>‹ Prev</button>
        <div className="reader-progress">
          <div className="reader-progress-fill" style={{ width: `${Math.round(pct * 100)}%` }} />
        </div>
        <button className="btn ghost small" disabled={!hasNext} onClick={() => goChapter(1)}>Next ›</button>
      </div>
    </div>
  )
}
