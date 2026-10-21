import { Plus } from 'lucide-react'
import type { Card, Column, Status } from '../../lib/board'
import type { Label } from '../../lib/labels'
import { labelColors } from '../../lib/labels'
import type { CardDrag } from '../../hooks/useCardDrag'
import { CardComposer } from '../CardComposer'
import { DeleteButton } from '../DeleteButton'
import { TaskCard } from './TaskCard'

type Props = {
  column: Column
  cards: Card[]
  columns: Column[]
  labels: Label[]
  drag: CardDrag
  composing: boolean
  onOpenComposer: () => void
  onCloseComposer: () => void
  onAddCard: (title: string, description: string, status: Status) => void
  onMoveCard: (id: string, status: Status, beforeId?: string | null) => void
  onOpenLabels: (card: Card, anchor: HTMLButtonElement) => void
  onDeleteCard: (card: Card) => void
  onOpenCard: (card: Card) => void
  onDeleteColumn: (column: Column) => void
}

export function KanbanColumn({ column, cards, columns, labels, drag, onAddCard,
  onMoveCard, onOpenLabels, onDeleteCard, onDeleteColumn, onOpenCard, composing, onOpenComposer, onCloseComposer }: Props) {
  const isOver = drag.dropTarget?.columnId === column.id
  const atEnd = drag.draggingId && isOver && drag.dropTarget?.beforeId === null
  const dotColor = labelColors.find(color => color.id === column.color)?.text

  return (
    <section className={`kanban-column ${isOver ? 'drop-active' : ''}`}
      aria-labelledby={`heading-${column.id}`}
      onDragOver={event => drag.over(event, column.id)}
      onDragLeave={drag.leave}
      onDrop={event => drag.drop(event, column.id)}>
      <div className="column-header">
        <div className="column-heading">
          <h2 id={`heading-${column.id}`}>
            <span className={`status-dot ${column.id}`} style={dotColor ? { background: dotColor } : undefined} />
            {column.title}<span className="column-count">{cards.length}</span>
          </h2>
          <div className="column-actions">
            <button className="icon-button" aria-label={`Agregar tarjeta a ${column.title}`} onClick={onOpenComposer}>
              <Plus size={18} aria-hidden="true" />
            </button>
            <DeleteButton label={`Eliminar columna ${column.title}`} onClick={() => onDeleteColumn(column)} />
          </div>
        </div>
        {column.description && <p className="column-description">{column.description}</p>}
      </div>
      <div className={`card-list ${atEnd ? 'drop-at-end' : ''}`}>
        {cards.map((card, index) => (
          <TaskCard key={card.id} card={card} columns={columns} labels={labels} drag={drag}
            canMoveUp={index > 0} canMoveDown={index < cards.length - 1}
            onMoveUp={() => onMoveCard(card.id, column.id, cards[index - 1]?.id)}
            onMoveDown={() => onMoveCard(card.id, column.id, cards[index + 2]?.id ?? null)}
            onChangeStatus={status => onMoveCard(card.id, status)}
            onOpenLabels={anchor => onOpenLabels(card, anchor)}
            onDelete={() => onDeleteCard(card)} onOpenDetails={() => onOpenCard(card)} />
        ))}
        {cards.length === 0 && <p className="empty-column">Tu próximo avance empieza aquí.<br />Arrastra una tarjeta a esta columna.</p>}
      </div>
      {composing ? <CardComposer status={column.id} onAdd={onAddCard} onClose={onCloseComposer} />
        : <button className="add-card" onClick={onOpenComposer}><Plus size={16} aria-hidden="true" />Agregar tarjeta</button>}
    </section>
  )
}
