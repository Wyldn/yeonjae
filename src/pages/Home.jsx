import { Link } from '../router.jsx'
import { fetchHome, compactNum } from '../api.js'
import { useStore } from '../store.js'
import { useAsync, Loading, LoadError } from '../useAsync.jsx'
import TitleCard, { Cover } from '../components/TitleCard.jsx'

function ContinueRail() {
  const { progress } = useStore()
  const entries = Object.values(progress)
    .filter((e) => e.snap)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8)

  if (entries.length === 0) return null
  return (
    <section>
      <div className="section-head">
        <h2>Continue reading</h2>
        <Link to="/history" className="see-all">History →</Link>
      </div>
      <div className="rail">
        {entries.map((e) => (
          <Link key={e.snap.id} to={`/read/${e.snap.id}/${e.chapterId}`} className="continue-card">
            <Cover title={e.snap} />
            <div className="continue-info">
              <div className="continue-title">{e.snap.title}</div>
              <div className="muted small">Ch. {e.chapterNum} · {Math.round(e.pct * 100)}%</div>
              <div className="card-progress inline"><div style={{ width: `${Math.round(e.pct * 100)}%` }} /></div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const { data, error, loading, retry } = useAsync(fetchHome, [])

  if (loading) return <div className="page"><ContinueRail /><Loading label="Loading fresh titles…" /></div>
  if (error) return <div className="page"><ContinueRail /><LoadError error={error} retry={retry} /></div>

  const { trending, latest, topRated } = data
  const hero = trending[0]

  return (
    <div className="page">
      {hero && (
        <Link to={'/title/' + hero.id} className="hero">
          <Cover title={hero} className="hero-bg" />
          <div className="hero-scrim" />
          <div className="hero-body">
            <span className="hero-kicker">#1 Most followed</span>
            <h1>{hero.title}</h1>
            <p className="hero-desc">{hero.description}</p>
            <div className="hero-meta muted">
              <span className={'type-tag ' + hero.type}>{hero.type}</span>
              {hero.rating != null && <span>★ {hero.rating.toFixed(1)}</span>}
              <span>{compactNum(hero.follows)} follows</span>
            </div>
          </div>
        </Link>
      )}

      <ContinueRail />

      <section>
        <div className="section-head">
          <h2>Most followed</h2>
          <Link to="/browse?sort=popular" className="see-all">See all →</Link>
        </div>
        <div className="rail">
          {trending.map((t, i) => (
            <div className="ranked" key={t.id}>
              <span className="rank-num">{i + 1}</span>
              <TitleCard title={t} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Latest updates</h2>
          <Link to="/browse?sort=updated" className="see-all">See all →</Link>
        </div>
        <div className="grid">
          {latest.map((t) => <TitleCard key={t.id} title={t} showUpdated />)}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Top rated</h2>
          <Link to="/browse?sort=rating" className="see-all">See all →</Link>
        </div>
        <div className="rail">
          {topRated.map((t) => <TitleCard key={t.id} title={t} />)}
        </div>
      </section>

      <p className="muted small attribution">
        Data and images from <a href="https://mangadex.org" target="_blank" rel="noreferrer">MangaDex</a>.
        Support scanlation groups and official releases.
      </p>
    </div>
  )
}
