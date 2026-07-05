import { useSyncExternalStore } from 'react'

// Persistent user state: library, reading progress, history, reader settings.
// Entries carry a small title snapshot ({id,title,type,coverUrl}) so library,
// history and continue-reading render instantly without hitting the API.
const KEY = 'yeonjae:v2'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

let state = {
  library: {},   // titleId -> { addedAt, snap }
  progress: {},  // titleId -> { chapterId, chapterNum, page, pct, updatedAt, snap }
  history: [],   // [{ titleId, chapterId, chapterNum, at }] newest first
  settings: { mode: 'auto', width: 'comfort' },
  profile: { name: 'Reader', emoji: '📖', since: Date.now() },
  ...load(),
}
state.profile ||= { name: 'Reader', emoji: '📖', since: Date.now() }

const listeners = new Set()

// Optional write-through hook, registered by sync.js when cloud sync is on.
// Called after a mutation commits: (type, titleId, entry|null)
let mutationHook = null
export function setMutationHook(fn) {
  mutationHook = fn
}

function commit(next) {
  state = next
  localStorage.setItem(KEY, JSON.stringify(state))
  listeners.forEach((l) => l())
}

export function useStore() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state
  )
}

export const store = {
  get: () => state,

  toggleLibrary(snap) {
    const library = { ...state.library }
    if (library[snap.id]) delete library[snap.id]
    else library[snap.id] = { addedAt: Date.now(), snap }
    commit({ ...state, library })
    mutationHook?.('follow', snap.id, library[snap.id] || null)
  },

  saveProgress(snap, chapter, page, pct) {
    const progress = {
      ...state.progress,
      [snap.id]: {
        chapterId: chapter.id,
        chapterNum: chapter.number,
        page,
        pct: Math.min(1, Math.max(0, pct)),
        updatedAt: Date.now(),
        snap,
      },
    }
    const history = [
      { titleId: snap.id, chapterId: chapter.id, chapterNum: chapter.number, at: Date.now() },
      ...state.history.filter((h) => h.chapterId !== chapter.id),
    ].slice(0, 100)
    commit({ ...state, progress, history })
    mutationHook?.('progress', snap.id, progress[snap.id])
  },

  setSetting(key, value) {
    commit({ ...state, settings: { ...state.settings, [key]: value } })
  },

  clearHistory() {
    commit({ ...state, history: [], progress: {} })
    mutationHook?.('clearProgress')
  },

  // Merge cloud state into local (cloud wins on newer progress; follows are a
  // union). Returns entries that exist only locally so the caller can push them.
  mergeCloud(cloud) {
    const library = { ...state.library }
    const progress = { ...state.progress }
    const cloudFollowIds = new Set()
    const cloudProgressIds = new Set()

    for (const f of cloud.follows) {
      cloudFollowIds.add(f.title_id)
      if (!library[f.title_id]) {
        library[f.title_id] = { addedAt: new Date(f.added_at).getTime(), snap: f.snap }
      }
    }
    for (const p of cloud.progress) {
      cloudProgressIds.add(p.title_id)
      const at = new Date(p.updated_at).getTime()
      const local = progress[p.title_id]
      if (!local || at > local.updatedAt) {
        progress[p.title_id] = {
          chapterId: p.chapter_id,
          chapterNum: p.chapter_num,
          page: p.page,
          pct: p.pct,
          updatedAt: at,
          snap: p.snap,
        }
      }
    }
    commit({ ...state, library, progress })
    return {
      follows: Object.entries(library).filter(([id]) => !cloudFollowIds.has(id)),
      progress: Object.entries(progress).filter(([id]) => !cloudProgressIds.has(id)),
    }
  },

  setProfile(patch) {
    commit({ ...state, profile: { ...state.profile, ...patch } })
  },

  // Backup / restore of everything (localStorage is device-local)
  export() {
    return JSON.stringify(state, null, 2)
  },

  import(json) {
    const data = JSON.parse(json)
    if (!data || typeof data !== 'object' || !('library' in data)) {
      throw new Error('Not a Yeonjae backup file')
    }
    commit({ ...state, ...data })
  },
}
