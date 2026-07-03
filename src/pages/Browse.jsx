import { useState, useEffect } from 'react'
import { useRoute, navigate } from '../router.jsx'
import { fetchBrowse, fetchGenres } from '../api.js'
import { useAsync, Loading, LoadError } from '../useAsync.jsx'
import TitleCard from '../components/TitleCard.jsx'

const TYPES = ['manhwa', 'manga', 'manhua']
const STATUSES = ['ongoing', 'completed', 'hiatus']
const SORTS = [
  ['popular', 'Most popular'],
  ['rating', 'Top rated'],
  ['updated', 'Recently updated'],
  ['newest', 'Newest'],
  ['a-z', 'A–Z'],
]

function Chips({ value, options, onPick, allLabel }) {
  return (
    <div className="chips">
      <button className={'chip' + (value === 'all' ? ' on' : '')} onClick={() => onPick('all')}>
        {allLabel}
      </button>
      {options.map((o) => (
        <button key={o} className={'chip' + (value === o ? ' on' : '')} onClick={() => onPick(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

export default function Browse() {
  const { params } = useRoute()
  const type = params.get('type') || 'all'
  const genre = params.get('genre') || 'all'
  const status = params.get('status') || 'all'
  const sort = params.get('sort') || 'popular'

  const [genres, setGenres] = useState([])
  const [extra, setExtra] = useState([]) // "load more" pages
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => { fetchGenres().then(setGenres).catch(() => {}) }, [])

  const { data, error, loading, retry } = useAsync(
    () => fetchBrowse({ type, genre, status, sort }),
    [type, genre, status, sort]
  )
  useEffect(() => setExtra([]), [type, genre, status, sort])

  const set = (key, value) => {
    const p = new URLSearchParams(params)
    if (value === 'all' || (key === 'sort' && value === 'popular')) p.delete(key)
    else p.set(key, value)
    const qs = p.toString()
    navigate('/browse' + (qs ? '?' + qs : ''), { replace: true })
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const next = await fetchBrowse({ type, genre, status, sort, offset: items.length })
      setExtra((e) => [...e, ...next.items])
    } finally {
      setLoadingMore(false)
    }
  }

  const items = [...(data?.items || []), ...extra]
  const total = data?.total ?? 0

  return (
    <div className="page">
      <div className="browse-head">
        <h1>Browse</h1>
        <select className="sort-select" value={sort} onChange={(e) => set('sort', e.target.value)}>
          {SORTS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </div>

      <Chips value={type} options={TYPES} onPick={(v) => set('type', v)} allLabel="All types" />
      <Chips value={status} options={STATUSES} onPick={(v) => set('status', v)} allLabel="Any status" />
      <Chips value={genre} options={genres.map((g) => g.name)} onPick={(v) => set('genre', v)} allLabel="All genres" />

      {loading && <Loading />}
      {error && <LoadError error={error} retry={retry} />}

      {data && (
        <>
          <p className="muted small result-count">{total.toLocaleString()} title{total === 1 ? '' : 's'}</p>
          {items.length === 0 ? (
            <div className="empty">
              <p>Nothing matches those filters.</p>
              <button className="btn ghost" onClick={() => navigate('/browse', { replace: true })}>
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid">
                {items.map((t) => <TitleCard key={t.id} title={t} showUpdated={sort === 'updated'} />)}
              </div>
              {items.length < total && (
                <button className="btn ghost load-more" disabled={loadingMore} onClick={loadMore}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
