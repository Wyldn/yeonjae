import { useState } from 'react'
import { signIn, signUp } from '../social.js'

export default function AuthBox({ onAuthed, prompt }) {
  const [mode, setMode] = useState('in') // in | up
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      if (mode === 'up') {
        const { needsConfirm } = await signUp(email, password, username.trim() || email.split('@')[0])
        if (needsConfirm) {
          setNotice('Almost there — click the confirmation link we sent to your email, then sign in.')
          setMode('in')
          return
        }
      } else {
        await signIn(email, password)
      }
      onAuthed?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="auth-box" onSubmit={submit}>
      <p className="muted small">
        {mode === 'up' ? 'Create an account to join the discussion.' : (prompt || 'Sign in to comment.')}
      </p>
      {mode === 'up' && (
        <input className="field" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
      )}
      <input className="field" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="field" type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="error small">{error}</p>}
      {notice && <p className="notice small">{notice}</p>}
      <div className="auth-actions">
        <button className="btn primary small" disabled={busy}>{mode === 'up' ? 'Sign up' : 'Sign in'}</button>
        <button type="button" className="btn ghost small" onClick={() => setMode(mode === 'up' ? 'in' : 'up')}>
          {mode === 'up' ? 'I have an account' : 'Create account'}
        </button>
      </div>
    </form>
  )
}
