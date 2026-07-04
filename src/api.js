// MangaDex API client — https://api.mangadex.org/docs/
// All app data flows through this module.

// MangaDex only allows browser CORS from localhost, so anywhere else
// (phone on LAN, deployed site) calls go through a same-origin '/md-api'
// proxy — the Vite dev server provides it; production hosts need their own.
const API = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  ? 'https://api.mangadex.org'
  : '/md-api'
const COVERS = 'https://uploads.mangadex.org/covers'

// Keep it comfortable for a general audience.
const CONTENT_RATINGS = ['safe', 'suggestive']

// ---- tiny fetch cache (TTL + in-flight dedupe) ----
const cache = new Map()

async function get(path, params = {}, ttl = 5 * 60e3) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((x) => qs.append(k + '[]', x))
    else if (v !== undefined && v !== null) qs.append(k, v)
  }
  const url = `${API}${path}?${qs}`
  const hit = cache.get(url)
  if (hit && (hit.promise || Date.now() - hit.at < ttl)) return hit.promise || hit.data
  const promise = fetch(url).then(async (r) => {
    if (!r.ok) {
      cache.delete(url)
      throw new Error(`MangaDex ${r.status} on ${path}`)
    }
    const data = await r.json()
    cache.set(url, { data, at: Date.now() })
    return data
  })
  cache.set(url, { promise })
  return promise
}

// ---- normalization ----

const TYPE_BY_LANG = { ko: 'manhwa', 'ko-ro': 'manhwa', ja: 'manga', 'ja-ro': 'manga', zh: 'manhua', 'zh-hk': 'manhua', 'zh-ro': 'manhua' }

function pickText(obj) {
  if (!obj) return ''
  return obj.en || obj['ja-ro'] || obj['ko-ro'] || obj['zh-ro'] || Object.values(obj)[0] || ''
}

function bestTitle(a) {
  if (a.title.en) return a.title.en
  const alt = (a.altTitles || []).find((t) => t.en)
  return alt?.en || pickText(a.title)
}

function normalize(m, statsMap = {}) {
  const a = m.attributes
  const rels = m.relationships || []
  const coverFile = rels.find((r) => r.type === 'cover_art')?.attributes?.fileName
  const author = rels.find((r) => r.type === 'author')?.attributes?.name
  const stats = statsMap[m.id] || {}
  return {
    id: m.id,
    title: bestTitle(a),
    description: pickText(a.description),
    type: TYPE_BY_LANG[a.originalLanguage] || 'comic',
    status: a.status,
    year: a.year,
    author: author || '',
    genres: a.tags.filter((t) => t.attributes.group === 'genre').map((t) => pickText(t.attributes.name)),
    coverUrl: coverFile ? `${COVERS}/${m.id}/${coverFile}.256.jpg` : null,
    coverUrlLarge: coverFile ? `${COVERS}/${m.id}/${coverFile}.512.jpg` : null,
    updatedAt: a.updatedAt,
    lastChapter: a.lastChapter || null,
    rating: stats.rating?.bayesian ?? null,
    follows: stats.follows ?? null,
  }
}

// Small snapshot persisted in localStorage for library/history/continue-reading,
// so those pages render instantly without network.
export function snapshotOf(t) {
  return { id: t.id, title: t.title, type: t.type, coverUrl: t.coverUrl }
}

async function withStats(mangas) {
  if (mangas.length === 0) return []
  const ids = mangas.map((m) => m.id)
  let statsMap = {}
  try {
    const s = await get('/statistics/manga', { manga: ids })
    statsMap = s.statistics || {}
  } catch {
    // stats are decorative — render without them rather than failing the page
  }
  return mangas.map((m) => normalize(m, statsMap))
}

const LIST_DEFAULTS = {
  contentRating: CONTENT_RATINGS,
  availableTranslatedLanguage: ['en'],
  hasAvailableChapters: 'true',
  includes: ['cover_art', 'author'],
}

async function list(order, extra = {}, limit = 24, offset = 0) {
  const params = { ...LIST_DEFAULTS, ...extra, limit, offset }
  for (const [k, v] of Object.entries(order)) params[`order[${k}]`] = v
  const res = await get('/manga', params)
  return { items: await withStats(res.data), total: res.total }
}

// ---- public queries ----

// Latest updates built from the chapter feed (hosted, readable chapters only),
// then resolved to manga — the manga-level "latest uploaded" sort includes
// titles whose chapters were since delisted.
async function fetchLatestUpdates(count = 18) {
  const res = await get('/chapter', {
    translatedLanguage: ['en'],
    contentRating: CONTENT_RATINGS,
    'order[readableAt]': 'desc',
    includeExternalUrl: 0,
    includeEmptyPages: 0,
    limit: 60,
  }, 60e3)
  const seen = new Map() // mangaId -> readableAt of newest chapter
  for (const c of res.data) {
    const mangaId = c.relationships?.find((r) => r.type === 'manga')?.id
    if (mangaId && !seen.has(mangaId)) seen.set(mangaId, c.attributes.readableAt)
    if (seen.size >= count) break
  }
  const ids = [...seen.keys()]
  const items = await fetchByIds(ids)
  const byId = new Map(items.map((t) => [t.id, t]))
  return ids
    .map((id) => byId.get(id) && { ...byId.get(id), updatedAt: seen.get(id) })
    .filter(Boolean)
}

export async function fetchHome() {
  const [trending, latest, rated] = await Promise.all([
    list({ followedCount: 'desc' }, {}, 12),
    fetchLatestUpdates(18),
    list({ rating: 'desc' }, {}, 12),
  ])
  return { trending: trending.items, latest, topRated: rated.items }
}

