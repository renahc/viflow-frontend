import { ArrowLeft, Plus, Search, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Card } from '../lib/board'
import { labelColors } from '../lib/labels'
import type { Label, LabelColor } from '../lib/labels'
import { DeleteButton } from './DeleteButton'
import { LabelBadge } from './CardLabels'

type Props = {
  card: Card
  labels: Label[]
  anchor: HTMLElement
  onClose: () => void
  onToggle: (labelId: string) => void
  onDelete: (labelId: string) => void
  onCreate: (name: string, color: LabelColor) => string | undefined
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()

export function LabelPicker({ card, labels, anchor, onClose, onToggle, onDelete, onCreate }: Props) {
  const popupRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useState<'list' | 'create'>('list')
  const [query, setQuery] = useState('')
  const [name, setName] = useState('')
  const [color, setColor] = useState<LabelColor>('purple')
  const [error, setError] = useState('')
  const filtered = labels.filter(label => normalize(label.name).includes(normalize(query.trim())))

  useLayoutEffect(() => {
    const popup = popupRef.current
    if (!popup || !anchor.isConnected) return
    const rect = anchor.getBoundingClientRect()
    const width = Math.min(300, window.innerWidth - 16)
    popup.style.width = `${width}px`
    popup.style.maxHeight = `${window.innerHeight - 16}px`
    const height = popup.getBoundingClientRect().height
    const below = window.innerHeight - rect.bottom - 8
    const above = rect.top - 8
    const top = below >= height ? rect.bottom + 6
      : above >= height ? rect.top - height - 6
      : Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - height - 8))
    popup.style.top = `${Math.max(8, top)}px`
    popup.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`
  }, [anchor, view, filtered.length, error, name])

  useEffect(() => {
    if (view === 'list') searchRef.current?.focus()
    else nameRef.current?.focus()
  }, [view])

  useEffect(() => {
    function outside(event: PointerEvent) {
      const target = event.target as Node
      if (!popupRef.current?.contains(target) && !anchor.contains(target)) onClose()
    }
    function scroll(event: Event) {
      if (!popupRef.current?.contains(event.target as Node)) onClose()
    }
    function resize() { onClose() }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('scroll', scroll, true)
    window.addEventListener('resize', resize)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('scroll', scroll, true)
      window.removeEventListener('resize', resize)
    }
  }, [anchor, onClose])

  function closeAndFocus() { onClose(); if (anchor.isConnected) anchor.focus() }

  return createPortal(<div ref={popupRef} className="label-dropdown" role="dialog" aria-label={`Etiquetas de ${card.title}`}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); closeAndFocus() }
    }} onBlur={event => {
      if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node) && event.relatedTarget !== anchor) onClose()
    }}>
    {view === 'list' ? <>
      <div className="label-search-row"><div className="label-search">
        <Search size={15} aria-hidden="true" />
        <input ref={searchRef} aria-label="Buscar etiquetas" placeholder="Buscar etiquetas…" value={query} onChange={event => setQuery(event.target.value)} />
      </div><button type="button" className="label-popup-icon" aria-label="Cerrar etiquetas" onClick={closeAndFocus}><X size={15} aria-hidden="true" /></button></div>
      <div className="label-dropdown-list" aria-label="Etiquetas disponibles">
        {filtered.length === 0 ? <p className="label-empty">{labels.length === 0 ? 'Aún no hay etiquetas en este tablero.' : 'No encontramos etiquetas con ese nombre.'}</p>
          : filtered.map(label => <div className="label-option-row" key={label.id}>
            <label className="label-option">
              <input type="checkbox" checked={card.labelIds?.includes(label.id) ?? false} onChange={() => onToggle(label.id)} />
              <LabelBadge label={label} />
            </label>
            <DeleteButton label={`Eliminar etiqueta ${label.name} del tablero`} onClick={() => { onDelete(label.id); searchRef.current?.focus() }} />
          </div>)}
      </div>
      <button type="button" className="label-create-link" onClick={() => { setName(query.trim().slice(0, 32)); setError(''); setView('create') }}><Plus size={15} aria-hidden="true" />Crear etiqueta</button>
    </> : <>
      <div className="label-dropdown-heading"><button className="label-popup-icon" type="button" aria-label="Volver a etiquetas" onClick={() => setView('list')}><ArrowLeft size={16} aria-hidden="true" /></button><h2>Crear etiqueta</h2><button className="label-popup-icon" type="button" aria-label="Cerrar etiquetas" onClick={closeAndFocus}><X size={15} aria-hidden="true" /></button></div>
      <form className="label-dropdown-form" onSubmit={event => {
        event.preventDefault()
        const message = onCreate(name, color)
        if (message) { setError(message); return }
        setQuery(''); setName(''); setError(''); setView('list')
      }}>
        <div className="label-badge-preview"><span>Vista previa</span><LabelBadge label={{ id: 'preview', name: name.trim() || 'Tu etiqueta', color }} /></div>
        <label htmlFor="label-name">Título</label>
        <input ref={nameRef} id="label-name" className="profile-name-input" required maxLength={32} placeholder="Ej. Diseño" value={name} onChange={event => { setName(event.target.value); setError('') }} />
        <fieldset className="label-palette"><legend>Color</legend><div className="label-swatches">{labelColors.map(option => <label key={option.id} className="label-swatch" style={{ background: option.background, color: option.text }} title={option.name}>
          <input type="radio" name="label-color" value={option.id} checked={color === option.id} onChange={() => setColor(option.id)} aria-label={option.name} />
          <span aria-hidden="true" className="swatch-center" style={{ background: option.text }} />
        </label>)}</div></fieldset>
        {error && <p role="alert" className="label-error">{error}</p>}
        <button className="primary-button label-save" disabled={!name.trim()}>Crear y agregar</button>
      </form>
    </>}
  </div>, document.body)
}
