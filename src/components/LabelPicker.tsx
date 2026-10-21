import { useEffect, useRef, useState } from 'react'
import type { Card } from '../lib/board'
import { labelColors } from '../lib/labels'
import type { Label, LabelColor } from '../lib/labels'
import { LabelBadge } from './CardLabels'

type Props = {
  card: Card
  labels: Label[]
  onClose: () => void
  onToggle: (labelId: string) => void
  onCreate: (name: string, color: LabelColor) => string | undefined
}

export function LabelPicker({ card, labels, onClose, onToggle, onCreate }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState<LabelColor>('purple')
  const [error, setError] = useState('')
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return <dialog className="confirm-modal label-picker" ref={dialogRef} aria-labelledby="label-picker-title"
    onCancel={event => { event.preventDefault(); onClose() }}
    onClick={event => {
      if (event.target !== event.currentTarget) return
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
    }}>
    <h2 id="label-picker-title">Etiquetas</h2>
    <p className="label-picker-card">{card.title}</p>
    <fieldset className="label-existing"><legend>Etiquetas del tablero</legend>
      {labels.length === 0 ? <p>Aún no hay etiquetas. Crea la primera abajo.</p> : <div className="label-options">{labels.map(label => (
        <label className="label-option" key={label.id}>
          <input type="checkbox" checked={card.labelIds?.includes(label.id) ?? false} onChange={() => onToggle(label.id)} />
          <LabelBadge label={label} />
        </label>
      ))}</div>}
    </fieldset>
    <form className="label-create" onSubmit={event => {
      event.preventDefault()
      const message = onCreate(name, color)
      if (message) { setError(message); return }
      setName('')
      setError('')
    }}>
      <h3>Crear etiqueta</h3>
      <label htmlFor="label-name">Nombre</label>
      <input id="label-name" className="profile-name-input" autoFocus required maxLength={32} placeholder="Ej. Diseño" value={name} onChange={event => { setName(event.target.value); setError('') }} />
      <fieldset className="label-palette"><legend>Color</legend><div className="label-swatches">{labelColors.map(option => (
        <label key={option.id} className="label-swatch" style={{ background: option.background, color: option.text }} title={option.name}>
          <input type="radio" name="label-color" value={option.id} checked={color === option.id} onChange={() => setColor(option.id)} aria-label={option.name} />
          <span aria-hidden="true" className="swatch-center" style={{ background: option.text }} />
        </label>
      ))}</div></fieldset>
      {name.trim() && <div className="label-preview"><span>Vista previa</span><LabelBadge label={{ id: 'preview', name: name.trim(), color }} /></div>}
      {error && <p role="alert" className="label-error">{error}</p>}
      <button className="primary-button" disabled={!name.trim()}>Crear y agregar</button>
    </form>
    <div className="confirm-modal-actions"><button className="modal-cancel" type="button" onClick={onClose}>Listo</button></div>
  </dialog>
}