const SORT_ORDERS = {
  popular: { followedCount: 'desc' },
  rating: { rating: 'desc' },
  updated: { latestUploadedChapter: 'desc' },
  newest: { createdAt: 'desc' },
  'a-z': { title: 'asc' },
}

const LANGS_BY_TYPE = { manhwa: ['ko'], manga: ['ja'], manhua: ['zh', 'zh-hk'] }

export async function fetchBrowse({ type, genre, status, sort, offset = 0 }) {
  const extra = {}
  if (type && type !== 'all') extra.originalLanguage = LANGS_BY_TYPE[type]
  if (status && status !== 'all') extra.status = [status]
  if (genre && genre !== 'all') {
    const tags = await fetchGenres()
    const tag = tags.find((t) => t.name === genre)
    if (tag) extra.includedTags = [tag.id]
  }
  return list(SORT_ORDERS[sort] || SORT_ORDERS.popular, extra, 24, offset)
}

let genresPromise
export function fetchGenres() {
  genresPromise ||= get('/manga/tag', {}, 24 * 3600e3).then((res) =>
    res.data
      .filter((t) => t.attributes.group === 'genre')
      .map((t) => ({ id: t.id, name: pickText(t.attributes.name) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  )
  return genresPromise
}

export async function searchTitles(q) {
  if (!q.trim()) return []
  const res = await get('/manga', { ...LIST_DEFAULTS, title: q.trim(), limit: 10 }, 60e3)
  return withStats(res.data)
}

export async function fetchTitle(id) {
  const res = await get(`/manga/${id}`, { includes: ['cover_art', 'author'] })
  return (await withStats([res.data]))[0]
}

export async function fetchByIds(ids) {
  if (ids.length === 0) return []
  const res = await get('/manga', { ...LIST_DEFAULTS, ids, limit: ids.length })
  return withStats(res.data)
}

function platformName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').split('.')[0]
  } catch {
    return 'official site'
  }
}

// Full English chapter list, deduped by chapter number. Chapters hosted on
// MangaDex are readable in-app; licensed/delisted chapters keep their official
// platform links (Tappytoon, MangaPlus, …) so the list stays complete.
export async function fetchChapters(mangaId) {
  const all = []
  let offset = 0
  let total = Infinity
  while (offset < total && offset < 2000) {
    const res = await get(`/manga/${mangaId}/feed`, {
      translatedLanguage: ['en'],
      contentRating: CONTENT_RATINGS,
      'order[chapter]': 'desc',
      includes: ['scanlation_group'],
      limit: 500,
      offset,
    })
    total = res.total
    all.push(...res.data)
    offset += 500
  }
  const byNumber = new Map()
  for (const c of all) {
    const a = c.attributes
    const num = a.chapter === null ? 'oneshot' : a.chapter
    let entry = byNumber.get(num)
    if (!entry) {
      entry = {
        number: num,
        numeric: a.chapter === null ? 0 : parseFloat(a.chapter),
        title: '',
        publishAt: a.publishAt,
        readable: false,
        links: [], // official platforms for non-hosted chapters
      }
      byNumber.set(num, entry)
    }
    entry.title ||= a.title || ''
    const hosted = a.pages > 0 && !a.externalUrl && !a.isUnavailable
    if (hosted && !entry.readable) {
      Object.assign(entry, {
        readable: true,
        id: c.id,
        pages: a.pages,
        publishAt: a.publishAt,
        group: c.relationships?.find((r) => r.type === 'scanlation_group')?.attributes?.name || '',
      })
    } else if (a.externalUrl) {
      const name = platformName(a.externalUrl)
      if (!entry.links.some((l) => l.name === name)) {
        entry.links.push({ url: a.externalUrl, name })
      }
    }
  }
  // ascending by chapter number; the reader walks the readable subset
  return [...byNumber.values()]
    .filter((c) => c.readable || c.links.length)
    .sort((a, b) => a.numeric - b.numeric)
}

export async function fetchPages(chapterId) {
  const res = await get(`/at-home/server/${chapterId}`, {}, 10 * 60e3)
  const { baseUrl, chapter } = res
  return chapter.data.map((f) => `${baseUrl}/data/${chapter.hash}/${f}`)
}

export async function fetchSimilar(title) {
  if (!title.genres.length) return []
  const tags = await fetchGenres()
  const ids = title.genres
    .map((g) => tags.find((t) => t.name === g)?.id)
    .filter(Boolean)
    .slice(0, 2)
  if (!ids.length) return []
  const res = await list({ followedCount: 'desc' }, { includedTags: ids }, 8)
  return res.items.filter((t) => t.id !== title.id).slice(0, 6)
}

// ---- misc helpers ----

export function timeAgo(iso) {
  const hours = (Date.now() - new Date(iso).getTime()) / 3.6e6
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.round(hours)}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export function compactNum(n) {
  if (n == null) return '—'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K'
  return String(n)
}

// Gradient placeholder for missing covers.
export function placeholderCover(title) {
  let h = 0
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  const hue = h % 360
  const initial = (title.replace(/^(the|a)\s+/i, '').charAt(0) || '?').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},40%,14%)"/><stop offset="1" stop-color="hsl(${hue},50%,28%)"/></linearGradient></defs><rect width="300" height="420" fill="url(#g)"/><text x="150" y="235" font-family="Georgia,serif" font-size="140" font-weight="700" fill="hsl(${hue},60%,70%)" opacity="0.85" text-anchor="middle">${initial}</text></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
