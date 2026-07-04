import { Link } from '../router.jsx'
import { fetchFollowUpdates, timeAgo } from '../api.js'
import { useStore } from '../store.js'
import { useAsync } from '../useAsync.jsx'
import TitleCard, { Cover } from '../components/TitleCard.jsx'

function UpdatesFeed({ ids }) {
  const { progress } = useStore()
  const { data: updates, loading } = useAsync(() => fetchFollowUpdates(ids), [ids.join(',')])

  if (loading || !updates?.length) return null
  return (
    <section>
      <div className="section-head"><h2>New chapters</h2></div>
      <div className="history-list">
        {updates.slice(0, 10).map((u) => {
          const isNew = Date.now() - new Date(u.at) < 3 * 864e5
          const unread = progress[u.title.id]?.chapterId !== u.chapterId
          return (
            <Link
              key={u.title.id}
              to={u.readable ? `/read/${u.title.id}/${u.chapterId}` : '/title/' + u.title.id}
              className="history-row"
            >
              <Cover title={u.title} />
              <div className="history-info">
                <div className="history-title">{u.title.title}</div>
                <div className="muted small">
                  Ch. {u.chapterNum} · {timeAgo(u.at)}
                  {!u.readable && ' · official site'}
                </div>
              </div>
              {isNew && unread && <span className="new-badge">NEW</span>}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default function Library() {
  const { library, progress } = useStore()
  const entries = Object.values(library)
    .filter((e) => e.snap)
    .sort((a, b) => b.addedAt - a.addedAt)
  const ids = entries.map((e) => e.snap.id)

  return (
    <div className="page">
      <h1>Library</h1>
      {entries.length === 0 ? (
        <div className="empty">
          <p>Your library is empty. Follow titles to track new chapters here.</p>
          <Link to="/browse" className="btn ghost">Browse titles</Link>
        </div>
      ) : (
        <>
          <UpdatesFeed ids={ids} />
          <section>
            <div className="section-head"><h2>Following ({entries.length})</h2></div>
            <div className="grid">
              {entries.map(({ snap }) => {
                const p = progress[snap.id]
                return <TitleCard key={snap.id} title={snap} progress={p ? p.pct : null} />
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
