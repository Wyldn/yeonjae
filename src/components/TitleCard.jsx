import { Link } from '../router.jsx'
import { placeholderCover, timeAgo } from '../api.js'

export function Cover({ title, className }) {
  return (
    <img
      className={className}
      src={title.coverUrl || placeholderCover(title.title)}
      alt={title.title}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(e) => { e.currentTarget.src = placeholderCover(title.title) }}
    />
  )
}

export default function TitleCard({ title, progress, showUpdated }) {
  return (
    <Link to={'/title/' + title.id} className="card">
      <div className="card-cover">
        <Cover title={title} />
        <span className={'type-tag on-cover ' + title.type}>{title.type}</span>
        {progress != null && (
          <div className="card-progress">
            <div style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
      </div>
      <div className="card-title">{title.title}</div>
      <div className="card-sub muted">
        {showUpdated && title.updatedAt
          ? <>updated {timeAgo(title.updatedAt)}</>
          : title.rating != null
            ? <>★ {title.rating.toFixed(1)}{title.lastChapter ? ` · ${title.lastChapter} ch` : ''}</>
            : <span className="cap">{title.status || ''}</span>}
      </div>
    </Link>
  )
}
