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
  return data.user
}

export async function signOut() {
  const c = await supa()
  await c.auth.signOut()
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
