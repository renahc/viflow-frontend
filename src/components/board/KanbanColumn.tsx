import { sortColumnCards } from '../../lib/columnSort'
import type { ColumnSort } from '../../lib/columnSort'
import { Plus } from 'lucide-react'
import type { Card, Column, Status } from '../../lib/board'
import type { Label } from '../../lib/labels'
import { labelColors } from '../../lib/labels'
import type { CardDrag } from '../../hooks/useCardDrag'
import { CardComposer } from '../CardComposer'
import { ColumnOptions } from './ColumnOptions'
import { TaskCard } from './TaskCard'

type Props = {
  visibleIds: Set<string>
  filtered: boolean
  onSort: (sort: ColumnSort) => void
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

export function KanbanColumn({ visibleIds, filtered, column, cards: manualCards, onSort, columns, labels, drag, onAddCard,
  onMoveCard, onOpenLabels, onDeleteCard, onDeleteColumn, onOpenCard, composing, onOpenComposer, onCloseComposer }: Props) {
  const sorted = column.sort === 'priority'
  const cards = sortColumnCards(manualCards, column.sort ?? 'manual')
  const sameColumnDrag = manualCards.some(card => card.id === drag.draggingId)
  const acceptsDrop = !sorted || !sameColumnDrag
  const isOver = acceptsDrop && drag.dropTarget?.columnId === column.id
  const atEnd = drag.draggingId && isOver && drag.dropTarget?.beforeId === null
  const dotColor = labelColors.find(color => color.id === column.color)?.text

  return (
    <section className={`kanban-column ${isOver ? 'drop-active' : ''}`}
      aria-labelledby={`heading-${column.id}`}
      data-sort={column.sort ?? 'manual'}
      onDragOver={event => { if (acceptsDrop) drag.over(event, column.id); else drag.leave(event) }}
      onDragLeave={drag.leave}
      onDrop={event => { if (acceptsDrop) drag.drop(event, column.id); else { event.preventDefault(); drag.reset() } }}>
      <div className="column-header">
        <div className="column-heading">
          <h2 id={`heading-${column.id}`}>
            <span className={`status-dot ${column.id}`} style={dotColor ? { background: dotColor } : undefined} />
            {column.title}<span className="column-count">{filtered ? `${cards.filter(card => visibleIds.has(card.id)).length} / ${cards.length}` : cards.length}</span>
          </h2>
          <div className="column-actions">
            <button className="icon-button" aria-label={`Agregar tarjeta a ${column.title}`} onClick={onOpenComposer}>
              <Plus size={18} aria-hidden="true" />
            </button>
            <ColumnOptions column={column} onSort={onSort} onDelete={() => onDeleteColumn(column)} />
          </div>
        </div>
        {column.description && <p className="column-description">{column.description}</p>}
        {sorted && <p className="column-sort-hint">Orden automático por prioridad</p>}
      </div>
      <div className={`card-list ${atEnd ? 'drop-at-end' : ''}`}>
        {cards.map((card, index) => visibleIds.has(card.id) && (
          <TaskCard key={card.id} card={card} columns={columns} labels={labels} drag={drag}
            canMoveUp={!sorted && index > 0} canMoveDown={!sorted && index < cards.length - 1}
            onMoveUp={() => onMoveCard(card.id, column.id, cards[index - 1]?.id)}
            onMoveDown={() => onMoveCard(card.id, column.id, cards[index + 2]?.id ?? null)}
            onChangeStatus={status => onMoveCard(card.id, status)}
            onOpenLabels={anchor => onOpenLabels(card, anchor)}
            onDelete={() => onDeleteCard(card)} onOpenDetails={() => onOpenCard(card)} />
        ))}
        {!cards.some(card => visibleIds.has(card.id)) && <p className="empty-column">{filtered ? 'Sin coincidencias en esta columna.' : <>Tu próximo avance empieza aquí.<br />Arrastra una tarjeta a esta columna.</>}</p>}
      </div>
      {composing ? <CardComposer status={column.id} onAdd={onAddCard} onClose={onCloseComposer} />
        : <button className="add-card" onClick={onOpenComposer}><Plus size={16} aria-hidden="true" />Agregar tarjeta</button>}
    </section>
  )
}
