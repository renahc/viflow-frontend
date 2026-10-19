import { useState } from 'react'
import type { Status } from '../lib/board'
type Props = { status: Status; onAdd: (title: string, description: string, status: Status) => void; onClose: () => void }
export function CardComposer({ status, onAdd, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  return <form className="composer" onSubmit={event => {
    event.preventDefault()
    if (!title.trim()) return
    onAdd(title, description, status)
    onClose()
  }} onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
    <label htmlFor={`title-${status}`}>Título de la tarjeta</label>
    <input id={`title-${status}`} autoFocus required maxLength={160} value={title} onChange={event => setTitle(event.target.value)} placeholder="¿Qué necesitas hacer?" />
    <label htmlFor={`description-${status}`}>Descripción (opcional)</label>
    <textarea id={`description-${status}`} maxLength={1000} rows={3} value={description} onChange={event => setDescription(event.target.value)} placeholder="Agrega un poco de contexto…" />
    <div className="flex gap-2"><button className="primary-button" disabled={!title.trim()}>Crear tarjeta</button><button className="quiet-button" type="button" onClick={onClose}>Cancelar</button></div>
  </form>
}
