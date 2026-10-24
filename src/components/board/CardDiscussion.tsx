import { useState } from 'react'
import { History, MessageSquare, Send } from 'lucide-react'
import type { Card } from '../../lib/board'

type Props = { card: Card; actor: string; onComment: (body: string) => string | undefined }
type Filter = 'all' | 'comments' | 'activity'
const dateFormat = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' })

export function CardDiscussion({ card, actor, onComment }: Props) {
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [notice, setNotice] = useState('')
  const comments = (card.comments ?? []).map(comment => ({ ...comment, kind: 'comment' as const }))
  const activity = (card.activity ?? []).map(entry => ({ ...entry, kind: 'activity' as const }))
  const entries = [...(filter !== 'activity' ? comments : []), ...(filter !== 'comments' ? activity : [])]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

  return (
    <section className="card-discussion" aria-labelledby="card-discussion-title">
      <h3 id="card-discussion-title"><MessageSquare size={17} aria-hidden="true" />Comentarios y actividad</h3>
      <form className="comment-composer" onSubmit={event => {
        event.preventDefault()
        const message = onComment(body)
        if (message) { setError(message); return }
        setBody(''); setError(''); setFilter('all'); setNotice('Comentario publicado.')
      }}>
        <label htmlFor="card-comment">Agregar un comentario</label>
        <textarea id="card-comment" rows={3} maxLength={2000} value={body} placeholder="Escribe un comentario…"
          onChange={event => { setBody(event.target.value); setError(''); setNotice('') }} />
        <div className="comment-composer-footer"><span>Como {actor}</span>
          <button className="primary-button" disabled={!body.trim()}><Send size={13} aria-hidden="true" />Publicar</button>
        </div>
        {error && <p className="label-error" role="alert">{error}</p>}
        <span className="sr-only" role="status">{notice}</span>
      </form>
      <div className="activity-filters" role="group" aria-label="Filtrar historial">
        {([['all', 'Todo'], ['comments', 'Comentarios'], ['activity', 'Actividad']] as const).map(([value, title]) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{title}</button>
        ))}
      </div>
      <div className="card-history-scroll" role="region" aria-label="Historial de la tarjeta" tabIndex={0}>
      {entries.length === 0 ? <p className="activity-empty">{filter === 'comments' ? 'Todavía no hay comentarios.' : filter === 'activity' ? 'Los próximos cambios aparecerán aquí.' : 'Aquí aparecerán los comentarios y los próximos cambios de esta tarjeta.'}</p>
        : <ol className="card-timeline">{entries.map(entry => (
          <li key={entry.id} className={entry.kind === 'comment' ? 'timeline-comment' : 'timeline-activity'}>
            <span className="timeline-icon" aria-hidden="true">{entry.kind === 'comment' ? <MessageSquare size={14} /> : <History size={14} />}</span>
            <div className="timeline-content">
              <div className="timeline-meta"><strong>{entry.kind === 'comment' ? entry.author : entry.actor}</strong>
                <time dateTime={entry.createdAt} title={dateFormat.format(new Date(entry.createdAt))}>{dateFormat.format(new Date(entry.createdAt))}</time>
              </div>
              {entry.source === 'local_import' && <span className="imported-history-badge">Historial importado</span>}
              <p>{entry.kind === 'comment' ? entry.body : entry.message}</p>
            </div>
          </li>
        ))}</ol>}
      </div>
    </section>
  )
}
