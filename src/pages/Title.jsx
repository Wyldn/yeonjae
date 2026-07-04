import { useState } from 'react'
import { Link } from '../router.jsx'
import { fetchTitle, fetchChapters, fetchSimilar, snapshotOf, timeAgo, compactNum } from '../api.js'
import { useStore, store } from '../store.js'
import { useAsync, Loading, LoadError } from '../useAsync.jsx'
import TitleCard, { Cover } from '../components/TitleCard.jsx'
import Comments from '../components/Comments.jsx'

export default function Title({ id }) {
  const { library, progress } = useStore()
  const [desc, setDesc] = useState(false)
  const [order, setOrder] = useState('desc')

  const { data, error, loading, retry } = useAsync(
    async () => {
      const title = await fetchTitle(id)
      const [chapters, similar] = await Promise.all([
        fetchChapters(id),
        fetchSimilar(title).catch(() => []),
      ])
      return { title, chapters, similar }
    },
    [id]
  )

  if (loading) return <div className="page"><Loading label="Loading title…" /></div>
  if (error) return <div className="page"><LoadError error={error} retry={retry} /></div>

  const { title, chapters, similar } = data
  const inLibrary = !!library[id]
  const prog = progress[id]
  const readUpTo = prog ? parseFloat(prog.chapterNum) || 0 : -Infinity
  const shown = order === 'desc' ? [...chapters].reverse() : chapters
  const readable = chapters.filter((c) => c.readable)
  const firstChapter = readable[0]
  const continueChapter = prog && readable.find((c) => c.id === prog.chapterId)
  const firstExternal = chapters.find((c) => c.links.length)

  return (
    <div className="page title-page">
      <div className="title-hero">
        <Cover title={title} className="title-hero-bg" />
        <div className="title-hero-scrim" />
        <div className="title-head">
          <Cover title={title} className="title-cover" />
          <div className="title-info">
            <div className="muted small title-kicker">
              <span className={'type-tag ' + title.type}>{title.type}</span>
              <span className={'status-dot ' + title.status} /> {title.status}
            </div>
            <h1>{title.title}</h1>
            <div className="muted title-byline">{title.author}{title.year ? ` · ${title.year}` : ''}</div>
            <div className="title-stats">
              {title.rating != null && <span>★ {title.rating.toFixed(2)}</span>}
              <span>{compactNum(title.follows)} follows</span>
              <span>{chapters.length} chapters</span>
            </div>
            <div className="title-genres">
              {title.genres.map((g) => (
                <Link key={g} to={'/browse?genre=' + encodeURIComponent(g)} className="chip small">{g}</Link>
              ))}
            </div>
            <div className="title-actions">
              {firstChapter ? (
                <Link
                  to={`/read/${id}/${continueChapter ? continueChapter.id : firstChapter.id}`}
                  className="btn primary"
                >
                  {continueChapter ? `Continue Ch. ${continueChapter.number}` : 'Start reading'}
                </Link>
              ) : firstExternal && (
                <a href={firstExternal.links[0].url} target="_blank" rel="noreferrer" className="btn primary">
                  Read on {firstExternal.links[0].name} ↗
                </a>
              )}
              <button
                className={'btn ghost' + (inLibrary ? ' saved' : '')}
                onClick={() => store.toggleLibrary(snapshotOf(title))}
              >
                {inLibrary ? '✓ In library' : '+ Library'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {title.description && (
        <p className={'title-desc' + (desc ? ' open' : '')} onClick={() => setDesc(!desc)}>
          {title.description}
        </p>
      )}

      <section>
        <div className="section-head">
          <h2>Chapters</h2>
          {chapters.length > 1 && (
            <button className="see-all" onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}>
              {order === 'desc' ? 'Newest first ↓' : 'Oldest first ↑'}
            </button>
          )}
        </div>
        {readable.length === 0 && chapters.length > 0 && (
          <p className="muted small licensed-note">
            This title is licensed — chapters open on the publisher’s official platform.
          </p>
        )}
        {chapters.length === 0 ? (
          <div className="empty">
            <p>No English chapters are listed for this title yet.</p>
          </div>
        ) : (
          <div className="chapter-list">
            {shown.map((c) =>
              c.readable ? (
                <Link
                  key={c.number}
                  to={`/read/${id}/${c.id}`}
                  className={'chapter-row' + (c.numeric <= readUpTo ? ' read' : '')}
                >
                  <span className="chapter-num">
                    {c.number === 'oneshot' ? 'Oneshot' : `Chapter ${c.number}`}
                    {c.title && <span className="muted chapter-name"> — {c.title}</span>}
                  </span>
                  {c.group && <span className="muted small chapter-group">{c.group}</span>}
                  <span className="muted small chapter-date">{timeAgo(c.publishAt)}</span>
                </Link>
              ) : (
                <div key={c.number} className="chapter-row external">
                  <span className="chapter-num">
                    {c.number === 'oneshot' ? 'Oneshot' : `Chapter ${c.number}`}
                    {c.title && <span className="muted chapter-name"> — {c.title}</span>}
                  </span>
                  <span className="chapter-links">
                    {c.links.map((l) => (
                      <a key={l.name} href={l.url} target="_blank" rel="noreferrer" className="platform-link">
                        {l.name} ↗
                      </a>
                    ))}
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </section>

      {similar.length > 0 && (
        <section>
          <div className="section-head"><h2>You might also like</h2></div>
          <div className="rail">
            {similar.map((t) => <TitleCard key={t.id} title={t} />)}
          </div>
        </section>
      )}

      <Comments titleId={id} />
    </div>
  )
}
