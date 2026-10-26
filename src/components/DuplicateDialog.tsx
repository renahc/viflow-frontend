import * as m from 'motion/react-m'
import { dialogVariants } from './motion/presets'
import { useEffect, useRef, useState } from 'react'
import { CalendarDays, Copy, Tag } from 'lucide-react'
import type { DuplicateOptions } from '../lib/duplicate'
type Props = { kind: 'card' | 'board'; title: string; onClose: () => void; onDuplicate: (options: DuplicateOptions) => string | undefined }
export function DuplicateDialog({ kind, title: original, onClose, onDuplicate }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState(() => `${original.slice(0, 150)} (copia)`)
  const [keepDates, setKeepDates] = useState(false)
  const [keepLabels, setKeepLabels] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => { const dialog=ref.current; dialog?.showModal(); return () => dialog?.close() }, [])
  return <m.dialog variants={dialogVariants} initial="hidden" animate="visible" ref={ref} className="confirm-modal duplicate-dialog" aria-labelledby="duplicate-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <span className="duplicate-symbol"><Copy size={21} /></span><h2 id="duplicate-title">Duplicar {kind === 'board' ? 'tablero' : 'tarjeta'}</h2>
    <p>Un nuevo comienzo con la misma estructura.</p>
    <form onSubmit={event => { event.preventDefault(); if (!title.trim()) return; const message=onDuplicate({title,keepDates,keepLabels}); if (message) setError(message); else onClose() }}>
      <label className="profile-name-label" htmlFor="duplicate-name">Nombre de la copia</label><input autoFocus id="duplicate-name" className="profile-name-input" required maxLength={160} value={title} onChange={event => { setTitle(event.target.value); setError('') }} />
      <div className="duplicate-options"><label><CalendarDays size={16} /><span><strong>Conservar fechas</strong><small>Mantener los vencimientos originales.</small></span><input type="checkbox" checked={keepDates} onChange={event => setKeepDates(event.target.checked)} /></label><label><Tag size={16} /><span><strong>Conservar etiquetas</strong><small>Copiar los nombres y colores asignados.</small></span><input type="checkbox" checked={keepLabels} onChange={event => setKeepLabels(event.target.checked)} /></label></div>
      <small className="duplicate-hint">Se conservan descripciones, prioridades y pasos de checklist sin completar. Los comentarios y el historial no se copian.{kind === 'board' ? ' Las tarjetas archivadas quedan fuera de la copia.' : ' La copia aparece en la misma columna.'}</small>
      {error && <p role="alert" className="label-error">{error}</p>}
      <div className="confirm-modal-actions"><button type="button" className="modal-cancel" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={!title.trim()}><Copy size={14} />Crear copia</button></div>
    </form>
  </m.dialog>
}
