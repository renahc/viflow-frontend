import { useEffect, useRef, useState } from 'react'
import { AlignLeft, Kanban, X } from 'lucide-react'
import type { Card, Column } from '../../lib/board'
import type { Label, LabelColor } from '../../lib/labels'
import { CardLabels } from '../CardLabels'
import { CardDiscussion } from './CardDiscussion'
import { LabelPicker } from '../LabelPicker'

type Props = {
  card: Card
  column?: Column
  labels: Label[]
  onClose: () => void
  actor: string
  storageError: boolean
  onComment: (body: string) => string | undefined
  onToggleLabel: (labelId: string) => void
  onDeleteLabel: (labelId: string) => void
  onCreateLabel: (name: string, color: LabelColor) => string | undefined
  onSave: (title: string, description: string) => string | undefined
}

export function CardDetails({ card, column, labels, onClose, onSave, onToggleLabel, onDeleteLabel, onCreateLabel, actor, onComment, storageError }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)
  const [labelAnchor, setLabelAnchor] = useState<HTMLButtonElement | null>(null)
  const [error, setError] = useState('')
  const assignedLabels = labels.filter(label => card.labelIds?.includes(label.id))
  const changed = title.trim() !== card.title || description.trim() !== card.description

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    titleRef.current?.focus()
    return () => dialog?.close()
  }, [])

  return (
    <dialog ref={dialogRef} className="confirm-modal card-details" aria-labelledby="card-details-title"
      onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
      }}>
      <header className="card-details-header">
        <div><h2 id="card-details-title">Detalle de tarjeta</h2>
          {column && <span className="card-details-column"><Kanban size={14} aria-hidden="true" />{column.title}</span>}
        </div>
        <button className="label-popup-icon" type="button" aria-label="Cerrar detalle de tarjeta" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </header>
      {storageError && <p className="storage-warning" role="alert">No pudimos guardar en este navegador. Los cambios se mantendrán solo mientras la página siga abierta.</p>}
      <div className="card-details-layout">
        <form onSubmit={event => {
          event.preventDefault()
          if (!title.trim()) return
          const message = onSave(title, description)
          if (message) { setError(message); return }
          onClose()
        }}>
          <label className="card-details-label" htmlFor="card-details-name">Título</label>
          <input ref={titleRef} id="card-details-name" className="profile-name-input" autoFocus required maxLength={160} value={title}
            onChange={event => { setTitle(event.target.value); setError('') }} aria-describedby={error ? 'card-details-error' : undefined} />
          <section className="card-details-labels" aria-label="Etiquetas de la tarjeta">
            <h3>Etiquetas</h3>
            <CardLabels labels={assignedLabels} cardTitle={card.title} onOpen={setLabelAnchor} />
            <small className="card-details-label-hint">Las etiquetas se guardan al seleccionarlas.</small>
          </section>
          <label className="card-details-label" htmlFor="card-details-description"><AlignLeft size={15} aria-hidden="true" />Descripción</label>
          <textarea id="card-details-description" rows={7} maxLength={1000} value={description} placeholder="Agrega detalles, contexto o instrucciones…"
            onChange={event => { setDescription(event.target.value); setError('') }} />
          <div className="card-details-counter">{description.length}/1000</div>
          {error && <p role="alert" id="card-details-error" className="label-error">{error}</p>}
          <div className="confirm-modal-actions">
            <button className="modal-cancel" type="button" onClick={onClose}>Cancelar</button>
            <button className="primary-button" disabled={!title.trim() || !changed}>Guardar cambios</button>
          </div>
        </form>
        <CardDiscussion card={card} actor={actor} onComment={onComment} />
      </div>
      {labelAnchor && <LabelPicker card={card} labels={labels} anchor={labelAnchor}
        onClose={() => setLabelAnchor(null)} onToggle={onToggleLabel}
        onDelete={onDeleteLabel} onCreate={onCreateLabel} />}
    </dialog>
  )
}
