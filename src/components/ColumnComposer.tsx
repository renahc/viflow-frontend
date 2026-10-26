import * as m from 'motion/react-m'
import { viewVariants } from './motion/presets'
import { useState } from 'react'
import type { LabelColor } from '../lib/labels'
import { ColorPicker } from './ColorPicker'

type Props = { onCreate: (title: string, color: LabelColor) => string | undefined; onClose: () => void }

export function ColumnComposer({ onCreate, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [color, setColor] = useState<LabelColor>('purple')
  return <m.form variants={viewVariants} initial="hidden" animate="visible" className="composer column-composer" onSubmit={event => {
    event.preventDefault()
    if (onCreate(title, color)) onClose()
  }} onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
    <label htmlFor="column-title">Nombre de la columna</label>
    <input id="column-title" autoFocus required maxLength={80} value={title} onChange={event => setTitle(event.target.value)} placeholder="Ej. En revisión" />
    <ColorPicker name="column-color" legend="Color del punto" value={color} onChange={setColor} />
    <div className="flex gap-2 column-composer-actions">
      <button className="primary-button" disabled={!title.trim()}>Crear columna</button>
      <button className="quiet-button" type="button" onClick={onClose}>Cancelar</button>
    </div>
  </m.form>
}
