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
  ...load(),
}

const listeners = new Set()

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
  },

  setSetting(key, value) {
    commit({ ...state, settings: { ...state.settings, [key]: value } })
  },

  clearHistory() {
    commit({ ...state, history: [], progress: {} })
  },
}
