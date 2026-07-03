import { Link } from '../router.jsx'
import { useStore } from '../store.js'
import TitleCard from '../components/TitleCard.jsx'

export default function Library() {
  const { library, progress } = useStore()
  const entries = Object.values(library)
    .filter((e) => e.snap)
    .sort((a, b) => b.addedAt - a.addedAt)

  return (
    <div className="page">
      <h1>Library</h1>
      {entries.length === 0 ? (
        <div className="empty">
          <p>Your library is empty. Save titles to keep them here.</p>
          <Link to="/browse" className="btn ghost">Browse titles</Link>
        </div>
      ) : (
        <div className="grid">
          {entries.map(({ snap }) => {
            const p = progress[snap.id]
            return <TitleCard key={snap.id} title={snap} progress={p ? p.pct : null} />
          })}
        </div>
      )}
    </div>
  )
}
