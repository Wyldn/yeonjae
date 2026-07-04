import { useState, useRef } from 'react'
import { useStore, store } from '../store.js'

const EMOJI = ['📖', '⚔️', '🌙', '🦊', '🌸', '👾', '🐉', '☕', '🎧', '🗡️']

export default function Profile() {
  const { profile, library, history, progress } = useStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile.name)
  const fileRef = useRef(null)

  const titlesRead = new Set(history.map((h) => h.titleId)).size
  const finished = Object.values(progress).filter((p) => p.pct >= 0.98).length
  const byType = {}
  for (const e of Object.values(library)) {
    if (e.snap) byType[e.snap.type] = (byType[e.snap.type] || 0) + 1
  }

  function saveName() {
    store.setProfile({ name: name.trim() || 'Reader' })
    setEditing(false)
  }

  function download() {
    const blob = new Blob([store.export()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'yeonjae-backup.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function restore(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      store.import(await file.text())
      alert('Backup restored.')
    } catch (err) {
      alert('Could not restore: ' + err.message)
    }
    e.target.value = ''
  }

  return (
    <div className="page">
      <h1>Profile</h1>

      <div className="profile-card">
        <button
          className="avatar"
          title="Change avatar"
          onClick={() => {
            const i = (EMOJI.indexOf(profile.emoji) + 1) % EMOJI.length
            store.setProfile({ emoji: EMOJI[i] })
          }}
        >
          {profile.emoji}
        </button>
        <div className="profile-info">
          {editing ? (
            <div className="profile-edit">
              <input className="field" value={name} maxLength={24}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveName()} autoFocus />
              <button className="btn primary small" onClick={saveName}>Save</button>
            </div>
          ) : (
            <div className="profile-name" onClick={() => setEditing(true)} title="Tap to edit">
              {profile.name} <span className="muted small">✎</span>
            </div>
          )}
          <div className="muted small">
            Reading since {new Date(profile.since).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat"><div className="stat-num">{Object.keys(library).length}</div><div className="muted small">Following</div></div>
        <div className="stat"><div className="stat-num">{history.length}</div><div className="muted small">Chapters read</div></div>
        <div className="stat"><div className="stat-num">{titlesRead}</div><div className="muted small">Titles read</div></div>
        <div className="stat"><div className="stat-num">{finished}</div><div className="muted small">Caught up</div></div>
      </div>

      {Object.keys(byType).length > 0 && (
        <section>
          <div className="section-head"><h2>Your library</h2></div>
          <div className="type-bars">
            {Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([type, n]) => (
              <div key={type} className="type-bar-row">
                <span className={'type-tag ' + type}>{type}</span>
                <div className="type-bar">
                  <div style={{ width: `${(n / Object.keys(library).length) * 100}%` }} />
                </div>
                <span className="muted small">{n}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="section-head"><h2>Your data</h2></div>
        <p className="muted small">
          Your library, history and progress live in this browser. Back them up to move
          between devices.
        </p>
        <div className="title-actions">
          <button className="btn ghost" onClick={download}>Download backup</button>
          <button className="btn ghost" onClick={() => fileRef.current?.click()}>Restore backup</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={restore} />
        </div>
      </section>
    </div>
  )
}
