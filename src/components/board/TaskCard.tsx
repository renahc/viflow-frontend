import { Check, ChevronDown, ChevronUp, Circle, GripVertical } from 'lucide-react'
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
}

export function TaskCard({ card, columns, labels, drag, canMoveUp, canMoveDown,
  onMoveUp, onMoveDown, onChangeStatus, onOpenLabels, onDelete }: Props) {
  const isDragging = drag.draggingId === card.id
  const isDropTarget = drag.draggingId && drag.dropTarget?.columnId === card.status
    && drag.dropTarget.beforeId === card.id

  return (
    <article
      draggable
      data-card-id={card.id}
      className={`task-card ${isDragging ? 'is-dragging' : ''} ${isDropTarget ? 'drop-before' : ''}`}
      onDragStart={event => drag.start(event, card.id)}
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
      <h3>{card.title}</h3>
      {card.description && <p className="card-description">{card.description}</p>}
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
