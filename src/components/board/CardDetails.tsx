import { useEffect, useRef, useState } from 'react'
import { AlignLeft, Kanban, X } from 'lucide-react'
import type { Card, Column } from '../../lib/board'
import type { Label } from '../../lib/labels'
import { LabelBadge } from '../CardLabels'

type Props = {
  card: Card
  column?: Column
  labels: Label[]
  onClose: () => void
  onSave: (title: string, description: string) => string | undefined
}

export function CardDetails({ card, column, labels, onClose, onSave }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)
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
        {assignedLabels.length > 0 && <section className="card-details-labels" aria-label="Etiquetas de la tarjeta">
          <h3>Etiquetas</h3><div>{assignedLabels.map(label => <LabelBadge key={label.id} label={label} />)}</div>
        </section>}
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
    </dialog>
  )
}
