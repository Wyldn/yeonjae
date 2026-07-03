import { Link } from '../router.jsx'
import { timeAgo } from '../api.js'
import { useStore, store } from '../store.js'
import { Cover } from '../components/TitleCard.jsx'

export default function History() {
  const { history, progress, library } = useStore()
  const rows = history
    .map((h) => ({ ...h, snap: progress[h.titleId]?.snap || library[h.titleId]?.snap }))
    .filter((h) => h.snap)

  return (
    <div className="page">
      <div className="browse-head">
        <h1>History</h1>
        {rows.length > 0 && (
          <button className="btn ghost small" onClick={() => store.clearHistory()}>Clear all</button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="empty">
          <p>Nothing here yet. Chapters you read will show up here.</p>
          <Link to="/" className="btn ghost">Find something to read</Link>
        </div>
      ) : (
        <div className="history-list">
          {rows.map((h) => {
            const p = progress[h.titleId]
            const isCurrent = p && p.chapterId === h.chapterId
            return (
              <Link key={h.chapterId} to={`/read/${h.titleId}/${h.chapterId}`} className="history-row">
                <Cover title={h.snap} />
                <div className="history-info">
                  <div className="history-title">{h.snap.title}</div>
                  <div className="muted small">
                    Ch. {h.chapterNum}
                    {isCurrent && p.pct < 1 ? ` · ${Math.round(p.pct * 100)}%` : ''}
                    {' · '}{timeAgo(new Date(h.at).toISOString())}
                  </div>
                </div>
                <span className="btn ghost small">{isCurrent && p.pct < 1 ? 'Resume' : 'Reread'}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
