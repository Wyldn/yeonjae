import { useState, useEffect } from 'react'
import { cloudEnabled, getComments, addComment, currentUser, signIn, signUp, signOut } from '../social.js'
import { timeAgo } from '../api.js'

function AuthBox({ onAuthed }) {
  const [mode, setMode] = useState('in') // in | up
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'up') await signUp(email, password, username.trim() || email.split('@')[0])
      else await signIn(email, password)
      onAuthed()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-box" onSubmit={submit}>
      <p className="muted small">
        {mode === 'up' ? 'Create an account to join the discussion.' : 'Sign in to comment.'}
      </p>
      {mode === 'up' && (
        <input className="field" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      )}
      <input className="field" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="field" type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="error small">{error}</p>}
      <div className="auth-actions">
        <button className="btn primary small" disabled={busy}>{mode === 'up' ? 'Sign up' : 'Sign in'}</button>
        <button type="button" className="btn ghost small" onClick={() => setMode(mode === 'up' ? 'in' : 'up')}>
          {mode === 'up' ? 'I have an account' : 'Create account'}
        </button>
      </div>
    </form>
  )
}

export default function Comments({ titleId }) {
  const [comments, setComments] = useState(null)
  const [user, setUser] = useState(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function refresh() {
    try {
      setComments(await getComments(titleId))
    } catch {
      setComments([])
    }
    if (cloudEnabled) setUser(await currentUser().catch(() => null))
  }

  useEffect(() => { refresh() }, [titleId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function post(e) {
    e.preventDefault()
    if (!draft.trim()) return
    setBusy(true)
    setError(null)
    try {
      await addComment(titleId, draft)
      setDraft('')
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const canPost = !cloudEnabled || user

  return (
    <section>
      <div className="section-head">
        <h2>Comments{comments ? ` (${comments.length})` : ''}</h2>
        {cloudEnabled && user && (
          <button className="see-all" onClick={async () => { await signOut(); setUser(null) }}>Sign out</button>
        )}
      </div>

      {!cloudEnabled && (
        <p className="muted small local-note">
          Comments are stored on this device for now — community comments switch on
          once the backend is connected.
        </p>
      )}

      {canPost ? (
        <form className="comment-form" onSubmit={post}>
          <textarea
            className="field"
            rows={2}
            placeholder="Share your thoughts…"
            value={draft}
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
          />
          {error && <p className="error small">{error}</p>}
          <button className="btn primary small" disabled={busy || !draft.trim()}>
            {busy ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      ) : (
        <AuthBox onAuthed={refresh} />
      )}

      <div className="comment-list">
        {comments === null && <p className="muted small">Loading comments…</p>}
        {comments?.length === 0 && <p className="muted small">No comments yet. Start the conversation.</p>}
        {comments?.map((c) => (
          <div key={c.id} className="comment">
            <div className="comment-head">
              <span className="comment-name">{c.name}</span>
              <span className="muted small">{timeAgo(c.at)}</span>
            </div>
            <p className="comment-body">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
