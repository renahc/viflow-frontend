import { dueState, formatDueDate, priorities } from '../../lib/cardSchedule'
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Circle, CalendarDays, Flag, GripVertical, MessageSquare } from 'lucide-react'
import type { Card, Column, Status } from '../../lib/board'
import type { Label } from '../../lib/labels'
import type { CardDrag } from '../../hooks/useCardDrag'
import { CardLabels } from '../CardLabels'
import { DeleteButton } from '../DeleteButton'

type Props = {
  card: Card
  columns: Column[]
  labels: Label[]
  drag: CardDrag
  canMoveUp: boolean
  canMoveDown: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onChangeStatus: (status: Status) => void
  onOpenLabels: (anchor: HTMLButtonElement) => void
  onDelete: () => void
  onOpenDetails: () => void
}

export function TaskCard({ card, columns, labels, drag, canMoveUp, canMoveDown,
  onMoveUp, onMoveDown, onChangeStatus, onOpenLabels, onDelete, onOpenDetails }: Props) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const deadline = card.dueDate ? dueState(card.dueDate, card.status === 'done', now) : undefined
  const deadlineLabels = { completed: 'Completada', overdue: 'Vencida', today: 'Vence hoy', soon: 'Vence mañana', upcoming: 'Vence' }
  const titleRef = useRef<HTMLButtonElement>(null)
  const dragged = useRef(false)
  function openDetails() {
    titleRef.current?.focus()
    onOpenDetails()
  }
  const isDragging = drag.draggingId === card.id
  const isDropTarget = columns.find(column => column.id === card.status)?.sort !== 'priority' && drag.draggingId && drag.dropTarget?.columnId === card.status
    && drag.dropTarget.beforeId === card.id

  return (
    <article
      draggable
      data-card-id={card.id}
      className={`task-card ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'drop-before' : ''}`}
      onPointerDown={() => { dragged.current = false }}
      onClick={event => {
        const target = event.target as HTMLElement
        if (dragged.current || target.closest('button, a, input, textarea, select, label')) return
        openDetails()
      }}
      onDragStart={event => { dragged.current = true; drag.start(event, card.id) }}
      onDragEnd={drag.reset}
    >
      <div className="card-topline">
        <CardLabels labels={labels.filter(label => card.labelIds?.includes(label.id))}
          cardTitle={card.title} onOpen={onOpenLabels} />
        <div className="card-actions">
          <GripVertical className="drag-handle" size={16} aria-hidden="true" />
          <DeleteButton label={`Eliminar tarjeta ${card.title}`} onClick={onDelete} />
        </div>
      </div>
      <h3><button ref={titleRef} type="button" className="task-title-button" aria-label={`Abrir tarjeta ${card.title}`} onClick={event => { if (!dragged.current || event.detail === 0) openDetails() }}>{card.title}</button></h3>
      {card.description && <p className="card-description">{card.description}</p>}
      {(card.dueDate || (card.priority && card.priority !== 'none')) && <div className="card-metadata">
        {card.dueDate && deadline && <span className={`due-badge due-${deadline}`}><CalendarDays size={12} aria-hidden="true" />{deadlineLabels[deadline]} · {formatDueDate(card.dueDate)}</span>}
        {card.priority && card.priority !== 'none' && <span className={`priority-badge priority-${card.priority}`}><Flag size={12} aria-hidden="true" />Prioridad {priorities[card.priority].toLowerCase()}</span>}
      </div>}
      <div className="card-footer">
        <div className="card-order-actions">
          <span className={`card-marker ${card.status}`} aria-hidden="true">
            {card.status === 'done' ? <Check size={16} /> : <Circle size={15} />}
          </span>
          <button className="card-order-button" type="button" aria-label={`Subir tarjeta ${card.title}`}
            title="Subir tarjeta" disabled={!canMoveUp} onClick={onMoveUp}>
            <ChevronUp size={14} aria-hidden="true" />
          </button>
          <button className="card-order-button" type="button" aria-label={`Bajar tarjeta ${card.title}`}
            title="Bajar tarjeta" disabled={!canMoveDown} onClick={onMoveDown}>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        </div>
        {(card.comments?.length ?? 0) > 0 && <button className="card-comment-count" type="button" aria-label={`Ver ${card.comments!.length} ${card.comments!.length === 1 ? 'comentario' : 'comentarios'} de ${card.title}`} onClick={openDetails}><MessageSquare size={13} aria-hidden="true" />{card.comments!.length}</button>}
        <div className="card-status-select">
          <select aria-label={`Estado de ${card.title}`} value={card.status}
            onChange={event => onChangeStatus(event.target.value)}>
            {columns.map(column => <option key={column.id} value={column.id}>{column.title}</option>)}
          </select>
          <ChevronDown size={12} aria-hidden="true" />
        </div>
      </div>
    </article>
  )
}
