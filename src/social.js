// Community layer (comments). Two backends:
//  - Supabase, when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are set at build
//    time (see supabase/schema.sql) — real cross-user comments with auth.
//  - Otherwise a local, on-device store so the UI still works end to end.
import { store } from './store.js'

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL
const SUPA_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const cloudEnabled = !!(SUPA_URL && SUPA_KEY)

let clientPromise
function supa() {
  clientPromise ||= import('@supabase/supabase-js').then((m) =>
    m.createClient(SUPA_URL, SUPA_KEY)
  )
  return clientPromise
}

// ---- auth (cloud mode only) ----

let authUser = null
let authReady = false
const authListeners = new Set()

export function getAuthUser() {
  return authUser
}

export function subscribeAuth(fn) {
  authListeners.add(fn)
  return () => authListeners.delete(fn)
}

function setAuthUser(user) {
  authUser = user
  authReady = true
  authListeners.forEach((l) => l(user))
}

// Start watching the session; resolves after the initial session is known.
export async function initAuth() {
  if (!cloudEnabled || authReady) return authUser
  const c = await supa()
  c.auth.onAuthStateChange((_event, session) => setAuthUser(session?.user ?? null))
  const { data } = await c.auth.getSession()
  setAuthUser(data.session?.user ?? null)
  return authUser
}

export async function currentUser() {
  if (!cloudEnabled) return null
  const c = await supa()
  const { data } = await c.auth.getUser()
  return data.user
}

export async function signIn(email, password) {
  const c = await supa()
  const { error } = await c.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUp(email, password, username) {
  const c = await supa()
  const { data, error } = await c.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })
  if (error) throw error
  // With email confirmation enabled, there's no session until the link is clicked
  return { user: data.user, needsConfirm: !data.session }
}

export async function signOut() {
  const c = await supa()
  await c.auth.signOut()
}

// ---- cloud sync: follows + progress (cloud mode, signed in) ----
// All of these swallow errors: sync is best-effort and must never break reading.

let syncBroken = false // e.g. tables not created yet

function syncable() {
  return cloudEnabled && authUser && !syncBroken
}

function syncFail(error, what) {
  // 42P01 = Postgres "relation does not exist"; PGRST205 = PostgREST can't
  // find the table. Either way the sync tables aren't set up: stop trying.
  if (error?.code === '42P01' || error?.code === 'PGRST205') syncBroken = true
  console.warn(`yeonjae sync: ${what} failed —`, error?.message || error)
}

export async function fetchCloudState() {
  if (!syncable()) return null
  try {
    const c = await supa()
    const [f, p] = await Promise.all([
      c.from('follows').select('title_id, snap, added_at'),
      c.from('progress').select('title_id, chapter_id, chapter_num, page, pct, snap, updated_at'),
    ])
    if (f.error) throw f.error
    if (p.error) throw p.error
    return { follows: f.data, progress: p.data }
  } catch (error) {
    syncFail(error, 'pull')
    return null
  }
}

export async function cloudSetFollow(titleId, entry) {
  if (!syncable()) return
  try {
    const c = await supa()
    if (entry) {
      const { error } = await c.from('follows').upsert({
        user_id: authUser.id,
        title_id: titleId,
        snap: entry.snap,
        added_at: new Date(entry.addedAt).toISOString(),
      })
      if (error) throw error
    } else {
      const { error } = await c.from('follows').delete().eq('title_id', titleId)
      if (error) throw error
    }
  } catch (error) {
    syncFail(error, 'follow')
  }
}

export async function cloudSaveProgress(titleId, e) {
  if (!syncable()) return
  try {
    const c = await supa()
    const { error } = await c.from('progress').upsert({
      user_id: authUser.id,
      title_id: titleId,
      chapter_id: e.chapterId,
      chapter_num: String(e.chapterNum),
      page: e.page,
      pct: e.pct,
      snap: e.snap,
      updated_at: new Date(e.updatedAt).toISOString(),
    })
    if (error) throw error
  } catch (error) {
    syncFail(error, 'progress')
  }
}

export async function cloudClearProgress() {
  if (!syncable()) return
  try {
    const c = await supa()
    const { error } = await c.from('progress').delete().eq('user_id', authUser.id)
    if (error) throw error
  } catch (error) {
    syncFail(error, 'clear')
  }
}

// ---- comments ----

const LOCAL_KEY = 'yeonjae:comments'

function localComments() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}
  } catch {
    return {}
  }
}

export async function getComments(titleId) {
  if (cloudEnabled) {
    const c = await supa()
    const { data, error } = await c
      .from('comments')
      .select('id, username, body, created_at')
      .eq('title_id', titleId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return data.map((r) => ({ id: r.id, name: r.username, body: r.body, at: r.created_at }))
  }
  return (localComments()[titleId] || []).slice().reverse()
}

export async function addComment(titleId, body) {
  const text = body.trim()
  if (!text) throw new Error('Empty comment')
  if (cloudEnabled) {
    const c = await supa()
    const user = await currentUser()
    if (!user) throw new Error('Sign in to comment')
    const username = user.user_metadata?.username || user.email.split('@')[0]
    const { error } = await c.from('comments').insert({
      title_id: titleId,
      user_id: user.id,
      username,
      body: text,
    })
    if (error) throw error
    return
  }
  const all = localComments()
  all[titleId] = [
    ...(all[titleId] || []),
    { id: crypto.randomUUID(), name: store.get().profile.name, body: text, at: new Date().toISOString() },
  ]
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
}
