import { useState } from 'react'
import { ArrowLeftRight, Kanban, Plus } from 'lucide-react'
import type { useBoard } from '../../hooks/useBoard'
import { useActivityActor } from '../../hooks/useActivityActor'
import { useCardDrag } from '../../hooks/useCardDrag'
import type { Status } from '../../lib/board'
import { ColumnComposer } from '../ColumnComposer'
import { ConfirmDeleteModal } from '../ConfirmDeleteModal'
import { LabelPicker } from '../LabelPicker'
import { CardDetails } from './CardDetails'
import { KanbanColumn } from './KanbanColumn'

type Props = { workspace: ReturnType<typeof useBoard> }
type PendingDelete = { kind: 'card' | 'column'; id: string; title: string }
type LabelSelection = { cardId: string; anchor: HTMLButtonElement }

export function KanbanBoard({ workspace }: Props) {
  const readActivityActor = useActivityActor()
  const { title, columns, cards, labels, storageError, commentOnCard, addCard, editCard, moveCard, addColumn, setColumnSort,
    archiveCard, deleteColumn, addLabel, toggleLabel, deleteLabel } = workspace
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const editingCard = cards.find(card => card.id === editingCardId)
  const [composerId, setComposerId] = useState<string | null>(null)
  const [addingColumn, setAddingColumn] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [labelSelection, setLabelSelection] = useState<LabelSelection | null>(null)
  const labelCard = cards.find(card => card.id === labelSelection?.cardId)
  const completed = cards.filter(card => card.status === 'done').length

  function move(id: string, status: Status, beforeId?: string | null) {
    moveCard(id, status, beforeId)
    setAnnouncement(`Tarjeta movida a ${columns.find(column => column.id === status)?.title}.`)
  }

  const drag = useCardDrag(move)

  function confirmDelete() {
    if (!pendingDelete) return
    if (pendingDelete.kind === 'column') {
      deleteColumn(pendingDelete.id)
      if (composerId === pendingDelete.id) setComposerId(null)
    } else archiveCard(pendingDelete.id)
    drag.reset()
    setAnnouncement(`${pendingDelete.kind === 'column' ? 'Columna' : 'Tarjeta'} ${pendingDelete.title} ${pendingDelete.kind === 'column' ? 'eliminada' : 'archivada'}.`)
    setPendingDelete(null)
  }

  return (
    <>
      <div className="board-content">
        <div className="board-toolbar">
          <span className="board-tab"><Kanban size={17} aria-hidden="true" />{title}</span>
          <span className="task-summary">{cards.length} tarjetas · {completed} completadas</span>
        </div>
        {storageError && <p role="alert" className="storage-warning">No pudimos guardar en este navegador. Los cambios solo se mantendrán mientras esta página siga abierta.</p>}
        <div className="kanban-grid" role="region" aria-label="Columnas del tablero" tabIndex={0}>
          {columns.map(column => (
            <KanbanColumn key={column.id} column={column} cards={cards.filter(card => card.status === column.id)}
              columns={columns} labels={labels} drag={drag} onSort={sort => { drag.reset(); setColumnSort(column.id, sort) }} onAddCard={addCard} onMoveCard={move}
              composing={composerId === column.id} onOpenComposer={() => setComposerId(column.id)}
              onCloseComposer={() => setComposerId(null)}
              onOpenCard={card => { setLabelSelection(null); setEditingCardId(card.id) }}
              onOpenLabels={(card, anchor) => setLabelSelection({ cardId: card.id, anchor })}
              onDeleteCard={card => setPendingDelete({ kind: 'card', id: card.id, title: card.title })}
              onDeleteColumn={column => setPendingDelete({ kind: 'column', id: column.id, title: column.title })} />
          ))}
          <div className="column-creator">
            {addingColumn ? <ColumnComposer onClose={() => setAddingColumn(false)} onCreate={(title, color) => {
              const id = addColumn(title, color)
              if (id) setAnnouncement(`Columna ${title.trim()} creada.`)
              return id
            }} /> : <button className="add-column" onClick={() => setAddingColumn(true)}><Plus size={16} aria-hidden="true" />Agregar columna</button>}
          </div>
        </div>
        <footer className="board-footer">
          <ArrowLeftRight size={15} aria-hidden="true" />Arrastra las tarjetas para cambiar su estado.
          <span className="footer-private">Solo tú, tus ideas y un poco de flow.</span>
        </footer>
        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      </div>
      {editingCard && <CardDetails key={editingCard.id} actor={readActivityActor()} storageError={storageError}
        onComment={body => commentOnCard(editingCard.id, body)} card={editingCard} column={columns.find(column => column.id === editingCard.status)} labels={labels}
        onToggleLabel={labelId => toggleLabel(editingCard.id, labelId)} onDeleteLabel={deleteLabel}
        onCreateLabel={(name, color) => addLabel(editingCard.id, name, color)}
        onClose={() => setEditingCardId(null)} onSave={(title, description, schedule) => {
          const error = editCard(editingCard.id, title, description, schedule)
          if (!error) setAnnouncement(`Tarjeta ${title.trim()} actualizada.`)
          return error
        }} />}
      {labelCard && labelSelection && <LabelPicker key={labelCard.id} card={labelCard} labels={labels} anchor={labelSelection.anchor}
        onClose={() => setLabelSelection(null)} onDelete={deleteLabel}
        onToggle={labelId => toggleLabel(labelCard.id, labelId)}
        onCreate={(name, color) => addLabel(labelCard.id, name, color)} />}
      {pendingDelete && <ConfirmDeleteModal confirmLabel={pendingDelete.kind === 'card' ? 'Archivar' : 'Eliminar'} title={pendingDelete.kind === 'column' ? 'Eliminar columna' : 'Archivar tarjeta'}
        description={pendingDelete.kind === 'column'
          ? `Se eliminará la columna «${pendingDelete.title}». Sus ${cards.filter(card => card.status === pendingDelete.id).length} tarjetas se guardarán en Archivados y podrán recuperarse en otra columna.`
          : `Se archivará la tarjeta «${pendingDelete.title}». Podrás recuperarla desde Archivados.`}
        onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />}
    </>
  )
}
